/* Public site: renders projects and posts from data/*.json and posts/*.md */
(function () {
  "use strict";
  var CFG = window.SITE_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  // Cache-busting so new posts show up right after GitHub Pages redeploys.
  function getJSON(path, fallback) {
    return fetch(path + "?v=" + Date.now(), { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : fallback; })
      .catch(function () { return fallback; });
  }
  function getText(path) {
    return fetch(path + "?v=" + Date.now(), { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text();
    });
  }

  function fmtDate(d) {
    if (!d) return "";
    var dt = new Date(d + "T00:00:00");
    if (isNaN(dt)) return esc(d);
    return dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function byDateDesc(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }
  function readingTime(md) {
    var words = (md || "").replace(/```[\s\S]*?```/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 200)) + " min read";
  }

  /* ---------- Markdown ---------- */
  var mdReady = false;
  var EMBED_OK = /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com|player\.vimeo\.com|codepen\.io|open\.spotify\.com)\//;
  function setupMarkdown() {
    if (mdReady) return;
    mdReady = true;
    if (window.marked) {
      marked.use({
        gfm: true,
        breaks: false,
        renderer: {
          // ![alt](src "caption")  -> image with caption
          image: function (href, title, text) {
            if (!href) return "";
            var img = '<img src="' + href + '" alt="' + (text || "") + '" loading="lazy">';
            return title ? '<span class="figure">' + img + '<span class="figcaption">' + title + "</span></span>" : img;
          }
        }
      });
    }
    if (window.DOMPurify) {
      DOMPurify.addHook("uponSanitizeElement", function (node, data) {
        if (data.tagName === "iframe" && !EMBED_OK.test(node.getAttribute("src") || "")) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
      });
      DOMPurify.addHook("afterSanitizeAttributes", function (node) {
        if (node.tagName === "A" && /^https?:\/\//.test(node.getAttribute("href") || "")) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener");
        }
      });
    }
  }
  function renderMarkdown(md) {
    setupMarkdown();
    var html = window.marked ? marked.parse(md || "") : "<p>" + esc(md).replace(/\n/g, "<br>") + "</p>";
    return window.DOMPurify
      ? DOMPurify.sanitize(html, {
          ADD_TAGS: ["iframe"],
          ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target", "loading"]
        })
      : html;
  }
  function highlight(el) {
    if (!window.hljs) return;
    $$("pre code", el).forEach(function (b) {
      if (!b.dataset.highlighted) hljs.highlightElement(b);
    });
  }

  /* ---------- Lightbox for images in posts ---------- */
  function enableLightbox(root) {
    root.addEventListener("click", function (e) {
      var img = e.target.closest(".prose img, img.cover");
      if (!img) return;
      var box = document.createElement("div");
      box.className = "lightbox";
      box.innerHTML = '<img src="' + esc(img.currentSrc || img.src) + '" alt="">';
      box.addEventListener("click", function () { box.remove(); });
      document.addEventListener("keydown", function k(ev) {
        if (ev.key === "Escape") { box.remove(); document.removeEventListener("keydown", k); }
      });
      document.body.appendChild(box);
    });
  }

  /* ---------- Shared building blocks ---------- */
  function linksHTML(links) {
    links = links || {};
    var out = [];
    if (links.github) out.push('<a class="pill" href="' + esc(links.github) + '" target="_blank" rel="noopener">GitHub ↗</a>');
    if (links.linkedin) out.push('<a class="pill" href="' + esc(links.linkedin) + '" target="_blank" rel="noopener">LinkedIn ↗</a>');
    if (links.email) out.push('<a class="pill" href="mailto:' + esc(links.email) + '">Email</a>');
    if (links.website) out.push('<a class="pill" href="' + esc(links.website) + '" target="_blank" rel="noopener">Website ↗</a>');
    return out.join("");
  }
  function tagsHTML(tags, linkable) {
    if (!tags || !tags.length) return "";
    return '<div class="tags">' + tags.map(function (t) {
      return linkable
        ? '<a class="tag" href="blog.html?tag=' + encodeURIComponent(t) + '">' + esc(t) + "</a>"
        : '<span class="tag">' + esc(t) + "</span>";
    }).join("") + "</div>";
  }
  function initials(title) {
    return esc((title || "?").split(/\s+/).slice(0, 2).map(function (w) { return w[0]; }).join("").toUpperCase());
  }
  function projectCard(p) {
    var url = "project.html?id=" + encodeURIComponent(p.id);
    return '<article class="card">' +
      '<a class="card-media" href="' + url + '">' +
        (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '<div class="placeholder mono">' + initials(p.title) + "</div>") +
      "</a>" +
      '<div class="card-body">' +
        '<h3><a href="' + url + '">' + esc(p.title) + "</a></h3>" +
        (p.summary ? '<p class="muted">' + esc(p.summary) + "</p>" : "") +
        tagsHTML(p.tags) +
        '<div class="card-links mono small">' +
          '<a href="' + url + '">details →</a>' +
          (p.repo ? '<a href="' + esc(p.repo) + '" target="_blank" rel="noopener">code ↗</a>' : "") +
          (p.demo ? '<a href="' + esc(p.demo) + '" target="_blank" rel="noopener">live ↗</a>' : "") +
        "</div>" +
      "</div></article>";
  }
  function postItem(p, projectsById) {
    var proj = p.project && projectsById[p.project];
    return '<a class="post-item' + (p.cover ? " has-thumb" : "") + '" href="post.html?slug=' + encodeURIComponent(p.slug) + '">' +
      (p.cover ? '<img class="post-thumb" src="' + esc(p.cover) + '" alt="" loading="lazy">' : "") +
      "<div>" +
        '<div class="mono small muted">' + fmtDate(p.date) + (proj ? " · " + esc(proj.title) : "") + "</div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        (p.summary ? '<p class="muted">' + esc(p.summary) + "</p>" : "") +
        tagsHTML(p.tags) +
      "</div></a>";
  }
  function indexBy(list, key) {
    var m = {};
    (list || []).forEach(function (x) { m[x[key]] = x; });
    return m;
  }
  function published(posts) {
    return (posts || []).filter(function (p) { return !p.draft; }).sort(byDateDesc);
  }

  function chrome(site) {
    var name = site.name || "My Portfolio";
    $$("[data-site-name]").forEach(function (el) { el.textContent = name; });
    $$("[data-site-short]").forEach(function (el) {
      var parts = name.split(/\s+/);
      el.textContent = parts.length > 1 ? (parts[0] + "-" + parts[parts.length - 1]).toLowerCase() : name.toLowerCase();
    });
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    var page = document.body.dataset.page;
    $$("[data-nav]").forEach(function (a) { if (a.dataset.nav === page) a.classList.add("active"); });
  }

  /* ---------- Pages ---------- */
  function home(site, projects, posts) {
    document.title = site.name || "Portfolio";
    $("#hero-name").textContent = site.name || "Your Name";
    $("#hero-tagline").textContent = site.tagline || "";
    $("#hero-links").innerHTML = linksHTML(site.links);

    $("#project-count").textContent = projects.length ? projects.length + (projects.length === 1 ? " project" : " projects") : "";
    $("#projects-grid").innerHTML = projects.length
      ? projects.map(projectCard).join("")
      : '<div class="empty">No projects yet — coming soon.</div>';

    var list = published(posts).slice(0, 4);
    var byId = indexBy(projects, "id");
    $("#latest-posts").innerHTML = list.length
      ? list.map(function (p) { return postItem(p, byId); }).join("")
      : '<div class="empty">No posts yet.</div>';

    if (site.about) $("#about-text").innerHTML = renderMarkdown(site.about);
    else $("#about").classList.add("hidden");
  }

  function blog(site, projects, posts) {
    document.title = "Blog — " + (site.name || "");
    var all = published(posts);
    var byId = indexBy(projects, "id");
    var activeTag = params.get("tag") || "";
    var tags = [];
    all.forEach(function (p) { (p.tags || []).forEach(function (t) { if (tags.indexOf(t) < 0) tags.push(t); }); });
    tags.sort();

    function draw() {
      var q = ($("#search").value || "").toLowerCase().trim();
      var list = all.filter(function (p) {
        if (activeTag && (p.tags || []).indexOf(activeTag) < 0) return false;
        if (!q) return true;
        return (p.title + " " + (p.summary || "") + " " + (p.tags || []).join(" ")).toLowerCase().indexOf(q) >= 0;
      });
      $("#tag-filter").innerHTML = tags.length
        ? '<button class="chip' + (activeTag ? "" : " on") + '" data-tag="">all</button>' +
          tags.map(function (t) { return '<button class="chip' + (t === activeTag ? " on" : "") + '" data-tag="' + esc(t) + '">' + esc(t) + "</button>"; }).join("")
        : "";
      $("#all-posts").innerHTML = list.length
        ? list.map(function (p) { return postItem(p, byId); }).join("")
        : '<div class="empty">' + (all.length ? "Nothing matches your filter." : "No posts yet.") + "</div>";
    }
    $("#tag-filter").addEventListener("click", function (e) {
      var b = e.target.closest("[data-tag]");
      if (!b) return;
      activeTag = b.dataset.tag;
      history.replaceState(null, "", activeTag ? "?tag=" + encodeURIComponent(activeTag) : "blog.html");
      draw();
    });
    $("#search").addEventListener("input", draw);
    draw();
  }

  function notFound(el, what, back) {
    el.innerHTML = '<p class="eyebrow mono">// 404</p><h1>' + what + ' not found</h1><p><a class="accent-link" href="' + back + '">← go back</a></p>';
  }

  function postPage(site, projects, posts) {
    var el = $("#article");
    var slug = params.get("slug");
    var meta = (posts || []).filter(function (p) { return p.slug === slug; })[0];
    if (!meta) return notFound(el, "Post", "blog.html");
    var all = published(posts);
    var idx = all.indexOf(meta);
    var newer = idx > 0 ? all[idx - 1] : null;
    var older = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
    var proj = meta.project && indexBy(projects, "id")[meta.project];
    document.title = meta.title + " — " + (site.name || "");

    getText("posts/" + encodeURIComponent(slug) + ".md").then(function (md) {
      el.innerHTML =
        (meta.draft ? '<div class="notice mono small">Draft — this post is not listed on the site.</div>' : "") +
        '<header class="article-head">' +
          '<a href="blog.html" class="mono small accent-link">← all posts</a>' +
          "<h1>" + esc(meta.title) + "</h1>" +
          '<div class="mono small muted">' + fmtDate(meta.date) + " · " + readingTime(md) +
            (proj ? ' · <a class="accent-link" href="project.html?id=' + encodeURIComponent(proj.id) + '">' + esc(proj.title) + "</a>" : "") +
          "</div>" +
          tagsHTML(meta.tags, true) +
        "</header>" +
        (meta.cover ? '<img class="cover" src="' + esc(meta.cover) + '" alt="">' : "") +
        '<div class="prose">' + renderMarkdown(md) + "</div>" +
        '<nav class="post-nav">' +
          (older ? '<a href="post.html?slug=' + encodeURIComponent(older.slug) + '"><span class="mono small muted">← older</span>' + esc(older.title) + "</a>" : "<span></span>") +
          (newer ? '<a class="right" href="post.html?slug=' + encodeURIComponent(newer.slug) + '"><span class="mono small muted">newer →</span>' + esc(newer.title) + "</a>" : "<span></span>") +
        "</nav>";
      highlight(el);
    }).catch(function () { notFound(el, "Post", "blog.html"); });
  }

  function projectPage(site, projects, posts) {
    var el = $("#project");
    var id = params.get("id");
    var p = (projects || []).filter(function (x) { return x.id === id; })[0];
    if (!p) return notFound(el, "Project", "index.html#projects");
    document.title = p.title + " — " + (site.name || "");
    var related = published(posts).filter(function (x) { return x.project === p.id; });
    el.innerHTML =
      '<header class="article-head">' +
        '<a href="index.html#projects" class="mono small accent-link">← all projects</a>' +
        "<h1>" + esc(p.title) + "</h1>" +
        (p.summary ? '<p class="lead muted">' + esc(p.summary) + "</p>" : "") +
        '<div class="links">' +
          (p.repo ? '<a class="pill" href="' + esc(p.repo) + '" target="_blank" rel="noopener">Source code ↗</a>' : "") +
          (p.demo ? '<a class="pill" href="' + esc(p.demo) + '" target="_blank" rel="noopener">Live demo ↗</a>' : "") +
        "</div>" +
        tagsHTML(p.tags) +
      "</header>" +
      (p.image ? '<img class="cover" src="' + esc(p.image) + '" alt="">' : "") +
      (p.description ? '<div class="prose">' + renderMarkdown(p.description) + "</div>" : "") +
      (related.length
        ? '<section><div class="section-head"><h2>Posts about this project</h2></div><div class="post-list">' +
          related.map(function (x) { return postItem(x, {}); }).join("") + "</div></section>"
        : "");
    highlight(el);
  }

  /* ---------- Boot ---------- */
  window.Site = { esc: esc, renderMarkdown: renderMarkdown, highlight: highlight, fmtDate: fmtDate, byDateDesc: byDateDesc };

  var page = document.body.dataset.page;
  if (page === "admin") return;

  Promise.all([
    getJSON("data/site.json", {}),
    getJSON("data/projects.json", []),
    getJSON("data/posts.json", [])
  ]).then(function (r) {
    var site = r[0] || {}, projects = r[1] || [], posts = r[2] || [];
    chrome(site);
    if (page === "home") home(site, projects, posts);
    else if (page === "blog") blog(site, projects, posts);
    else if (page === "post") postPage(site, projects, posts);
    else if (page === "project") projectPage(site, projects, posts);
    enableLightbox(document.body);
    if (location.hash) { var t = $(location.hash); if (t) setTimeout(function () { t.scrollIntoView(); }, 50); }
  });
})();
