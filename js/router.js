// ── Hash Router ─────────────────────────────────────────────────
const Router = {
  routes: [],
  current: null,

  add(pattern, handler) {
    this.routes.push({ pattern: new RegExp("^" + pattern + "$"), handler });
  },

  resolve(hash) {
    const path = (hash || "#/").replace(/^#/, "") || "/";
    for (const route of this.routes) {
      const m = path.match(route.pattern);
      if (m) {
        this.current = path;
        route.handler(...m.slice(1));
        return;
      }
    }
    // fallback to home
    navigateTo("/");
  },

  start() {
    window.addEventListener("hashchange", () => this.resolve(location.hash));
    this.resolve(location.hash);
  },
};

function navigateTo(path) {
  location.hash = path;
}

function goBack() {
  if (history.length > 1) history.back();
  else navigateTo("/");
}

function renderPage(html) {
  const view = el("app-view");
  if (view) {
    view.innerHTML = html;
    featherRefresh();
    window.scrollTo(0, 0);
  }
}

function updateBottomNav(active) {
  qsa(".nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.page === active);
  });
}
