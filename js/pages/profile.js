// ── Profile Page ────────────────────────────────────────────────
function openNativeLibrary() {
  if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === "function") {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: "open-library" }));
    return;
  }
  alert("قسم كتبي متاح داخل تطبيق المنصة التعليمية السورية لعرض الكتب المحمّلة على جهازك.");
}

async function renderProfile() {
  updateBottomNav("profile");
  setPageTitle("حسابي");
  const session = Auth.get();

  if (!session) {
    renderPage(`
      <div class="page">
        <div class="inner-header">
          <i data-feather="user" style="color:#4CAF50"></i>
          <span class="inner-title">حسابي</span>
        </div>
        <div class="profile-scroll profile-guest-scroll">
          <section class="profile-guest-hero">
            <div class="guest-icon-shell"><i data-feather="user-check"></i></div>
            <span class="profile-kicker">مساحتك التعليمية</span>
            <h2 class="guest-title">أهلاً بك في المنصة التعليمية السورية</h2>
            <p class="guest-sub">سجّل دخولك لمتابعة نشاطك والاحتفاظ بتجربتك التعليمية في مكان واحد.</p>
            <button class="btn-primary full" onclick="navigateTo('/login')">
              <i data-feather="log-in"></i> تسجيل الدخول
            </button>
          </section>
          <button class="profile-library-card" onclick="openNativeLibrary()">
            <span class="profile-library-icon"><i data-feather="book-open"></i></span>
            <span class="profile-library-copy"><strong>كتبي</strong><small>افتح الكتب المحمّلة على جهازك واقرأها دون اتصال</small></span>
            <span class="profile-menu-arrow"><i data-feather="chevron-left"></i></span>
          </button>
        </div>
      </div>
    `);
    featherRefresh();
    return;
  }

  let teacherDoc = null;
  let teacherDocId = null;
  if (session.type === "teacher") {
    try {
      teacherDoc = await getTeacherByUserId(session.user_id);
      if (teacherDoc) teacherDocId = teacherDoc.$id;
    } catch {}
  }

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <i data-feather="user" style="color:#4CAF50"></i>
        <span class="inner-title">حسابي</span>
      </div>
      <div class="profile-scroll">
        <section class="profile-card-grad" id="profile-card">
          <div class="profile-avatar-wrap" id="profile-avatar">${avatarHtml(session.name, null, 72)}</div>
          <div class="profile-info">
            <span class="profile-kicker profile-kicker-light">الحساب التعليمي</span>
            <span class="profile-name">${escHtml(session.name)}</span>
            <span class="profile-role">
              ${session.type === "teacher" ? "معلم" : "طالب"}
              ${session.subject ? " · " + escHtml(session.subject) : ""}
              ${session.grade ? " · " + escHtml(session.grade) : ""}
            </span>
            ${session.role === "admin" ? `<span class="admin-badge">مشرف</span>` : ""}
          </div>
          <i data-feather="book-open" class="profile-hero-mark"></i>
        </section>

        <div class="profile-section-heading">
          <div><span>ملخص نشاطك</span><small>آخر أرقامك التعليمية</small></div>
          <i data-feather="bar-chart-2"></i>
        </div>
        <div class="stats-grid" id="profile-stats">
          <div class="stat-card"><span class="stat-value" id="stat-videos">-</span><span class="stat-label">درس</span></div>
          <div class="stat-card"><span class="stat-value" id="stat-views">-</span><span class="stat-label">مشاهدة</span></div>
          <div class="stat-card"><span class="stat-value" id="stat-tests">-</span><span class="stat-label">اختبار</span></div>
        </div>

        <div class="profile-section-heading profile-shortcuts-heading">
          <div><span>اختصاراتك</span><small>الوصول السريع إلى أدواتك</small></div>
        </div>
        <div class="menu-section profile-menu">
          <button class="profile-library-card" onclick="openNativeLibrary()">
            <span class="profile-library-icon"><i data-feather="book-open"></i></span>
            <span class="profile-library-copy"><strong>كتبي</strong><small>الكتب المحمّلة والقراءة دون اتصال</small></span>
            <span class="profile-menu-arrow"><i data-feather="chevron-left"></i></span>
          </button>
          <button class="menu-item profile-menu-item admissions-profile-link" onclick="navigateTo('/university-admissions')">
            <i data-feather="award"></i><span><strong>دليل القبول الجامعي</strong><small>اكتشف التخصصات المطابقة لمجموعك</small></span><i data-feather="chevron-left"></i>
          </button>
          <button class="menu-item profile-menu-item" onclick="navigateTo('/notifications')">
            <i data-feather="bell"></i><span><strong>الإشعارات</strong><small>تابع الجديد من القنوات والدروس</small></span><i data-feather="chevron-left"></i>
          </button>
          ${session.type === "teacher" && teacherDocId ? `
          <button class="menu-item profile-menu-item" onclick="navigateTo('/channel/${teacherDocId}')">
            <i data-feather="tv"></i><span><strong>قناتي</strong><small>إدارة محتواك التعليمي</small></span><i data-feather="chevron-left"></i>
          </button>` : ""}
        </div>

        <button class="logout-btn" id="logout-btn">
          <i data-feather="log-out"></i> تسجيل الخروج
        </button>
      </div>
    </div>
  `);
  featherRefresh();

  if (teacherDoc && teacherDoc.avatar) {
    const wrap = el("profile-avatar");
    if (wrap) wrap.innerHTML = avatarHtml(session.name, teacherDoc.avatar, 72);
  }

  if (teacherDocId) {
    getVideosByTeacher(teacherDocId).then(videos => {
      const sv = el("stat-videos"), svw = el("stat-views");
      if (sv) sv.textContent = videos.length;
      if (svw) svw.textContent = formatNumber(videos.reduce((s, v) => s + (v.views || 0), 0));
    }).catch(() => {});
  }
  getTestResults(session.user_id).then(results => {
    const st = el("stat-tests");
    if (st) st.textContent = results.length;
  }).catch(() => {});

  el("logout-btn").addEventListener("click", () => {
    confirm("هل تريد الخروج من حسابك؟", () => {
      Auth.logout();
      navigateTo("/");
    });
  });
}
