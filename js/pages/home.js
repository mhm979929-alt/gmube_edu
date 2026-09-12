async function renderHome() {
  updateBottomNav("home");
  setPageTitle("الرئيسية");
  const session = Auth.get();
  const firstName = String(session?.name || "").trim().split(/\s+/)[0] || "طالب";
  const activity = getLearningActivity();

  renderPage(`
    <div class="page-home simple-home">
      <header class="simple-top">
        <div class="simple-brand">
          <span class="simple-logo">م</span>
          <div>
            <strong>المنصة التعليمية السورية</strong>
            <small>${session ? `أهلاً ${escHtml(firstName)}` : "ادرس بسهولة"}</small>
          </div>
        </div>
        ${session
          ? `<button class="simple-icon-btn" onclick="navigateTo('/profile')" aria-label="حسابي"><i data-feather="user"></i></button>`
          : `<button class="simple-login" onclick="navigateTo('/login')">دخول</button>`}
      </header>

      <button class="simple-continue" type="button" id="home-continue">
        <span class="simple-continue-icon"><i data-feather="${activity ? (activity.type === "test" ? "check-square" : activity.type === "book" ? "book-open" : "play-circle") : "compass"}"></i></span>
        <span>
          <small>${activity ? "أكمل من حيث توقفت" : "ابدأ من هنا"}</small>
          <strong>${escHtml(activity ? activity.title : "تصفح الدروس والكتب")}</strong>
        </span>
        <i data-feather="chevron-left"></i>
      </button>

      <section class="teacher-status-section" aria-label="حالات الأستاذة">
        <div class="simple-section-head">
          <h2>حالات الأستاذة</h2>
          <button type="button" data-go="/teachers">الكل</button>
        </div>
        <div id="home-teacher-statuses" class="teacher-status-row"><span class="teacher-status-loading"></span><span class="teacher-status-loading"></span><span class="teacher-status-loading"></span></div>
      </section>

      <section class="simple-steps" aria-label="ماذا تريد؟">
        <button class="simple-step" type="button" data-go="/learn">
          <span class="step-num">1</span>
          <i data-feather="play-circle"></i>
          <strong>أدرس</strong>
          <small>دروس ومواد</small>
        </button>
        <button class="simple-step" type="button" data-go="/library">
          <span class="step-num">2</span>
          <i data-feather="book-open"></i>
          <strong>اقرأ</strong>
          <small>كتب ووزارية</small>
        </button>
        <button class="simple-step" type="button" data-go="/tests">
          <span class="step-num">3</span>
          <i data-feather="check-square"></i>
          <strong>اختبر</strong>
          <small>قيّم نفسك</small>
        </button>
      </section>

      <section class="simple-section">
        <div class="simple-section-head">
          <h2>المواد</h2>
        </div>
        <div id="home-subjects" class="simple-chips">${spinner()}</div>
      </section>

      <section class="simple-section">
        <div class="simple-section-head">
          <h2>دروس جديدة</h2>
          <button type="button" data-go="/learn">الكل</button>
        </div>
        <div id="home-videos" class="simple-list">${spinner()}</div>
      </section>
    </div>
  `);
  featherRefresh();

  document.querySelectorAll("[data-go]").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.go));
  });
  el("home-continue")?.addEventListener("click", () => {
    navigateTo(activity ? learningActivityRoute(activity) : "/learn");
  });

  const statusRow = el("home-teacher-statuses");
  try {
    const statuses = await getTeacherStatuses();
    const unique = [];
    const seen = new Set();
    for (const item of statuses) {
      const teacherKey = item.teacher_id || item.teacher_name || item.$id;
      if (seen.has(teacherKey)) continue;
      seen.add(teacherKey);
      unique.push(item);
    }
    statusRow.innerHTML = unique.length
      ? unique.slice(0, 12).map(item => {
          const label = item.teacher_name || "أستاذة";
          const avatar = item.teacher_avatar || "";
          return `<button class="teacher-status-item" type="button" data-status-url="${escHtml(item.url)}" data-status-title="${escHtml(item.title || label)}" aria-label="حالة ${escHtml(label)}">
            <span class="teacher-status-ring"><span class="teacher-status-avatar">${avatar ? `<img src="${escHtml(avatar)}" alt="${escHtml(label)}" loading="lazy" decoding="async">` : `<span>${escHtml(label.slice(0, 1))}</span>`}</span></span>
            <span class="teacher-status-name">${escHtml(label)}</span>
          </button>`;
        }).join("")
      : `<div class="teacher-status-empty">ستظهر حالات الأستاذة هنا</div>`;
    statusRow.querySelectorAll("[data-status-url]").forEach(btn => btn.addEventListener("click", () => {
      const url = btn.dataset.statusUrl;
      if (!url) return;
      if (typeof FileKit !== "undefined" && FileKit.openViewer && (FileKit.isImage(url) || FileKit.isPdf(url) || FileKit.isAudio(url) || FileKit.isVideo(url))) FileKit.openViewer(url, btn.dataset.statusTitle || "حالة الأستاذة", { allowExternal: true });
      else window.open(url, "_blank", "noopener,noreferrer");
    }));
  } catch {
    statusRow.innerHTML = `<div class="teacher-status-empty">لا توجد حالات حالياً</div>`;
  }
  featherRefresh();

  const chips = el("home-subjects");
  const subjects = (CATEGORIES || []).filter(name => name && name !== "الكل").slice(0, 8);
  chips.innerHTML = subjects.length
    ? subjects.map(name => `<button class="simple-chip" type="button" data-subject="${escHtml(name)}">${escHtml(name)}</button>`).join("")
    : `<button class="simple-chip" type="button" data-go="/learn">كل المواد</button>`;
  chips.querySelectorAll("[data-subject]").forEach(btn => {
    btn.addEventListener("click", () => navigateTo(`/subject/${encodeURIComponent(btn.dataset.subject)}`));
  });

  const list = el("home-videos");
  try {
    const videos = await getVideos();
    const items = (videos || []).slice(0, 5);
    if (!items.length) {
      list.innerHTML = emptyBox("لا توجد دروس بعد", "ستظهر هنا عند إضافتها");
    } else {
      list.innerHTML = items.map(simpleLessonRow).join("");
      list.querySelectorAll("[data-id]").forEach(row => {
        row.addEventListener("click", () => navigateTo(`/watch/${row.dataset.id}`));
      });
    }
  } catch {
    list.innerHTML = errorBox("تعذر تحميل الدروس", renderHome);
  }
  featherRefresh();
}
