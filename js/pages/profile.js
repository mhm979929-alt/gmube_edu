// ── Profile Page ────────────────────────────────────────────────
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
        <div class="guest-wrap">
          <div class="guest-card">
            <i data-feather="user" class="guest-icon"></i>
            <h2 class="guest-title">مرحباً بك في GMube Edu</h2>
            <p class="guest-sub">سجّل دخولك للوصول إلى حسابك</p>
            <button class="btn-primary" onclick="navigateTo('/login')">
              <i data-feather="log-in"></i> تسجيل الدخول
            </button>
          </div>
        </div>
      </div>
    `);
    featherRefresh();
    return;
  }

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <i data-feather="user" style="color:#4CAF50"></i>
        <span class="inner-title">حسابي</span>
      </div>
      <div class="profile-scroll">
        <div class="profile-card-grad" id="profile-card">
          <div class="profile-avatar-wrap" id="profile-avatar">${avatarHtml(session.name, null, 72)}</div>
          <div class="profile-info">
            <span class="profile-name">${escHtml(session.name)}</span>
            <span class="profile-role">
              ${session.type === "teacher" ? "معلم" : "طالب"}
              ${session.subject ? " · " + escHtml(session.subject) : ""}
              ${session.grade ? " · " + escHtml(session.grade) : ""}
            </span>
            ${session.role === "admin" ? `<span class="admin-badge">مشرف</span>` : ""}
          </div>
        </div>

        <div class="stats-grid" id="profile-stats">
          <div class="stat-card"><span class="stat-value" id="stat-videos">-</span><span class="stat-label">درس</span></div>
          <div class="stat-card"><span class="stat-value" id="stat-views">-</span><span class="stat-label">مشاهدة</span></div>
          <div class="stat-card"><span class="stat-value" id="stat-tests">-</span><span class="stat-label">اختبار</span></div>
        </div>

        <div class="menu-section">
          <button class="menu-item" onclick="navigateTo('/notifications')">
            <i data-feather="bell"></i><span>الإشعارات</span><i data-feather="chevron-left"></i>
          </button>
          ${session.type === "teacher" ? `
          <button class="menu-item" onclick="navigateTo('/channel/${session.user_id}')">
            <i data-feather="tv"></i><span>قناتي</span><i data-feather="chevron-left"></i>
          </button>` : ""}
        </div>

        <button class="logout-btn" id="logout-btn">
          <i data-feather="log-out"></i> تسجيل الخروج
        </button>
      </div>
    </div>
  `);
  featherRefresh();

  // Load avatar for teacher
  if (session.type === "teacher") {
    getTeacherByUserId(session.user_id).then(t => {
      if (t && t.avatar) {
        const wrap = el("profile-avatar");
        if (wrap) wrap.innerHTML = avatarHtml(session.name, t.avatar, 72);
      }
    }).catch(() => {});
  }

  // Load stats
  if (session.type === "teacher") {
    getVideosByTeacher(session.user_id).then(videos => {
      const sv = el("stat-videos"), svw = el("stat-views");
      if (sv) sv.textContent = videos.length;
      if (svw) svw.textContent = formatNumber(videos.reduce((s, v) => s + (v.views || 0), 0));
    }).catch(() => {});
  }
  getTestResults(session.user_id).then(results => {
    const st = el("stat-tests");
    if (st) st.textContent = results.length;
  }).catch(() => {});

  // Logout
  el("logout-btn").addEventListener("click", () => {
    confirm("هل تريد الخروج من حسابك؟", () => {
      Auth.logout();
      navigateTo("/");
    });
  });
}
