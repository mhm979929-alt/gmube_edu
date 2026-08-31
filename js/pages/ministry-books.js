// ── Ministry Books Page (الكتب الوزارية) ────────────────────────
async function renderMinistryBooks() {
  updateBottomNav("ministry-books");
  setPageTitle("الكتب الوزارية");

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <i data-feather="archive" style="color:#FF9800"></i>
        <span class="inner-title">الكتب الوزارية</span>
      </div>
      <div class="fk-search"><input id="mb-search" type="search" placeholder="ابحث عن كتاب وزاري…" autocomplete="off"></div>
      <div id="mb-cat-bar"></div>
      <div id="mb-grade-bar" class="grade-bar-wrap"></div>
      <div id="mb-grid" class="ministry-books-grid">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let currentSubject = "الكل";
  let currentGrade = "";
  let currentQuery = "";
  const searchInput = el("mb-search");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentQuery = searchInput.value.trim();
      loadBooks();
    });
  }

  function renderCatBar() {
    const wrap = el("mb-cat-bar");
    if (!wrap) return;
    wrap.innerHTML = categoryBarHtml(currentSubject);
    featherRefresh();
    wrap.querySelectorAll(".cat-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentSubject = btn.dataset.cat;
        renderCatBar();
        renderGradeBar();
        loadBooks();
      });
    });
  }

  function renderGradeBar() {
    const wrap = el("mb-grade-bar");
    if (!wrap) return;
    wrap.innerHTML = `<div class="grade-label">الصف:</div>` + gradeBarHtml(currentGrade);
    featherRefresh();
    wrap.querySelectorAll(".grade-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        currentGrade = btn.dataset.grade;
        renderGradeBar();
        loadBooks();
      });
    });
  }

  async function loadBooks() {
    const grid = el("mb-grid");
    if (!grid) return;
    grid.innerHTML = '<div class="fk-skeleton"></div>'.repeat(5);
    try {
      let books = await getMinistryBooks(currentSubject, currentGrade || undefined);
      if (currentQuery) {
        const q = currentQuery.toLowerCase();
        books = books.filter(b => `${b.title || ""} ${b.subject || ""} ${b.description || ""}`.toLowerCase().includes(q));
      }
      if (!books.length) {
        grid.innerHTML = emptyBox("لا توجد كتب وزارية", currentQuery ? "جرّب كلمة بحث أخرى" : "جرّب تصفية مختلفة");
        featherRefresh();
        return;
      }
      grid.innerHTML = books.map(b => {
        const thumb = normalizeVideoThumbnailUrl(b.thumbnail || "");
        const thumbHtml = thumb
          ? `<img src="${escHtml(thumb)}" class="ministry-book-thumb-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=ministry-book-thumb-fallback><i data-feather=\\'book-open\\'></i></div>'">`
          : `<div class="ministry-book-thumb-fallback"><i data-feather="book-open"></i></div>`;
        return `
          <div class="ministry-book-card" data-title="${escHtml(b.title)}" data-url="${escHtml(b.url)}" role="button" tabindex="0" aria-label="مشاهدة ${escHtml(b.title)}">
            <div class="ministry-book-thumb">${thumbHtml}</div>
            <p class="ministry-book-title">${escHtml(b.title)}</p>
            <p class="ministry-book-meta">${escHtml(b.subject || "كتاب")}${b.grade ? ` · ${escHtml(b.grade)}` : ""}</p>
          </div>`;
      }).join("");
      featherRefresh();

      grid.querySelectorAll('.ministry-book-card').forEach(card => {
        const url = card.dataset.url;
        const title = card.dataset.title;
        const openBook = () => {
          saveLearningActivity({ type: "book", id: url || title, title, meta: "كتاب وزاري" });
          FileKit.openBook(url, title);
        };
        card.addEventListener('click', openBook);
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openBook();
          }
        });
      });
    } catch {
      grid.innerHTML = errorBox("فشل تحميل الكتب الوزارية", loadBooks);
      featherRefresh();
    }
  }

  renderCatBar();
  renderGradeBar();
  await loadBooks();
}
