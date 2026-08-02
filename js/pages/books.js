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

      // إضافة حدث المشاركة والتحميل
      grid.querySelectorAll('.book-card').forEach(card => {
        const shareBtn = card.querySelector('.share-btn');
        const url = card.dataset.url;
        const title = card.dataset.title;

        if (shareBtn) {
          shareBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await shareFile(url, title, 'كتاب');
          });
        }

        // عند الضغط على البطاقة: نسخ الرابط وطلب الفتح يدوياً
        card.addEventListener('click', () => {
          copyAndOpenExternal(url, title);
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

// ── نسخ الرابط وطلب الفتح يدوياً في المتصفح (الحل الحاسم) ──
function copyAndOpenExternal(url, title) {
  if (!url) return;

  // 1. إنشاء نافذة منبثقة (Modal) تطلب من المستخدم الفتح يدوياً
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex;
    align-items: center; justify-content: center; z-index: 9999; padding: 20px;
  `;

  modal.innerHTML = `
    <div style="background: #1a1a1a; border-radius: 16px; padding: 24px; max-width: 400px; width: 100%; border: 1px solid rgba(255,255,255,0.08); text-align: center;">
      <div style="font-size: 48px; margin-bottom: 12px;">📥</div>
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #fff;">تحميل ${escHtml(title)}</h3>
      <p style="font-size: 14px; color: #aaa; margin-bottom: 16px; line-height: 1.6;">
        تعذر الفتح داخل التطبيق بسبب حجم الملف.<br>
        يرجى <strong>نسخ الرابط</strong> وفتحه في <strong>المتصفح الخارجي</strong> (Chrome/Safari).
      </p>
      
      <div style="background: #0a0a0a; border-radius: 10px; padding: 12px; margin-bottom: 16px; border: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: #4CAF50; word-break: break-all; text-align: left; direction: ltr;">
        ${escHtml(url)}
      </div>

      <div style="display: flex; gap: 10px;">
        <button onclick="copyUrl('${escHtml(url)}')" style="flex:1; padding: 12px; background: #4CAF50; border: none; border-radius: 10px; color: #fff; font-weight: 700; font-size: 14px; cursor: pointer;">
          📋 نسخ الرابط
        </button>
        <button onclick="this.closest('.modal-overlay').remove()" style="flex:1; padding: 12px; background: #2a2a2a; border: none; border-radius: 10px; color: #aaa; font-weight: 600; font-size: 14px; cursor: pointer;">
          إغلاق
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // إضافة دالة نسخ الرابط إلى النافذة العامة
  window.copyUrl = function(url) {
    navigator.clipboard.writeText(url).then(() => {
      toast('✅ تم نسخ الرابط! افتح المتصفح الخارجي وضعه فيه.', 'success');
    }).catch(() => {
      // طريقة بديلة للنسخ إذا فشلت clipboard
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
      toast('✅ تم نسخ الرابط! افتح المتصفح الخارجي وضعه فيه.', 'success');
    });
  };

  // إغلاق النافذة عند الضغط على الخلفية
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// ── دالة المشاركة الذكية ──
async function shareFile(url, title, type = 'ملف') {
  try {
    let fileToShare = null;
    let fileName = '';

    try {
      const response = await fetch(url, { mode: 'cors' });
      if (response.ok) {
        const blob = await response.blob();
        const ext = url.split('.').pop().split('?')[0] || 'file';
        fileName = `${title} - [ملف من المنصة التعليمية السورية].${ext}`;
        fileToShare = new File([blob], fileName, { type: blob.type });
      }
    } catch (fetchError) {
      console.warn('تعذر تحميل الملف، سيتم مشاركة الرابط بدلاً من ذلك:', fetchError.message);
      fileToShare = null;
    }

    if (fileToShare && navigator.share) {
      await navigator.share({
        title: title,
        text: `شارك هذا ${type} من المنصة التعليمية السورية`,
        files: [fileToShare]
      });
    } else {
      if (navigator.share) {
        await navigator.share({
          title: title,
          text: `📚 ${title}\n\nتمت المشاركة من المنصة التعليمية السورية\nرابط الملف: ${url}`
        });
      } else {
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