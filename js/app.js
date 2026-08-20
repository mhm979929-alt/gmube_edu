// ── App Bootstrap ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async function() {
  let deepLinkOAuth = null;
  const query = new URLSearchParams(window.location.search);
  const hashQuestion = window.location.hash.indexOf("?");
  const hashQuery = hashQuestion >= 0
    ? new URLSearchParams(window.location.hash.slice(hashQuestion + 1))
    : new URLSearchParams();
  const oauthUserId = query.get("userId") || hashQuery.get("userId");
  const oauthSecret = query.get("secret") || hashQuery.get("secret");

  if (oauthUserId && oauthSecret) {
    try {
      await account.createSession({ userId: oauthUserId, secret: oauthSecret });
      deepLinkOAuth = "success";
    } catch (error) {
      deepLinkOAuth = "failed";
      console.warn("تعذر إنشاء جلسة Google من الرابط العميق", error);
    }
    const cleanUrl = new URL(window.location.href);
    ["userId", "secret", "oauth"].forEach(key => cleanUrl.searchParams.delete(key));
    const cleanHash = cleanUrl.hash.split("?")[0];
    cleanUrl.hash = cleanHash || "#/";
    window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }

  await Auth.init();

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

  if (deepLinkOAuth === "success") {
    toast("تم تسجيل الدخول بواسطة Google", "success");
    navigateTo("/");
  } else if (deepLinkOAuth === "failed") {
    navigateTo("/login?oauth=failed");
  }
});