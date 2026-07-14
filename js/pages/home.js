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
            ? `<button class="icon-btn" onclick="navigateTo('/notifications')" title="الإشعارات"><i data-feather="bell"></i></button>
               <button class="icon-btn" onclick="navigateTo('/profile')" title="حسابي"><i data-feather="user"></i></button>`
            : `<button class="login-pill" onclick="navigateTo('/login')">دخول</button>`}
        </div>
      </div>

      <div class="search-bar">
        <i data-feather="search"></i>
        <input id="search-input" class="search-input" placeholder="ابحث عن درس أو أستاذ..." type="text">
      </div>

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

  // Category bar
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

  // Videos
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

  // Teachers row
  async function loadTeachers() {
    const row = el("teachers-row");
    if (!row) return;
    try {
      const teachers = await getTeachers();
      if (!teachers.length) { row.innerHTML = emptyBox("لا يوجد أساتذة بعد"); featherRefresh(); return; }
      row.innerHTML = teachers.slice(0, 10).map(t => `
        <div class="teacher-chip" data-uid="${escHtml(t.user_id)}">
          ${avatarHtml(t.name, t.avatar, 44)}
          <span class="teacher-chip-name">${escHtml(t.name)}</span>
          <span class="teacher-chip-sub">${escHtml(t.subject || "")}</span>
        </div>
      `).join("");
      featherRefresh();
      row.querySelectorAll(".teacher-chip").forEach(chip => {
        chip.addEventListener("click", () => navigateTo(`/channel/${chip.dataset.uid}`));
      });
    } catch {
      row.innerHTML = "";
    }
  }

  // Ad banner
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

  // Search
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
  await Promise.all([loadVideos(), loadTeachers()]);
  renderAd();
  setupSearch();
}
