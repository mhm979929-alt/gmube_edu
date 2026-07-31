// ── App Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  Auth.init();

  // 1. تحميل المواد من قاعدة البيانات
  try {
    const subjects = await databases.listDocuments(DATABASE_ID, COLLECTIONS.SUBJECTS, []);
    const subjectNames = subjects.documents.map(s => s.name);
    CATEGORIES = ["الكل", ...subjectNames];
  } catch (e) {
    CATEGORIES = ["الكل", "رياضيات", "علوم", "كيمياء", "فيزياء", "عربي", "إنجليزي", "فرنسي", "تاريخ", "جغرافيا", "معلوماتية"];
    console.warn("تعذر تحميل المواد من قاعدة البيانات، استخدام القائمة الاحتياطية.");
  }

  // 2. Register routes
  Router.add("/", renderHome);
  Router.add("/teachers", renderTeachers);
  Router.add("/books", renderBooks);
  Router.add("/tests", renderTests);
  Router.add("/profile", renderProfile);
  Router.add("/login", renderLogin);
  Router.add("/notifications", renderNotifications);
  Router.add("/watch/([^/]+)", renderWatch);
  Router.add("/subject/([^/]+)", renderSubject);
  // تم تعديل مسار القناة ليدعم معرف الوثيقة
  Router.add("/channel/([^/]+)", renderChannel);
  Router.add("/playlist/([^/]+)", renderPlaylist);
  Router.add("/take-test/([^/]+)", renderTakeTest);

  // 3. Bottom nav click handlers
  document.querySelectorAll(".nav-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const page = this.dataset.page;
      const routes = { home: "/", teachers: "/teachers", books: "/books", tests: "/tests", profile: "/profile" };
      if (routes[page]) navigateTo(routes[page]);
    });
  });

  // 4. Start router
  Router.start();
});