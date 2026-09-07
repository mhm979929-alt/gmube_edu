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
        <header class="simple-page-head">
          <div>
            <h1>حسابي</h1>
            <p>سجّل الدخول لمتابعة تقدمك.</p>
          </div>
        </header>
        <div class="profile-scroll profile-guest-scroll">
          <section class="simple-guest">
            <p>سجّل دخولك لحفظ نتائجك وتقدمك.</p>
            <button class="btn-primary full" onclick="navigateTo('/login')">
              <i data-feather="log-in"></i> تسجيل الدخول
            </button>
          </section>
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
      <header class="simple-page-head">
        <div>
          <h1>حسابي</h1>
          <p>ملخص نشاطك واختصاراتك.</p>
        </div>
      </header>
      <div class="profile-scroll">
        <section class="simple-profile-card" id="profile-card">
          <div class="profile-avatar-wrap" id="profile-avatar">${avatarHtml(session.name, null, 64)}</div>
          <div class="profile-info">
            <span class="profile-name">${escHtml(session.name)}</span>
            <span class="profile-role">
              ${session.type === "teacher" ? "معلم" : "طالب"}
              ${session.subject ? " · " + escHtml(session.subject) : ""}
              ${session.grade ? " · " + escHtml(session.grade) : ""}
            </span>
          </div>
        </section>

        <div class="simple-stats" id="profile-stats">
          <div><strong id="stat-videos">-</strong><span>درس</span></div>
          <div><strong id="stat-tests">-</strong><span>اختبار</span></div>
          <div><strong id="stat-views">-</strong><span>مشاهدة</span></div>
        </div>

        <div class="simple-list profile-menu">
          <button class="simple-row" type="button" onclick="navigateTo('/journeys')">
            <span class="simple-row-icon icon-purple"><i data-feather="map"></i></span>
            <span class="simple-row-copy"><strong>الرحلات التعليمية</strong><small>مسار مرتب درس ثم اختبار</small></span>
            <i data-feather="chevron-left"></i>
          </button>
          <button class="simple-row" type="button" onclick="navigateTo('/university-admissions')">
            <span class="simple-row-icon icon-orange"><i data-feather="award"></i></span>
            <span class="simple-row-copy"><strong>دليل القبول</strong><small>التخصصات حسب مجموعك</small></span>
            <i data-feather="chevron-left"></i>
          </button>
          <a class="simple-row" href="ask-book.html">
            <span class="simple-row-icon icon-green"><i data-feather="message-circle"></i></span>
            <span class="simple-row-copy"><strong>اسأل كتابك</strong><small>اسأل من داخل الكتاب</small></span>
            <i data-feather="chevron-left"></i>
          </a>
          <button class="simple-row" type="button" onclick="navigateTo('/notifications')">
            <span class="simple-row-icon icon-blue"><i data-feather="bell"></i></span>
            <span class="simple-row-copy"><strong>الإشعارات</strong><small>جديد الدروس والقنوات</small></span>
            <i data-feather="chevron-left"></i>
          </button>
          ${session.type === "teacher" && teacherDocId ? `
          <button class="simple-row" type="button" onclick="navigateTo('/channel/${teacherDocId}')">
            <span class="simple-row-icon icon-green"><i data-feather="tv"></i></span>
            <span class="simple-row-copy"><strong>قناتي</strong><small>محتواك التعليمي</small></span>
            <i data-feather="chevron-left"></i>
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
