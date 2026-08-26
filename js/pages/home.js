// ── Home Page ───────────────────────────────────────────────────
async function renderHome() {
  updateBottomNav("home");
  setPageTitle("الرئيسية");
  const session = Auth.get();

  renderPage(`
    <div class="page-home">
      <div class="top-bar">
        <div class="logo-row">
          <div class="logo-icon"><i data-feather="book-open"></i></div>
          <span class="logo-text">GMube Edu</span>
        </div>
        <div class="top-actions">
          ${session
            ? `<a href="https://live-red-zeta.vercel.app/" class="icon-btn" title="الدراسة الجماعية " style="text-decoration:none;display:inline-flex;align-items:center;justify-content:center;">
               <i data-feather="clipboard"></i>
               </a>
               <button class="icon-btn" onclick="navigateTo('/notifications')" title="الإشعارات">
                 <i data-feather="bell"></i>
               </button>
               <button class="icon-btn" onclick="navigateTo('/profile')" title="حسابي">
                 <i data-feather="user"></i>
               </button>`
            : `<button class="login-pill" onclick="navigateTo('/login')">دخول</button>`}
        </div>
      </div>

      <div class="search-bar">
        <i data-feather="search"></i>
        <input id="search-input" class="search-input" placeholder="ابحث عن درس أو أستاذ..." type="text">
      </div>

      <div id="student-dashboard"></div>
      <div id="cat-bar-wrap"></div>


      <div class="section">
        <div class="section-header">
          <span class="section-title">الأساتذة</span>
          <button class="see-all" onclick="navigateTo('/teachers')">عرض الكل</button>
        </div>
        <div id="teachers-row" class="teachers-row">${spinner()}</div>
      </div>

      <div class="section">
        <div class="section-header">
          <span class="section-title">الدروس</span>
        </div>
        <div id="videos-grid" class="videos-grid">${spinner()}</div>
      </div>
    </div>
  `);

  featherRefresh();

  let allVideos = [];
  let currentCategory = "الكل";
  let searchTerm = "";

  async function renderStudentDashboard() {
    const wrap = el("student-dashboard");
    if (!wrap) return;

    if (!session) {
      wrap.innerHTML = `
        <section class="home-guest-card">
          <div class="home-guest-icon"><i data-feather="compass"></i></div>
          <div class="home-guest-copy">
            <span class="home-dashboard-kicker">رحلتك التعليمية تبدأ هنا</span>
            <strong>تعلّم، اختبر، وتابع تقدمك</strong>
            <small>سجّل الدخول لحفظ نشاطك ونتائج اختباراتك في مكان واحد.</small>
          </div>
          <button class="home-guest-action" onclick="navigateTo('/login')">دخول</button>
        </section>`;
      featherRefresh();
      return;
    }

    wrap.innerHTML = `<section class="student-dashboard student-dashboard-loading"><div class="dashboard-loading-line"></div><div class="dashboard-loading-grid"><span></span><span></span><span></span></div></section>`;

    const activity = getLearningActivity();
    let results = [];
    let latestTest = null;
    if (session.type === "student") {
      results = await getTestResults(session.user_id).catch(() => []);
      if (results[0]?.test_id) {
        latestTest = await getTestById(results[0].test_id).catch(() => null);
      }
    }

    const firstName = String(session.name || "طالب").trim().split(/\s+/)[0] || "طالب";
    const completed = results.length;
    const isStudent = session.type === "student";
    const dashboardCopy = isStudent ? {
      testsTitle: "اختباراتي", testsMeta: completed ? `${completed} نتيجة` : "ابدأ اختباراً",
      booksTitle: "الكتب", booksMeta: "مراجعك الدراسية",
      teachersTitle: "الأساتذة", teachersMeta: "تعلّم مع الأفضل",
      progressTitle: "تقدمي", progressMeta: "تابع إنجازك",
    } : {
      testsTitle: "الاختبارات", testsMeta: "استعرض التقييمات",
      booksTitle: "الكتب", booksMeta: "المراجع الدراسية",
      teachersTitle: "الأساتذة", teachersMeta: "قنوات المنصة",
      progressTitle: "حسابي", progressMeta: "إدارة ملفك",
    };
    const best = results.reduce((max, result) => {
      const total = Number(result.total) || 0;
      const score = Number(result.score) || 0;
      return Math.max(max, total ? Math.round((score / total) * 100) : 0);
    }, 0);
    const latest = results[0];
    const activityType = activity ? learningActivityLabel(activity.type) : "";
    const activityAction = activity
      ? (activity.type === "test" ? "فتح الاختبار" : activity.type === "book" ? "فتح الكتب" : "متابعة الآن")
      : "استكشف المحتوى";
    const activityRoute = activity ? learningActivityRoute(activity) : "/tests";

    wrap.innerHTML = `
      <section class="student-dashboard">
        <div class="student-dashboard-head">
          <div>
            <span class="home-dashboard-kicker">مساحتك التعليمية</span>
            <h2>أهلاً ${escHtml(firstName)}</h2>
            <p>ماذا تريد أن تنجز اليوم؟</p>
          </div>
          <button class="dashboard-profile-btn" onclick="navigateTo('/profile')" aria-label="فتح الحساب"><i data-feather="user"></i></button>
        </div>

        <div class="dashboard-shortcuts" aria-label="اختصارات تعليمية">
          <button class="dashboard-shortcut dashboard-shortcut-tests" onclick="navigateTo('/tests')"><i data-feather="check-circle"></i><strong>${dashboardCopy.testsTitle}</strong><small>${dashboardCopy.testsMeta}</small></button>
          <button class="dashboard-shortcut dashboard-shortcut-books" onclick="navigateTo('/books')"><i data-feather="book-open"></i><strong>${dashboardCopy.booksTitle}</strong><small>${dashboardCopy.booksMeta}</small></button>
          <button class="dashboard-shortcut dashboard-shortcut-teachers" onclick="navigateTo('/teachers')"><i data-feather="users"></i><strong>${dashboardCopy.teachersTitle}</strong><small>${dashboardCopy.teachersMeta}</small></button>
          <button class="dashboard-shortcut dashboard-shortcut-profile" onclick="navigateTo('/profile')"><i data-feather="bar-chart-2"></i><strong>${dashboardCopy.progressTitle}</strong><small>${isStudent && best ? `أفضل نتيجة ${best}%` : dashboardCopy.progressMeta}</small></button>
        </div>

        <button class="dashboard-continue" onclick="navigateTo('${escHtml(activityRoute)}')">
          <span class="dashboard-continue-icon"><i data-feather="${activity ? (activity.type === "test" ? "check-square" : activity.type === "book" ? "book-open" : "play-circle") : "arrow-left-circle"}"></i></span>
          <span class="dashboard-continue-copy">
            <small>${activity ? `آخر ما فتحت · ${activityType}` : "ابدأ بخطوة بسيطة"}</small>
            <strong>${escHtml(activity ? activity.title : (latestTest?.title || "اكتشف الاختبارات والدروس"))}</strong>
            <em>${escHtml(activity?.meta || (latest ? `آخر نتيجة: ${latest.score}/${latest.total}` : "اختر محتوى يناسب مستواك"))}</em>
          </span>
          <span class="dashboard-continue-cta">${activityAction}<i data-feather="chevron-left"></i></span>
        </button>
      </section>`;
    featherRefresh();
  }

  function renderCatBar() {
    const wrap = el("cat-bar-wrap");
    if (!wrap) return;
    wrap.innerHTML = categoryBarHtml(currentCategory);
    featherRefresh();
    wrap.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const cat = btn.dataset.cat;
        if (cat === currentCategory) return;
        if (cat !== "الكل") {
          navigateTo(`/subject/${encodeURIComponent(cat)}`);
          return;
        }
        currentCategory = cat;
        renderCatBar();
        loadVideos();
      });
    });
  }

  async function loadVideos() {
    const grid = el("videos-grid");
    if (!grid) return;
    grid.innerHTML = spinner();
    try {
      allVideos = await getVideos(currentCategory);
      renderVideos();
    } catch (e) {
      grid.innerHTML = errorBox("فشل تحميل الدروس", loadVideos);
      featherRefresh();
    }
  }

  function renderVideos() {
    const grid = el("videos-grid");
    if (!grid) return;
    const q = searchTerm.toLowerCase();
    const list = q
      ? allVideos.filter(v => (v.title || "").toLowerCase().includes(q) || (v.user_name || "").toLowerCase().includes(q))
      : allVideos;
    if (!list.length) {
      grid.innerHTML = emptyBox("لا توجد دروس", "جرّب تصفية مختلفة");
      featherRefresh();
      return;
    }
    grid.innerHTML = list.map(videoCardHtml).join("");
    featherRefresh();
    grid.querySelectorAll(".video-card").forEach(card => {
      card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
    });
  }

  async function loadTeachers() {
    const row = el("teachers-row");
    if (!row) return;
    try {
      const teachers = await getTeachers();
      if (!teachers.length) { row.innerHTML = emptyBox("لا يوجد أساتذة بعد"); featherRefresh(); return; }
      row.innerHTML = teachers.slice(0, 10).map(t => `
        <div class="teacher-chip" data-id="${escHtml(t.$id)}">
          ${avatarHtml(t.name, t.avatar, 44)}
          <span class="teacher-chip-name">${escHtml(t.name)}</span>
          <span class="teacher-chip-sub">${escHtml(t.subject || "")}</span>
        </div>
      `).join("");
      featherRefresh();
      row.querySelectorAll(".teacher-chip").forEach(chip => {
        chip.addEventListener("click", () => navigateTo(`/channel/${chip.dataset.id}`));
      });
    } catch {
      row.innerHTML = "";
    }
  }

  function renderAd() {
    const section = document.createElement("div");
    section.className = "ad-section";
    section.innerHTML = `<iframe src="${AD_BANNER_URL}" class="ad-iframe" scrolling="no" frameborder="0"></iframe>`;
    const pageEl = qs(".page-home");
    if (pageEl) {
      const searchBar = pageEl.querySelector(".search-bar");
      if (searchBar) pageEl.insertBefore(section, searchBar.nextSibling);
    }
  }

  function setupSearch() {
    const input = el("search-input");
    if (!input) return;
    let debounce;
    input.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        searchTerm = input.value;
        renderVideos();
      }, 300);
    });
  }

  renderCatBar();
  await Promise.all([loadVideos(), loadTeachers(), renderStudentDashboard()]);
  renderAd();
  setupSearch();
}
