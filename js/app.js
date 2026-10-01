// ── App Bootstrap ───────────────────────────────────────────────
async function bootGMubeApp() {
  await Auth.init();

  let bridgeResumeInFlight = false;
  let bridgeUiRefreshInFlight = false;

  async function refreshVisibleAuthUi() {
    if (bridgeUiRefreshInFlight) return;
    bridgeUiRefreshInFlight = true;
    try {
      const path = (location.hash || "#/").replace(/^#/, "") || "/";
      if (path.includes("/login")) {
        navigateTo("/");
        return;
      }
      // نحدّث الصفحة الظاهرة مباشرة بعد تثبيت الجلسة، من دون إعادة تحميل التطبيق.
      // هذا مهم لأن AppCreator24 قد يعود إلى نفس hash ولا يطلق hashchange.
      if (path === "/" || path === "") {
        await renderHome();
      } else if (path === "/profile") {
        await renderProfile();
      }
    } catch (error) {
      console.warn("oauth_bridge_ui_refresh", error);
    } finally {
      bridgeUiRefreshInFlight = false;
    }
  }

  async function resumeOAuthBridgeIfNeeded() {
    if (bridgeResumeInFlight || Auth.isLoggedIn()) return;
    bridgeResumeInFlight = true;
    try {
      const session = await Auth.resumeGoogleBridge();
      if (session) {
        toast("تم تسجيل الدخول بواسطة Google", "success");
        await refreshVisibleAuthUi();
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
  // بعض إصدارات AppCreator24 لا تطلق focus/pageshow عند العودة من Chrome.
  // لذلك نراقب وجود معاملة OAuth بفحص دوري خفيف؛ لا توجد طلبات عندما لا توجد معاملة.
  setTimeout(resumeOAuthBridgeIfNeeded, 0);
  const bridgeResumeTimer = window.setInterval(() => {
    if (localStorage.getItem("gmube_oauth_bridge_tx")) {
      resumeOAuthBridgeIfNeeded();
    }
  }, 1000);
  window.addEventListener("pagehide", () => window.clearInterval(bridgeResumeTimer), { once: true });

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
  Router.add("/ministry-books", renderMinistryBooks);
  Router.add("/tests", renderTests);
  Router.add("/profile", renderProfile);
  Router.add("/login(?:\\?.*)?", renderLogin);
  Router.add("/notifications", renderNotifications);
  Router.add("/watch/([^/]+)", renderWatch);
  Router.add("/subject/([^/]+)", renderSubject);
  // تم تعديل مسار القناة ليدعم معرف الوثيقة
  Router.add("/channel/([^/]+)", renderChannel);
  Router.add("/playlist/([^/]+)", renderPlaylist);
  Router.add("/take-test/([^/?]+)(?:\\?.*)?", renderTakeTest);
  Router.add("/journeys", renderJourneys);
  Router.add("/journeys/([^/]+)", renderJourneys);
  Router.add("/journey/([^/]+)/stage/([^/]+)", renderJourneyStage);
  Router.add("/journey/([^/]+)", renderJourney);
  Router.add("/university-admissions", renderUniversityAdmissions);

  // 3. Bottom nav click handlers
  document.querySelectorAll(".nav-item").forEach(function(item) {
    item.addEventListener("click", function() {
      const page = this.dataset.page;
      const routes = { home: "/", teachers: "/teachers", books: "/books", "ministry-books": "/ministry-books", tests: "/tests", profile: "/profile" };
      if (routes[page]) navigateTo(routes[page]);
    });
  });

  // 4. Start router
  Router.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootGMubeApp, { once: true });
} else {
  bootGMubeApp();
}