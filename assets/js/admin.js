/* Admin panel: writes posts, projects and images straight into the GitHub repo
   using the GitHub REST API and your personal access token. */
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG;
  var API = "https://api.github.com";
  var TOKEN_KEY = "gh_admin_token";
  var AUTOSAVE_KEY = "admin_autosave_new_post";
  var TOKEN = null;

  var posts = [], projects = [], site = {};
  var localImages = {};          // path -> blob URL (for instant previews)
  var dirty = false;
  var currentHash = location.hash;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = Site.esc;
  var view = $("#view");

  /* ================= GitHub API ================= */
  function gh(path, opts) {
    opts = opts || {};
    var headers = {
      Authorization: "Bearer " + TOKEN,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (opts.body) headers["Content-Type"] = "application/json";
    return fetch(API + path, { method: opts.method || "GET", headers: headers, body: opts.body, cache: "no-store" })
      .then(function (r) {
        if (r.status === 204) return null;
        return r.json().catch(function () { return null; }).then(function (data) {
          if (!r.ok) {
            var e = new Error((data && data.message) || r.statusText || "Request failed");
            e.status = r.status;
            throw e;
          }
          return data;
        });
      });
  }
  function contentsPath(p) {
    return "/repos/" + CFG.owner + "/" + CFG.repo + "/contents/" + p.split("/").map(encodeURIComponent).join("/");
  }

  // All writes go through one queue: parallel commits on the same branch conflict.
  var queue = Promise.resolve();
  function serial(fn) {
    var p = queue.then(fn, fn);
    queue = p.catch(function () {});
    return p;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function b64encodeText(str) {
    var bytes = new TextEncoder().encode(str), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  function b64decodeText(b64) {
    var bin = atob((b64 || "").replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function getFile(path) {
    return gh(contentsPath(path) + "?ref=" + encodeURIComponent(CFG.branch) + "&t=" + Date.now())
      .then(function (d) {
        if (d.content === "" && d.download_url && d.size > 0) {
          // Files >1MB: content not inline, fetch raw
          return fetch(d.download_url, { cache: "no-store" }).then(function (r) { return r.text(); })
            .then(function (t) { return { sha: d.sha, text: t }; });
        }
        return { sha: d.sha, text: b64decodeText(d.content) };
      })
      .catch(function (e) { if (e.status === 404) return null; throw e; });
  }
  function putFile(path, b64, message, sha) {
    return serial(function () {
      var attempt = function (n) {
        var body = { message: message, content: b64, branch: CFG.branch };
        if (sha) body.sha = sha;
        return gh(contentsPath(path), { method: "PUT", body: JSON.stringify(body) }).catch(function (e) {
          if (e.status === 409 && !sha && n < 3) return sleep(800 * (n + 1)).then(function () { return attempt(n + 1); });
          throw e;
        });
      };
      return attempt(0);
    });
  }
  function writeText(path, text, message) {
    return getFile(path).then(function (cur) {
      return putFile(path, b64encodeText(text), message, cur && cur.sha);
    });
  }
  function deleteFile(path, message) {
    return serial(function () {
      return gh(contentsPath(path) + "?ref=" + encodeURIComponent(CFG.branch) + "&t=" + Date.now()).then(function (f) {
        return gh(contentsPath(path), { method: "DELETE", body: JSON.stringify({ message: message, sha: f.sha, branch: CFG.branch }) });
      });
    }).catch(function (e) { if (e.status !== 404) throw e; });
  }
  function readJSON(path, fallback) {
    return getFile(path).then(function (f) {
      if (!f) return fallback;
      try { return JSON.parse(f.text); } catch (e) { return fallback; }
    });
  }
  // Read-modify-write with a retry if someone/something changed the file meanwhile.
  function updateJSON(path, fallback, mutate, message) {
    var attempt = function (n) {
      return getFile(path).then(function (cur) {
        var data = fallback;
        if (cur) { try { data = JSON.parse(cur.text); } catch (e) { data = fallback; } }
        var next = mutate(data);
        return putFile(path, b64encodeText(JSON.stringify(next, null, 2) + "\n"), message, cur && cur.sha)
          .then(function () { return next; })
          .catch(function (e) {
            if ((e.status === 409 || e.status === 422) && n < 2) return sleep(700).then(function () { return attempt(n + 1); });
            throw e;
          });
      });
    };
    return attempt(0);
  }

  /* ================= Images ================= */
  function slugify(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(",")[1]); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }
  // Shrinks big photos so the repo and the site stay fast. GIF/SVG are left untouched.
  function maybeResize(file) {
    var MAX = 2000;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return Promise.resolve({ blob: file, ext: extOf(file) });
    return new Promise(function (resolve) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth, h = img.naturalHeight;
        if (w <= MAX && h <= MAX && file.size < 900 * 1024) return resolve({ blob: file, ext: extOf(file) });
        var scale = Math.min(1, MAX / Math.max(w, h));
        var c = document.createElement("canvas");
        c.width = Math.round(w * scale); c.height = Math.round(h * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        var type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
        c.toBlob(function (b) {
          if (!b || b.size >= file.size) resolve({ blob: file, ext: extOf(file) });
          else resolve({ blob: b, ext: type === "image/jpeg" ? "jpg" : "webp" });
        }, type, 0.86);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve({ blob: file, ext: extOf(file) }); };
      img.src = url;
    });
  }
  function extOf(file) {
    var m = /\.([a-z0-9]+)$/i.exec(file.name || "");
    if (m) return m[1].toLowerCase();
    return (file.type.split("/")[1] || "png").replace("jpeg", "jpg").replace("svg+xml", "svg");
  }
  function uploadImage(file) {
    if (file.size > 25 * 1024 * 1024) return Promise.reject(new Error(file.name + " is larger than 25 MB"));
    return maybeResize(file).then(function (r) {
      var base = slugify((file.name || "image").replace(/\.[^.]+$/, "")) || "image";
      var now = new Date();
      var path = "assets/uploads/" + now.getFullYear() + "/" + Date.now().toString(36) + "-" + base + "." + r.ext;
      return blobToBase64(r.blob).then(function (b64) {
        return putFile(path, b64, "Upload image " + path.split("/").pop());
      }).then(function () {
        localImages[path] = URL.createObjectURL(r.blob);
        return path;
      });
    });
  }
  function imgURL(path) {
    if (!path) return "";
    if (/^(https?:|data:|blob:)/.test(path)) return path;
    return localImages[path] || "https://raw.githubusercontent.com/" + CFG.owner + "/" + CFG.repo + "/" + CFG.branch + "/" + path;
  }
  function pickFiles(multiple) {
    return new Promise(function (resolve) {
      var inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*"; inp.multiple = !!multiple;
      inp.onchange = function () { resolve(Array.prototype.slice.call(inp.files || [])); };
      inp.click();
    });
  }

  /* ================= UI helpers ================= */
  function toast(msg, type) {
    var t = document.createElement("div");
    t.className = "toast " + (type || "ok");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(function () { t.classList.add("out"); }, type === "error" ? 6000 : 3500);
    setTimeout(function () { t.remove(); }, type === "error" ? 6500 : 4000);
  }
  function busy(on, text) {
    $("#busy").classList.toggle("hidden", !on);
    if (text) $("#busy-text").textContent = text;
  }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function errMsg(e) {
    if (e && e.status === 403) return "GitHub refused (403). Check that your token has Contents: Read and write on this repo.";
    if (e && e.status === 401) return "Token is invalid or expired.";
    return (e && e.message) || String(e);
  }
  function parseTags(s) {
    return String(s || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean)
      .filter(function (t, i, a) { return a.indexOf(t) === i; });
  }
  function setDirty(v) { dirty = v; }
  window.addEventListener("beforeunload", function (e) { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ================= Markdown editor ================= */
  var TOOLBAR = [
    ["h2", "H2", "Heading"], ["h3", "H3", "Subheading"], ["bold", "<b>B</b>", "Bold (Ctrl+B)"], ["italic", "<i>I</i>", "Italic (Ctrl+I)"],
    ["code", "&lt;/&gt;", "Inline code"], ["codeblock", "{ }", "Code block"], ["quote", "❝", "Quote"],
    ["ul", "• list", "Bullet list"], ["ol", "1. list", "Numbered list"], ["link", "link", "Link (Ctrl+K)"],
    ["image", "🖼 image", "Upload images (or drag & drop / paste)"], ["youtube", "▶ video", "Embed YouTube video"],
    ["table", "table", "Table"], ["hr", "—", "Divider"]
  ];
  function editorHTML(placeholder) {
    return '<div class="md-editor" data-mode="split">' +
      '<div class="md-toolbar">' +
        TOOLBAR.map(function (b) { return '<button type="button" data-act="' + b[0] + '" title="' + b[2] + '">' + b[1] + "</button>"; }).join("") +
        '<span class="spacer"></span>' +
        '<div class="seg"><button type="button" data-mode="write">Write</button><button type="button" data-mode="split">Split</button><button type="button" data-mode="preview">Preview</button></div>' +
      "</div>" +
      '<div class="md-panes">' +
        '<textarea class="md-input mono" spellcheck="true" placeholder="' + esc(placeholder || "") + '"></textarea>' +
        '<div class="md-preview prose"></div>' +
      "</div>" +
      '<div class="md-status mono small muted"><span class="md-count"></span><span>Markdown · drag &amp; drop or paste images · several images in a row = gallery · ![alt](src "caption")</span></div>' +
    "</div>";
  }

  function wireEditor(root, onChange) {
    var ta = $(".md-input", root);
    var preview = $(".md-preview", root);
    var count = $(".md-count", root);
    var timer = null;

    function render() {
      preview.innerHTML = Site.renderMarkdown(ta.value);
      $$("img", preview).forEach(function (img) { img.src = imgURL(img.getAttribute("src")); });
      Site.highlight(preview);
      var words = ta.value.split(/\s+/).filter(Boolean).length;
      count.textContent = words + " words · ";
    }
    function changed() {
      clearTimeout(timer);
      timer = setTimeout(render, 150);
      if (onChange) onChange();
    }
    function setSel(start, end) { ta.focus(); ta.setSelectionRange(start, end); }
    function replaceRange(start, end, text, selStart, selEnd) {
      ta.focus();
      ta.setSelectionRange(start, end);
      // execCommand keeps native undo (Ctrl+Z) working
      if (!document.execCommand || !document.execCommand("insertText", false, text)) {
        ta.setRangeText(text, start, end, "end");
      }
      if (selStart != null) setSel(selStart, selEnd);
      changed();
    }
    function wrap(before, after, placeholder) {
      var s = ta.selectionStart, e = ta.selectionEnd;
      var sel = ta.value.slice(s, e) || placeholder;
      replaceRange(s, e, before + sel + after, s + before.length, s + before.length + sel.length);
    }
    function prefixLines(prefixFn) {
      var v = ta.value, s = ta.selectionStart, e = ta.selectionEnd;
      var ls = v.lastIndexOf("\n", s - 1) + 1;
      var le = v.indexOf("\n", e); if (le < 0) le = v.length;
      var lines = v.slice(ls, le).split("\n");
      var out = lines.map(function (l, i) { return prefixFn(i) + l; }).join("\n");
      replaceRange(ls, le, out, ls, ls + out.length);
    }
    function insertBlock(text) {
      var s = ta.selectionStart, v = ta.value;
      var pre = s === 0 ? "" : (v.slice(s - 2, s) === "\n\n" ? "" : (v[s - 1] === "\n" ? "\n" : "\n\n"));
      replaceRange(s, ta.selectionEnd, pre + text + "\n\n");
    }
    function replaceText(find, rep) {
      var i = ta.value.indexOf(find);
      if (i < 0) return;
      var keep = ta.selectionStart;
      ta.setRangeText(rep, i, i + find.length, "preserve");
      ta.setSelectionRange(keep, keep);
      changed();
    }

    function handleFiles(files) {
      files = files.filter(function (f) { return /^image\//.test(f.type); });
      if (!files.length) return;
      var tokens = files.map(function (f, i) { return "![Uploading " + (f.name || "image") + " #" + Date.now() + i + "…]()"; });
      insertBlock(tokens.join("\n"));
      files.reduce(function (p, f, i) {
        return p.then(function () {
          return uploadImage(f).then(function (path) {
            var alt = (f.name || "image").replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
            replaceText(tokens[i], "![" + alt + "](" + path + ")");
          }).catch(function (e) {
            replaceText(tokens[i], "");
            toast("Upload failed: " + errMsg(e), "error");
          });
        });
      }, Promise.resolve());
    }

    var actions = {
      h2: function () { prefixLines(function () { return "## "; }); },
      h3: function () { prefixLines(function () { return "### "; }); },
      bold: function () { wrap("**", "**", "bold text"); },
      italic: function () { wrap("_", "_", "italic text"); },
      code: function () { wrap("`", "`", "code"); },
      codeblock: function () {
        var s = ta.selectionStart, e = ta.selectionEnd, sel = ta.value.slice(s, e) || "// your code here";
        var lang = prompt("Language (c, cpp, python, js, lua…)", "c");
        if (lang === null) return;
        insertBlock("```" + lang.trim() + "\n" + sel + "\n```");
      },
      quote: function () { prefixLines(function () { return "> "; }); },
      ul: function () { prefixLines(function () { return "- "; }); },
      ol: function () { prefixLines(function (i) { return (i + 1) + ". "; }); },
      link: function () {
        var url = prompt("Link URL", "https://");
        if (!url) return;
        wrap("[", "](" + url + ")", "link text");
      },
      image: function () { pickFiles(true).then(handleFiles); },
      youtube: function () {
        var url = prompt("YouTube link");
        if (!url) return;
        var m = /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url);
        if (!m) return toast("That doesn't look like a YouTube link", "error");
        insertBlock('<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/' + m[1] +
          '" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>');
      },
      table: function () { insertBlock("| Column | Column |\n| --- | --- |\n| value | value |"); },
      hr: function () { insertBlock("---"); }
    };

    $(".md-toolbar", root).addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.dataset.act) actions[b.dataset.act]();
      if (b.dataset.mode) {
        root.dataset.mode = b.dataset.mode;
        $$(".seg button", root).forEach(function (x) { x.classList.toggle("on", x === b); });
        render();
      }
    });
    $$(".seg button", root).forEach(function (x) { x.classList.toggle("on", x.dataset.mode === root.dataset.mode); });
    if (window.innerWidth < 900) { root.dataset.mode = "write"; $$(".seg button", root).forEach(function (x) { x.classList.toggle("on", x.dataset.mode === "write"); }); }

    ta.addEventListener("input", changed);
    ta.addEventListener("keydown", function (e) {
      var mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "b") { e.preventDefault(); actions.bold(); }
      else if (mod && e.key.toLowerCase() === "i") { e.preventDefault(); actions.italic(); }
      else if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); actions.link(); }
      else if (e.key === "Tab" && !mod) { e.preventDefault(); replaceRange(ta.selectionStart, ta.selectionEnd, "  "); }
    });
    ta.addEventListener("paste", function (e) {
      var files = Array.prototype.slice.call((e.clipboardData && e.clipboardData.files) || []);
      if (files.length) { e.preventDefault(); handleFiles(files); }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      ta.addEventListener(ev, function (e) { e.preventDefault(); root.classList.add("drop"); });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      ta.addEventListener(ev, function () { root.classList.remove("drop"); });
    });
    ta.addEventListener("drop", function (e) {
      e.preventDefault();
      var files = Array.prototype.slice.call((e.dataTransfer && e.dataTransfer.files) || []);
      if (files.length) {
        ta.focus();
        handleFiles(files);
      }
    });

    return {
      get value() { return ta.value; },
      set value(v) { ta.value = v || ""; render(); },
      render: render
    };
  }

  // Single image field (cover / project image)
  function wireImageField(box, initial, onChange) {
    var value = initial || "";
    function draw() {
      box.innerHTML = value
        ? '<img src="' + esc(imgURL(value)) + '" alt=""><div class="img-actions"><button type="button" class="btn small" data-a="change">Change</button><button type="button" class="btn small danger" data-a="remove">Remove</button></div>'
        : '<button type="button" class="img-drop" data-a="change"><span>＋ Upload image</span><small class="muted">or drop it here</small></button>';
    }
    function upload(file) {
      if (!file) return;
      box.classList.add("loading");
      uploadImage(file).then(function (p) { value = p; draw(); onChange(); })
        .catch(function (e) { toast("Upload failed: " + errMsg(e), "error"); })
        .then(function () { box.classList.remove("loading"); });
    }
    box.addEventListener("click", function (e) {
      var b = e.target.closest("[data-a]");
      if (!b) return;
      if (b.dataset.a === "remove") { value = ""; draw(); onChange(); }
      else pickFiles(false).then(function (f) { upload(f[0]); });
    });
    box.addEventListener("dragover", function (e) { e.preventDefault(); box.classList.add("drop"); });
    box.addEventListener("dragleave", function () { box.classList.remove("drop"); });
    box.addEventListener("drop", function (e) {
      e.preventDefault(); box.classList.remove("drop");
      var f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && /^image\//.test(f.type)) upload(f);
    });
    draw();
    return { get value() { return value; } };
  }

  /* ================= Views: Posts ================= */
  function viewPosts() {
    var list = posts.slice().sort(Site.byDateDesc);
    view.innerHTML =
      '<div class="admin-head"><div><h1>Posts</h1><p class="muted small">' + list.length + " total · " +
        list.filter(function (p) { return p.draft; }).length + ' drafts</p></div><a class="btn primary" href="#new-post">＋ New post</a></div>' +
      (list.length
        ? '<ul class="admin-list">' + list.map(function (p) {
            return "<li>" +
              (p.cover ? '<img class="thumb" src="' + esc(imgURL(p.cover)) + '" alt="">' : '<div class="thumb empty-thumb"></div>') +
              '<div class="grow"><a class="title" href="#edit-post/' + encodeURIComponent(p.slug) + '">' + esc(p.title) + "</a>" +
                (p.draft ? ' <span class="badge">draft</span>' : "") +
                '<div class="muted mono small">' + esc(p.date) + " · /" + esc(p.slug) + "</div></div>" +
              '<div class="row-actions">' +
                '<a class="btn small ghost" target="_blank" href="post.html?slug=' + encodeURIComponent(p.slug) + '">View</a>' +
                '<a class="btn small" href="#edit-post/' + encodeURIComponent(p.slug) + '">Edit</a>' +
                '<button class="btn small danger" data-del="' + esc(p.slug) + '">Delete</button>' +
              "</div></li>";
          }).join("") + "</ul>"
        : '<div class="empty">No posts yet. <a class="accent-link" href="#new-post">Write your first one →</a></div>');
    $$("[data-del]", view).forEach(function (b) {
      b.onclick = function () { deletePost(b.dataset.del); };
    });
  }

  function deletePost(slug) {
    var p = posts.filter(function (x) { return x.slug === slug; })[0];
    if (!p || !confirm('Delete "' + p.title + '"? This cannot be undone from here.')) return;
    busy(true, "Deleting…");
    deleteFile("posts/" + slug + ".md", "Delete post: " + p.title)
      .then(function () {
        return updateJSON("data/posts.json", [], function (list) {
          return list.filter(function (x) { return x.slug !== slug; });
        }, "Remove post from index: " + p.title);
      })
      .then(function (next) { posts = next; toast("Post deleted"); viewPosts(); })
      .catch(function (e) { toast(errMsg(e), "error"); })
      .then(function () { busy(false); });
  }

  function loadAutosave() {
    try { return JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "null"); } catch (e) { return null; }
  }

  function viewPostEditor(slug) {
    var isNew = !slug;
    var originalSlug = slug || "";
    var meta = { title: "", slug: "", date: today(), summary: "", tags: [], project: "", cover: "", draft: false };
    var body = "";
    var slugTouched = !isNew;

    var ready;
    if (isNew) {
      var saved = loadAutosave();
      if (saved && (saved.body || (saved.meta && saved.meta.title)) && confirm("You have an unsaved new post" + (saved.meta && saved.meta.title ? ' ("' + saved.meta.title + '")' : "") + ". Restore it?")) {
        meta = Object.assign(meta, saved.meta); body = saved.body || "";
        slugTouched = !!meta.slug && meta.slug !== slugify(meta.title);
      } else localStorage.removeItem(AUTOSAVE_KEY);
      ready = Promise.resolve();
    } else {
      var found = posts.filter(function (p) { return p.slug === slug; })[0];
      if (!found) { toast("Post not found", "error"); location.hash = "#posts"; return; }
      meta = Object.assign(meta, found);
      view.innerHTML = '<p class="muted mono">Loading post…</p>';
      ready = getFile("posts/" + slug + ".md").then(function (f) { body = f ? f.text : ""; });
    }

    ready.then(function () {
      view.innerHTML =
        '<div class="admin-head sticky">' +
          '<div><a href="#posts" class="mono small accent-link">← posts</a><h1 id="ed-title">' + (isNew ? "New post" : "Edit post") + "</h1></div>" +
          '<div class="head-actions">' +
            '<label class="check"><input type="checkbox" id="f-draft"> Save as draft (hidden)</label>' +
            (isNew ? "" : '<a class="btn ghost" target="_blank" href="post.html?slug=' + encodeURIComponent(originalSlug) + '">View ↗</a>') +
            '<button class="btn primary" id="save">Publish</button>' +
          "</div>" +
        "</div>" +
        '<div class="form-grid">' +
          '<label class="span2">Title<input class="input big" id="f-title" placeholder="My awesome post"></label>' +
          '<label>URL slug<input class="input mono" id="f-slug" placeholder="my-awesome-post"></label>' +
          '<label>Date<input class="input" type="date" id="f-date"></label>' +
          '<label class="span2">Short summary <span class="muted">(shown in lists)</span><textarea class="input" id="f-summary" rows="2"></textarea></label>' +
          '<label>Tags <span class="muted">(comma separated)</span><input class="input" id="f-tags" placeholder="c, game-dev, roblox"></label>' +
          '<label>Related project<select class="input" id="f-project"><option value="">— none —</option>' +
            projects.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.title) + "</option>"; }).join("") +
          "</select></label>" +
          '<div class="span2 field"><span class="label">Cover image <span class="muted">(optional)</span></span><div class="img-field" id="f-cover"></div></div>' +
        "</div>" +
        '<div class="field"><span class="label">Content</span>' + editorHTML("Write your post in Markdown…\n\nDrag & drop or paste images right here.") + "</div>";

      $("#f-title").value = meta.title;
      $("#f-slug").value = meta.slug;
      $("#f-date").value = meta.date;
      $("#f-summary").value = meta.summary || "";
      $("#f-tags").value = (meta.tags || []).join(", ");
      $("#f-project").value = meta.project || "";
      $("#f-draft").checked = !!meta.draft;

      var editor, cover;
      function collect() {
        return {
          slug: $("#f-slug").value.trim(),
          title: $("#f-title").value.trim(),
          date: $("#f-date").value || today(),
          summary: $("#f-summary").value.trim(),
          tags: parseTags($("#f-tags").value),
          project: $("#f-project").value,
          cover: cover ? cover.value : "",
          draft: $("#f-draft").checked
        };
      }
      function onChange() {
        setDirty(true);
        if (isNew) {
          try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ meta: collect(), body: editor ? editor.value : "" })); } catch (e) {}
        }
      }
      function syncButton() { $("#save").textContent = $("#f-draft").checked ? "Save draft" : "Publish"; }

      editor = wireEditor($(".md-editor", view), onChange);
      editor.value = body;
      cover = wireImageField($("#f-cover"), meta.cover, onChange);
      syncButton();

      $("#f-title").addEventListener("input", function () {
        if (!slugTouched) $("#f-slug").value = slugify($("#f-title").value);
      });
      $("#f-slug").addEventListener("input", function () { slugTouched = true; });
      $("#f-slug").addEventListener("blur", function () { $("#f-slug").value = slugify($("#f-slug").value); });
      $("#f-draft").addEventListener("change", syncButton);
      $$(".form-grid .input", view).forEach(function (el) { el.addEventListener("input", onChange); el.addEventListener("change", onChange); });

      function save() {
        var m = collect();
        m.slug = slugify(m.slug || m.title);
        $("#f-slug").value = m.slug;
        if (!m.title) return toast("Add a title first", "error");
        if (!m.slug) return toast("Slug can't be empty", "error");
        if (m.slug !== originalSlug && posts.some(function (p) { return p.slug === m.slug; })) return toast("Another post already uses this slug", "error");
        var content = editor.value;
        if (/!\[Uploading /.test(content)) return toast("Wait for the images to finish uploading", "error");
        m.updated = today();

        busy(true, m.draft ? "Saving draft…" : "Publishing…");
        writeText("posts/" + m.slug + ".md", content, (isNew ? "Add" : "Update") + " post: " + m.title)
          .then(function () {
            if (!isNew && originalSlug && originalSlug !== m.slug) {
              return deleteFile("posts/" + originalSlug + ".md", "Rename post " + originalSlug + " -> " + m.slug);
            }
          })
          .then(function () {
            var key = originalSlug || m.slug;
            return updateJSON("data/posts.json", [], function (list) {
              list = list.filter(function (p) { return p.slug !== key && p.slug !== m.slug; });
              list.push(m);
              return list.sort(Site.byDateDesc);
            }, (isNew ? "Add" : "Update") + " post index: " + m.title);
          })
          .then(function (next) {
            posts = next;
            setDirty(false);
            if (isNew) localStorage.removeItem(AUTOSAVE_KEY);
            isNew = false;
            originalSlug = m.slug;
            slugTouched = true;
            currentHash = "#edit-post/" + encodeURIComponent(m.slug);
            history.replaceState(null, "", currentHash);
            $("#ed-title").textContent = "Edit post";
            toast(m.draft ? "Draft saved" : "Published! It goes live in about a minute.");
          })
          .catch(function (e) { toast(errMsg(e), "error"); })
          .then(function () { busy(false); });
      }
      $("#save").addEventListener("click", save);
      view.addEventListener("keydown", function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
      });
    }).catch(function (e) { view.innerHTML = '<div class="empty">Could not load: ' + esc(errMsg(e)) + "</div>"; });
  }

  /* ================= Views: Projects ================= */
  function viewProjects() {
    view.innerHTML =
      '<div class="admin-head"><div><h1>Projects</h1><p class="muted small">Order here = order on the homepage.</p></div><a class="btn primary" href="#new-project">＋ New project</a></div>' +
      (projects.length
        ? '<ul class="admin-list">' + projects.map(function (p, i) {
            return "<li>" +
              (p.image ? '<img class="thumb" src="' + esc(imgURL(p.image)) + '" alt="">' : '<div class="thumb empty-thumb"></div>') +
              '<div class="grow"><a class="title" href="#edit-project/' + encodeURIComponent(p.id) + '">' + esc(p.title) + "</a>" +
                '<div class="muted small">' + esc(p.summary || "") + "</div></div>" +
              '<div class="row-actions">' +
                '<button class="btn small ghost" data-move="' + i + '" data-dir="-1" ' + (i === 0 ? "disabled" : "") + ' title="Move up">↑</button>' +
                '<button class="btn small ghost" data-move="' + i + '" data-dir="1" ' + (i === projects.length - 1 ? "disabled" : "") + ' title="Move down">↓</button>' +
                '<a class="btn small" href="#edit-project/' + encodeURIComponent(p.id) + '">Edit</a>' +
                '<button class="btn small danger" data-del="' + esc(p.id) + '">Delete</button>' +
              "</div></li>";
          }).join("") + "</ul>"
        : '<div class="empty">No projects yet. <a class="accent-link" href="#new-project">Add your first project →</a></div>');

    $$("[data-move]", view).forEach(function (b) {
      b.onclick = function () {
        var i = +b.dataset.move, j = i + +b.dataset.dir;
        var a = projects[i], c = projects[j];
        busy(true, "Reordering…");
        updateJSON("data/projects.json", [], function (list) {
          var ia = list.findIndex(function (x) { return x.id === a.id; });
          var ic = list.findIndex(function (x) { return x.id === c.id; });
          if (ia >= 0 && ic >= 0) { list[ia] = c; list[ic] = a; }
          return list;
        }, "Reorder projects")
          .then(function (next) { projects = next; viewProjects(); })
          .catch(function (e) { toast(errMsg(e), "error"); })
          .then(function () { busy(false); });
      };
    });
    $$("[data-del]", view).forEach(function (b) {
      b.onclick = function () {
        var p = projects.filter(function (x) { return x.id === b.dataset.del; })[0];
        if (!p || !confirm('Delete project "' + p.title + '"? Posts linked to it stay, just unlinked.')) return;
        busy(true, "Deleting…");
        updateJSON("data/projects.json", [], function (list) {
          return list.filter(function (x) { return x.id !== p.id; });
        }, "Delete project: " + p.title)
          .then(function (next) { projects = next; toast("Project deleted"); viewProjects(); })
          .catch(function (e) { toast(errMsg(e), "error"); })
          .then(function () { busy(false); });
      };
    });
  }

  function viewProjectEditor(id) {
    var isNew = !id;
    var originalId = id || "";
    var p = { id: "", title: "", summary: "", description: "", tags: [], repo: "", demo: "", image: "", date: today() };
    if (!isNew) {
      var found = projects.filter(function (x) { return x.id === id; })[0];
      if (!found) { toast("Project not found", "error"); location.hash = "#projects"; return; }
      p = Object.assign(p, found);
    }
    var idTouched = !isNew;

    view.innerHTML =
      '<div class="admin-head sticky">' +
        '<div><a href="#projects" class="mono small accent-link">← projects</a><h1 id="ed-title">' + (isNew ? "New project" : "Edit project") + "</h1></div>" +
        '<div class="head-actions"><button class="btn primary" id="save">Save project</button></div>' +
      "</div>" +
      '<div class="form-grid">' +
        '<label class="span2">Title<input class="input big" id="f-title" placeholder="Project name"></label>' +
        '<label>ID <span class="muted">(used in the URL)</span><input class="input mono" id="f-id"></label>' +
        '<label>Date / year<input class="input" id="f-date" placeholder="2026-11-17"></label>' +
        '<label class="span2">One-line summary<input class="input" id="f-summary" placeholder="What is it, in one sentence?"></label>' +
        '<label>Source code link<input class="input" id="f-repo" placeholder="https://github.com/…"></label>' +
        '<label>Live demo link<input class="input" id="f-demo" placeholder="https://…"></label>' +
        '<label class="span2">Tags / tech <span class="muted">(comma separated)</span><input class="input" id="f-tags" placeholder="C, SDL2, Lua"></label>' +
        '<div class="span2 field"><span class="label">Main image</span><div class="img-field" id="f-image"></div></div>' +
      "</div>" +
      '<div class="field"><span class="label">Full description <span class="muted">(optional, shown on the project page)</span></span>' + editorHTML("Describe the project: what it does, how you built it, screenshots…") + "</div>";

    $("#f-title").value = p.title; $("#f-id").value = p.id; $("#f-date").value = p.date || "";
    $("#f-summary").value = p.summary || ""; $("#f-repo").value = p.repo || ""; $("#f-demo").value = p.demo || "";
    $("#f-tags").value = (p.tags || []).join(", ");

    var onChange = function () { setDirty(true); };
    var editor = wireEditor($(".md-editor", view), onChange);
    editor.value = p.description || "";
    var image = wireImageField($("#f-image"), p.image, onChange);
    $$(".form-grid .input", view).forEach(function (el) { el.addEventListener("input", onChange); });
    $("#f-title").addEventListener("input", function () { if (!idTouched) $("#f-id").value = slugify($("#f-title").value); });
    $("#f-id").addEventListener("input", function () { idTouched = true; });

    function save() {
      var np = {
        id: slugify($("#f-id").value || $("#f-title").value),
        title: $("#f-title").value.trim(),
        summary: $("#f-summary").value.trim(),
        description: editor.value,
        tags: parseTags($("#f-tags").value),
        repo: $("#f-repo").value.trim(),
        demo: $("#f-demo").value.trim(),
        image: image.value,
        date: $("#f-date").value.trim()
      };
      $("#f-id").value = np.id;
      if (!np.title) return toast("Add a title first", "error");
      if (np.id !== originalId && projects.some(function (x) { return x.id === np.id; })) return toast("Another project already uses this ID", "error");
      if (/!\[Uploading /.test(np.description)) return toast("Wait for the images to finish uploading", "error");

      busy(true, "Saving project…");
      var key = originalId;
      updateJSON("data/projects.json", [], function (list) {
        var i = key ? list.findIndex(function (x) { return x.id === key; }) : -1;
        if (i >= 0) list[i] = np; else list.unshift(np);
        return list;
      }, (isNew ? "Add" : "Update") + " project: " + np.title)
        .then(function (next) {
          projects = next;
          // keep post links working if the ID changed
          if (key && key !== np.id && posts.some(function (x) { return x.project === key; })) {
            return updateJSON("data/posts.json", [], function (list) {
              list.forEach(function (x) { if (x.project === key) x.project = np.id; });
              return list;
            }, "Relink posts to project " + np.id).then(function (n) { posts = n; });
          }
        })
        .then(function () {
          setDirty(false);
          isNew = false; originalId = np.id;
          currentHash = "#edit-project/" + encodeURIComponent(np.id);
          history.replaceState(null, "", currentHash);
          $("#ed-title").textContent = "Edit project";
          toast("Project saved! Live in about a minute.");
        })
        .catch(function (e) { toast(errMsg(e), "error"); })
        .then(function () { busy(false); });
    }
    $("#save").addEventListener("click", save);
    view.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); save(); }
    });
  }

  /* ================= Views: Settings ================= */
  function viewSettings() {
    var l = site.links || {};
    view.innerHTML =
      '<div class="admin-head sticky"><div><h1>Site settings</h1><p class="muted small">Name, intro and links shown on the homepage.</p></div>' +
        '<div class="head-actions"><button class="btn primary" id="save">Save settings</button></div></div>' +
      '<div class="form-grid">' +
        '<label class="span2">Your name<input class="input big" id="s-name"></label>' +
        '<label class="span2">Tagline<input class="input" id="s-tagline"></label>' +
        '<label>GitHub URL<input class="input" id="s-github"></label>' +
        '<label>LinkedIn URL<input class="input" id="s-linkedin"></label>' +
        '<label>Email <span class="muted">(optional, public)</span><input class="input" id="s-email"></label>' +
        '<label>Other website <span class="muted">(optional)</span><input class="input" id="s-website"></label>' +
      "</div>" +
      '<div class="field"><span class="label">About me</span>' + editorHTML("A few paragraphs about you…") + "</div>";
    $("#s-name").value = site.name || ""; $("#s-tagline").value = site.tagline || "";
    $("#s-github").value = l.github || ""; $("#s-linkedin").value = l.linkedin || "";
    $("#s-email").value = l.email || ""; $("#s-website").value = l.website || "";
    var editor = wireEditor($(".md-editor", view), function () { setDirty(true); });
    editor.value = site.about || "";
    $$(".form-grid .input", view).forEach(function (el) { el.addEventListener("input", function () { setDirty(true); }); });

    $("#save").addEventListener("click", function () {
      var next = {
        name: $("#s-name").value.trim(),
        tagline: $("#s-tagline").value.trim(),
        about: editor.value,
        links: {
          github: $("#s-github").value.trim(),
          linkedin: $("#s-linkedin").value.trim(),
          email: $("#s-email").value.trim(),
          website: $("#s-website").value.trim()
        }
      };
      busy(true, "Saving…");
      writeText("data/site.json", JSON.stringify(next, null, 2) + "\n", "Update site settings")
        .then(function () { site = next; setDirty(false); toast("Settings saved! Live in about a minute."); })
        .catch(function (e) { toast(errMsg(e), "error"); })
        .then(function () { busy(false); });
    });
  }

  /* ================= Router ================= */
  function route() {
    var h = decodeURIComponent((location.hash || "#posts").slice(1));
    var parts = h.split("/");
    var tab = parts[0];
    var arg = parts.slice(1).join("/");
    var activeTab = /project/.test(tab) ? "projects" : tab === "settings" ? "settings" : "posts";
    $$(".tabs a").forEach(function (a) { a.classList.toggle("active", a.dataset.tab === activeTab); });
    window.scrollTo(0, 0);
    if (tab === "new-post") viewPostEditor(null);
    else if (tab === "edit-post") viewPostEditor(arg);
    else if (tab === "projects") viewProjects();
    else if (tab === "new-project") viewProjectEditor(null);
    else if (tab === "edit-project") viewProjectEditor(arg);
    else if (tab === "settings") viewSettings();
    else viewPosts();
  }
  window.addEventListener("hashchange", function () {
    if (location.hash === currentHash) return;
    if (dirty && !confirm("You have unsaved changes. Leave anyway?")) {
      history.replaceState(null, "", currentHash);
      return;
    }
    setDirty(false);
    currentHash = location.hash;
    route();
  });

  /* ================= Auth & boot ================= */
  function tryLogin(token) {
    TOKEN = token;
    return Promise.all([gh("/user"), gh("/repos/" + CFG.owner + "/" + CFG.repo)]).then(function (r) {
      var user = r[0], repo = r[1];
      if (!repo.permissions || !repo.permissions.push) throw new Error("This account can't write to " + CFG.owner + "/" + CFG.repo + ".");
      CFG.branch = repo.default_branch || CFG.branch;
      return user;
    }).catch(function (e) {
      if (e.status === 404) throw new Error("Repo " + CFG.owner + "/" + CFG.repo + " not found, or the token has no access to it.");
      if (e.status === 401) throw new Error("Invalid or expired token.");
      throw e;
    });
  }
  function startApp(user) {
    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#avatar").src = user.avatar_url;
    $("#avatar").title = user.login;
    view.innerHTML = '<p class="muted mono">Loading your content…</p>';
    return Promise.all([
      readJSON("data/posts.json", []),
      readJSON("data/projects.json", []),
      readJSON("data/site.json", {})
    ]).then(function (r) {
      posts = r[0]; projects = r[1]; site = r[2];
      currentHash = location.hash;
      route();
    });
  }
  function showLogin() {
    $("#app").classList.add("hidden");
    $("#login").classList.remove("hidden");
    $("#repo-name").textContent = CFG.owner + "/" + CFG.repo;
    $("#token").focus();
  }
  function forgetToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    TOKEN = null;
  }

  $("#login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var token = $("#token").value.trim();
    var remember = $("#remember").checked;
    $("#login-error").textContent = "";
    busy(true, "Checking token…");
    tryLogin(token).then(function (user) {
      forgetToken(); TOKEN = token;
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
      $("#token").value = "";
      return startApp(user);
    }).catch(function (err) {
      TOKEN = null;
      $("#login-error").textContent = errMsg(err);
    }).then(function () { busy(false); });
  });
  $("#logout").addEventListener("click", function () {
    if (dirty && !confirm("You have unsaved changes. Log out anyway?")) return;
    setDirty(false);
    forgetToken();
    location.hash = "";
    location.reload();
  });

  var saved = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  if (saved) {
    busy(true, "Signing in…");
    tryLogin(saved).then(startApp).catch(function () { forgetToken(); showLogin(); }).then(function () { busy(false); });
  } else {
    showLogin();
  }
})();
