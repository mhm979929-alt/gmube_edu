// ── Books Page ──────────────────────────────────────────────────
async function renderBooks() {
  updateBottomNav("books");
  setPageTitle("الكتب");

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <i data-feather="book" style="color:#4CAF50"></i>
        <span class="inner-title">الكتب</span>
      </div>
      <div id="books-cat-bar"></div>
      <div id="books-grade-bar" class="grade-bar-wrap"></div>
      <div id="books-grid" class="books-grid">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let currentSubject = "الكل";
  let currentGrade = "";

  function renderCatBar() {
    const wrap = el("books-cat-bar");
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
    const wrap = el("books-grade-bar");
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
    const grid = el("books-grid");
    if (!grid) return;
    grid.innerHTML = spinner();
    try {
      const books = await getBooks(currentSubject, currentGrade || undefined);
      if (!books.length) {
        grid.innerHTML = emptyBox("لا توجد كتب", "جرّب تصفية مختلفة");
        featherRefresh();
        return;
      }
      grid.innerHTML = books.map(b => `
        <div class="book-card" data-url="${escHtml(b.url)}">
          <div class="book-icon"><i data-feather="book-open"></i></div>
          <div class="book-info">
            <span class="book-title">${escHtml(b.title)}</span>
            <span class="book-meta">${escHtml(b.subject)} · ${escHtml(b.grade)}</span>
            ${b.description ? `<span class="book-desc">${escHtml(b.description)}</span>` : ""}
          </div>
          <div class="book-open-btn"><i data-feather="external-link"></i></div>
        </div>
      `).join("");
      featherRefresh();
      grid.querySelectorAll(".book-card").forEach(card => {
        card.addEventListener("click", () => window.open(card.dataset.url, "_blank"));
      });
    } catch {
      grid.innerHTML = errorBox("فشل تحميل الكتب", loadBooks);
      featherRefresh();
    }
  }

  renderCatBar();
  renderGradeBar();
  await loadBooks();
}
