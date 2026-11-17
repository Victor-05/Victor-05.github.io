# Portfolio + blog (GitHub Pages)

Static site: no build step, no server. Content lives in `data/*.json`, `posts/*.md` and `assets/uploads/`.

- `index.html` – home (intro, projects, latest posts, about)
- `blog.html`, `post.html?slug=…`, `project.html?id=…`
- `admin.html` – private editor. Sign in with a GitHub fine-grained token
  (Contents: Read and write on this repo). It commits straight to the repo;
  GitHub Pages redeploys in ~1 minute.

Markdown tips: several images on consecutive lines become a gallery,
`![alt](src "caption")` adds a caption, the ▶ button embeds YouTube.
