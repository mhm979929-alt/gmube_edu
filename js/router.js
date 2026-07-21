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

// ============================================
// تسجيل المسارات (Routes)
// ============================================

// ⚠️ تأكد من أن دوال الصفحات معرفة قبل تسجيلها
// يجب تحميل ملفات الصفحات قبل هذا الكود

// تسجيل المسارات
Router.add("/", renderHome);
Router.add("/home", renderHome);
Router.add("/teachers", renderTeachers);
Router.add("/books", renderBooks);
Router.add("/tests", renderTests);
Router.add("/profile", renderProfile);
Router.add("/login", renderLogin);
Router.add("/watch/(.+)", (id) => renderWatch(id));
Router.add("/subject/(.+)", (subject) => renderSubject(subject));
Router.add("/channel/(.+)", (uid) => renderChannel(uid));
Router.add("/playlist/(.+)", (id) => renderPlaylist(id));
Router.add("/notifications", renderNotifications);
Router.add("/take-test/(.+)", (id) => renderTakeTest(id));
Router.add("/ask-book", renderAskBook); // ✅ صفحة اسأل كتابك

// ============================================
// بدء التشغيل
// ============================================

// تأكد من وجود الدوال قبل بدء التشغيل
document.addEventListener("DOMContentLoaded", function() {
  // ابدأ الروتر بعد تحميل الصفحات
  Router.start();
});

// بدء التشغيل فوراً إذا كان الـ DOM جاهزاً
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => Router.start());
} else {
  Router.start();
}