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
        <div class="book-card" data-title="${escHtml(b.title)}" data-url="${escHtml(b.url)}" style="cursor:pointer;display:flex;align-items:center;gap:12px;background:#141414;border-radius:14px;padding:14px;border:1px solid rgba(255,255,255,0.04);margin-bottom:8px">
          <div class="book-icon" style="width:48px;height:48px;border-radius:12px;background:rgba(33,150,243,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i data-feather="book-open" style="color:#2196F3;width:22px;height:22px"></i>
          </div>
          <div class="book-info" style="flex:1;text-align:right">
            <span class="book-title">${escHtml(b.title)}</span>
            <span class="book-meta">${escHtml(b.subject)} · ${escHtml(b.grade)}</span>
            ${b.description ? `<span class="book-desc">${escHtml(b.description)}</span>` : ""}
          </div>
          <button class="share-btn" style="background:rgba(255,255,255,0.05);border:none;color:#aaa;padding:8px;border-radius:8px;cursor:pointer;display:flex;align-items:center" title="مشاركة">
            <i data-feather="share-2" style="width:18px;height:18px"></i>
          </button>
        </div>
      `).join("");
      featherRefresh();

      // إضافة حدث المشاركة
      grid.querySelectorAll('.book-card').forEach(card => {
        const shareBtn = card.querySelector('.share-btn');
        const url = card.dataset.url;
        const title = card.dataset.title;

        if (shareBtn) {
          shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // منع فتح الرابط عند الضغط على زر المشاركة
            await shareFile(url, title, 'كتاب');
          });
        }

        // فتح الرابط عند الضغط على البطاقة
        card.addEventListener('click', () => {
          window.open(url, '_blank');
        });
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

// ── دالة المشاركة الذكية (تتعامل مع الأخطاء) ──
async function shareFile(url, title, type = 'ملف') {
  try {
    // محاولة جلب الملف
    let fileToShare = null;
    let fileName = '';

    try {
      const response = await fetch(url, { mode: 'cors' }); // محاولة جلب بسيط
      if (response.ok) {
        const blob = await response.blob();
        const ext = url.split('.').pop().split('?')[0] || 'file';
        fileName = `${title} - [ملف من المنصة التعليمية السورية].${ext}`;
        fileToShare = new File([blob], fileName, { type: blob.type });
      }
    } catch (fetchError) {
      // إذا فشل الجلب، نتعامل مع الرابط كنص
      console.warn('تعذر تحميل الملف، سيتم مشاركة الرابط بدلاً من ذلك:', fetchError.message);
      fileToShare = null;
    }

    // إذا نجحنا في تحميل الملف، شاركه كملف
    if (fileToShare && navigator.share) {
      await navigator.share({
        title: title,
        text: `شارك هذا ${type} من المنصة التعليمية السورية`,
        files: [fileToShare]
      });
    } 
    // إذا فشل التحميل أو المتصفح لا يدعم مشاركة الملفات، شارك الرابط كنص
    else {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `📚 ${title}\n\nتمت المشاركة من المنصة التعليمية السورية\nرابط الملف: ${url}`
        });
      } else {
        // إذا كان المتصفح لا يدعم المشاركة نهائياً، انسخ الرابط للحافظة
        await navigator.clipboard.writeText(`${title}\nرابط الملف: ${url}`);
        toast('تم نسخ الرابط للحافظة! يمكنك مشاركته الآن.', 'success');
      }
    }

  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('خطأ المشاركة:', err);
      toast('حدث خطأ أثناء المشاركة، حاول مرة أخرى.', 'error');
    }
  }
}