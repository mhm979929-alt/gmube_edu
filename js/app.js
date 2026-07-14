// ── App Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Init auth from localStorage
  Auth.init();

  // Register routes
  Router.add("/", renderHome);
  Router.add("/teachers", renderTeachers);
  Router.add("/books", renderBooks);
  Router.add("/tests", renderTests);
  Router.add("/profile", renderProfile);
  Router.add("/login", renderLogin);
  Router.add("/notifications", renderNotifications);
  Router.add("/watch/([^/]+)", renderWatch);
  Router.add("/subject/([^/]+)", renderSubject);
  Router.add("/channel/([^/]+)", renderChannel);
  Router.add("/playlist/([^/]+)", renderPlaylist);
  Router.add("/take-test/([^/]+)", renderTakeTest);

  // Bottom nav click handlers
  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", () => {
      const page = item.dataset.page;
      const routes = {
        home: "/",
        teachers: "/teachers",
        books: "/books",
        tests: "/tests",
        profile: "/profile",
      };
      if (routes[page]) navigateTo(routes[page]);
    });
  });

  // Start router
  Router.start();
});
