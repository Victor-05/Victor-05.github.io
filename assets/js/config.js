// Repo settings. On *.github.io they are detected automatically;
// the fallback values are used when you open the site elsewhere (e.g. locally).
window.SITE_CONFIG = (function () {
  var owner = "Victor-05";
  var repo = "Victor-05.github.io";
  var host = location.hostname;
  if (host.endsWith(".github.io")) {
    owner = host.replace(".github.io", "");
    repo = host;
  }
  return { owner: owner, repo: repo, branch: "main" };
})();
