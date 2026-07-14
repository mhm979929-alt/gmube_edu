// ── Teachers Page ───────────────────────────────────────────────
async function renderTeachers() {
  updateBottomNav("teachers");
  setPageTitle("الأساتذة");

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <i data-feather="users" style="color:#4CAF50"></i>
        <span class="inner-title">الأساتذة</span>
      </div>
      <div class="search-bar">
        <i data-feather="search"></i>
        <input id="teacher-search" class="search-input" placeholder="ابحث عن أستاذ..." type="text">
      </div>
      <div id="teachers-list" class="teachers-list">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let allTeachers = [];

  function renderList(query = "") {
    const list = el("teachers-list");
    if (!list) return;
    const q = query.toLowerCase();
    const filtered = q
      ? allTeachers.filter(t => (t.name || "").toLowerCase().includes(q) || (t.subject || "").toLowerCase().includes(q))
      : allTeachers;
    if (!filtered.length) {
      list.innerHTML = emptyBox("لا يوجد أساتذة", "جرّب بحثاً مختلفاً");
      featherRefresh();
      return;
    }
    list.innerHTML = filtered.map(t => `
      <div class="teacher-card" data-uid="${escHtml(t.user_id)}">
        ${avatarHtml(t.name, t.avatar, 52)}
        <div class="teacher-info">
          <span class="teacher-name">${escHtml(t.name)}</span>
          <span class="teacher-subject">${escHtml(t.subject || "")}</span>
        </div>
        <i data-feather="chevron-left" class="chevron"></i>
      </div>
    `).join("");
    featherRefresh();
    list.querySelectorAll(".teacher-card").forEach(card => {
      card.addEventListener("click", () => navigateTo(`/channel/${card.dataset.uid}`));
    });
  }

  try {
    allTeachers = await getTeachers();
    renderList();
  } catch {
    el("teachers-list").innerHTML = errorBox("فشل تحميل الأساتذة", () => renderTeachers());
    featherRefresh();
    return;
  }

  const searchInput = el("teacher-search");
  if (searchInput) {
    let debounce;
    searchInput.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => renderList(searchInput.value), 250);
    });
  }
}
