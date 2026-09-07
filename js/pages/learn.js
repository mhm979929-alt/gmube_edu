async function renderLearn() {
  updateBottomNav("learn");
  setPageTitle("الدروس");
  const subjects = (CATEGORIES || []).filter(name => name && name !== "الكل");

  renderPage(`
    <div class="page simple-page">
      <header class="simple-page-head">
        <div>
          <h1>الدروس</h1>
          <p>اختر مادتك أولاً.</p>
        </div>
      </header>
      <div class="search-bar simple-search">
        <i data-feather="search"></i>
        <input id="learn-search" class="search-input" placeholder="ابحث عن مادة..." type="search">
      </div>
      <div id="learn-subjects" class="simple-subjects"></div>
      <section class="simple-section">
        <div class="simple-section-head">
          <h2>أساتذة</h2>
          <button type="button" onclick="navigateTo('/teachers')">الكل</button>
        </div>
        <div id="learn-teachers" class="teachers-row">${spinner()}</div>
      </section>
    </div>
  `);
  featherRefresh();

  function renderSubjects(query = "") {
    const wrap = el("learn-subjects");
    const q = query.trim();
    const list = subjects.filter(name => !q || name.includes(q));
    wrap.innerHTML = list.length
      ? list.map(name => `
          <button class="simple-subject" type="button" data-subject="${escHtml(name)}">
            <span>${escHtml(name)}</span>
            <i data-feather="chevron-left"></i>
          </button>`).join("")
      : emptyBox("لا توجد مادة بهذا الاسم");
    wrap.querySelectorAll(".simple-subject").forEach(btn => {
      btn.addEventListener("click", () => navigateTo(`/subject/${encodeURIComponent(btn.dataset.subject)}`));
    });
    featherRefresh();
  }

  renderSubjects();
  const search = el("learn-search");
  let debounce;
  search?.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => renderSubjects(search.value), 160);
  });

  try {
    const teachers = await getTeachers();
    const row = el("learn-teachers");
    row.innerHTML = (teachers || []).slice(0, 10).map(t => `
      <div class="teacher-chip" data-id="${escHtml(t.$id)}">
        ${avatarHtml(t.name, t.avatar, 48)}
        <span class="teacher-chip-name">${escHtml(t.name)}</span>
        <span class="teacher-chip-sub">${escHtml(t.subject || "")}</span>
      </div>`).join("") || emptyBox("لا يوجد أساتذة");
    row.querySelectorAll(".teacher-chip").forEach(chip => {
      chip.addEventListener("click", () => navigateTo(`/channel/${chip.dataset.id}`));
    });
  } catch {
    const row = el("learn-teachers");
    if (row) row.innerHTML = "";
  }
  featherRefresh();
}
