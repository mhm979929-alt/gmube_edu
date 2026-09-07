async function renderLibrary(initialTab = "books") {
  updateBottomNav("library");
  setPageTitle("المكتبة");
  let tab = initialTab === "ministry" ? "ministry" : "books";
  let currentSubject = "الكل";
  let currentQuery = "";

  renderPage(`
    <div class="page simple-page">
      <header class="simple-page-head">
        <div>
          <h1>المكتبة</h1>
          <p>اختر نوع الكتاب ثم ابحث.</p>
        </div>
      </header>
      <div class="simple-tabs" role="tablist">
        <button class="simple-tab${tab === "books" ? " active" : ""}" data-tab="books" type="button">كتب المنصة</button>
        <button class="simple-tab${tab === "ministry" ? " active" : ""}" data-tab="ministry" type="button">وزارية</button>
      </div>
      <div class="fk-search simple-search-wrap">
        <input id="library-search" type="search" placeholder="ابحث بعنوان الكتاب..." autocomplete="off">
      </div>
      <div id="library-cats"></div>
      <div id="library-grid" class="simple-list">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  function setActiveTab() {
    document.querySelectorAll(".simple-tab").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
  }

  function renderCats() {
    const wrap = el("library-cats");
    wrap.innerHTML = categoryBarHtml(currentSubject);
    wrap.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentSubject = btn.dataset.cat;
        renderCats();
        loadItems();
      });
    });
    featherRefresh();
  }

  function bindOpen(card, meta) {
    const url = card.dataset.url;
    const title = card.dataset.title;
    const openBook = () => {
      saveLearningActivity({ type: "book", id: url || title, title, meta });
      FileKit.openBook(url, title);
    };
    card.addEventListener("click", openBook);
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBook();
      }
    });
  }

  async function loadItems() {
    const grid = el("library-grid");
    grid.innerHTML = '<div class="fk-skeleton"></div>'.repeat(4);
    try {
      const items = tab === "ministry"
        ? await getMinistryBooks(currentSubject)
        : await getBooks(currentSubject);
      const q = currentQuery.toLowerCase();
      const filtered = q
        ? items.filter(b => `${b.title || ""} ${b.subject || ""} ${b.grade || ""}`.toLowerCase().includes(q))
        : items;
      if (!filtered.length) {
        grid.innerHTML = emptyBox("لا توجد كتب", "غيّر التبويب أو كلمة البحث");
        featherRefresh();
        return;
      }
      grid.className = "simple-list";
      grid.innerHTML = filtered.map(b => `
        <button class="simple-row" type="button" data-title="${escHtml(b.title)}" data-url="${escHtml(b.url)}">
          <span class="simple-row-icon ${tab === "ministry" ? "icon-orange" : "icon-blue"}"><i data-feather="book-open"></i></span>
          <span class="simple-row-copy">
            <strong>${escHtml(b.title)}</strong>
            <small>${escHtml([b.subject, b.grade].filter(Boolean).join(" · ") || "كتاب")}</small>
          </span>
          <i data-feather="chevron-left"></i>
        </button>`).join("");
      grid.querySelectorAll(".simple-row").forEach(card => bindOpen(card, tab === "ministry" ? "كتاب وزاري" : "كتاب"));
    } catch {
      grid.innerHTML = errorBox("تعذر تحميل المكتبة", loadItems);
    }
    featherRefresh();
  }

  document.querySelectorAll(".simple-tab").forEach(btn => {
    btn.addEventListener("click", () => {
      tab = btn.dataset.tab;
      setActiveTab();
      loadItems();
    });
  });
  el("library-search")?.addEventListener("input", e => {
    currentQuery = e.target.value.trim();
    loadItems();
  });

  setActiveTab();
  renderCats();
  await loadItems();
}
