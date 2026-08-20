// ── App Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  await Auth.init();

  let bridgeResumeInFlight = false;
  async function resumeOAuthBridgeIfNeeded() {
    if (bridgeResumeInFlight || Auth.isLoggedIn()) return;
    bridgeResumeInFlight = true;
    try {
      const session = await Auth.resumeGoogleBridge();
      if (session) {
        toast("تم تسجيل الدخول بواسطة Google", "success");
        if (location.hash.includes("/login")) navigateTo("/");
      }
    } catch (error) {
      // لا نزعج المستخدم في كل focus؛ صفحة الدخول تعرض الخطأ عند العودة إليها.
      if (location.hash.includes("/login") && error?.message) {
        console.warn("oauth_bridge_resume", error.message);
      }
    } finally {
      bridgeResumeInFlight = false;
    }
  }

  window.addEventListener("pageshow", resumeOAuthBridgeIfNeeded);
  window.addEventListener("focus", resumeOAuthBridgeIfNeeded);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") resumeOAuthBridgeIfNeeded();
  });
  setTimeout(resumeOAuthBridgeIfNeeded, 0);

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
  Router.add("/login(?:\\?.*)?", renderLogin);
  Router.add("/notifications", renderNotifications);
  Router.add("/watch/([^/]+)", renderWatch);
  Router.add("/subject/([^/]+)", renderSubject);
  // تم تعديل مسار القناة ليدعم معرف الوثيقة
  Router.add("/channel/([^/]+)", renderChannel);
  Router.add("/playlist/([^/]+)", renderPlaylist);
  Router.add("/take-test/([^/]+)", renderTakeTest);
  Router.add("/university-admissions", renderUniversityAdmissions);

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