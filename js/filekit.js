// ── FileKit: فتح وتحميل الملفات (كتب، ملخصات، صوتيات) ──────────
// مصمم للعمل داخل WebView (AppCreator24) وداخل المتصفح العادي.

const FileKit = (() => {
  function ext(url) {
    try {
      const clean = String(url).split("?")[0].split("#")[0];
      const m = clean.match(/\.([a-z0-9]{2,5})$/i);
      return m ? m[1].toLowerCase() : "";
    } catch { return ""; }
  }

  function isPdf(url) { return ext(url) === "pdf"; }
  function isImage(url) { return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext(url)); }
  function isAudio(url) { return ["mp3", "wav", "m4a", "ogg", "aac"].includes(ext(url)); }
  function isOffice(url) { return ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext(url)); }

  // روابط Google Drive → رابط تحميل/عرض مباشر
  function normalize(url) {
    if (!url) return url;
    const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
                  url.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
    return url;
  }

  function viewerUrl(url) {
    const u = normalize(url);
    if (isPdf(u)) return `https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(u)}`;
    if (isOffice(u)) return `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(u)}`;
    return u;
  }

  function fileLabel(url) {
    const e = ext(url);
    if (!e) return "ملف";
    return e.toUpperCase();
  }

  // تحميل مباشر: نحاول blob (يعمل بشكل ممتاز داخل WebView) ثم روابط عادية
  async function download(url, title, btn) {
    const u = normalize(url);
    const name = `${(title || "file").replace(/[\\/:*?"<>|]+/g, " ").trim()}.${ext(u) || "pdf"}`;
    const setState = (t) => { if (btn) btn.innerHTML = t; };

    try {
      setState("جارٍ التحميل…");
      const res = await fetch(u, { mode: "cors" });
      if (!res.ok) throw new Error("bad response");
      const total = Number(res.headers.get("content-length")) || 0;
      let received = 0;
      const chunks = [];
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.length;
          if (total) setState(`جارٍ التحميل… ${Math.round((received / total) * 100)}%`);
        }
      } else {
        chunks.push(new Uint8Array(await res.arrayBuffer()));
      }

      const blob = new Blob(chunks);
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 60000);
      setState("✅ تم الحفظ");
      if (window.toast) toast("تم تحميل الملف بنجاح", "success");
      return true;
    } catch {
      // بديل: رابط تحميل مباشر يفتحه المتصفح/مدير التحميل في التطبيق
      setState("فتح التحميل…");
      const a = document.createElement("a");
      a.href = u;
      a.download = name;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (window.toast) toast("بدأ التحميل في المتصفح", "info");
      setTimeout(() => setState("تحميل الملف"), 1500);
      return false;
    }
  }

  function copyLink(url) {
    const u = normalize(url);
    const done = () => window.toast && toast("تم نسخ الرابط ✅", "success");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(u).then(done).catch(() => fallback(u, done));
    } else fallback(u, done);
  }
  function fallback(u, done) {
    const ta = document.createElement("textarea");
    ta.value = u; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch {}
    ta.remove();
  }

  async function share(url, title) {
    const u = normalize(url);
    if (navigator.share) {
      try { await navigator.share({ title: title || "ملف", url: u }); return; } catch {}
    }
    copyLink(u);
  }

  function closeSheet() {
    const s = document.querySelector(".fk-sheet-overlay");
    if (s) { s.classList.remove("open"); setTimeout(() => s.remove(), 220); }
  }

  // عارض داخلي بملء الشاشة
  function openViewer(url, title) {
    const u = normalize(url);
    if (isPdf(u)) return PdfReader.open(u, title);
    const wrap = document.createElement("div");
    wrap.className = "fk-viewer";
    const body = isImage(u)
      ? `<div class="fk-viewer-img"><img src="${escHtml(u)}" alt="${escHtml(title || "")}"></div>`
      : isAudio(u)
        ? `<div class="fk-viewer-audio"><div class="fk-audio-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div><audio controls autoplay src="${escHtml(u)}"></audio></div>`
        : `<iframe src="${escHtml(viewerUrl(u))}" allowfullscreen></iframe>`;

    wrap.innerHTML = `
      <div class="fk-viewer-bar">
        <button class="fk-icon-btn" data-act="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <span class="fk-viewer-title">${escHtml(title || "عرض الملف")}</span>
        <button class="fk-icon-btn" data-act="dl" aria-label="تحميل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
      </div>
      <div class="fk-viewer-body">${body}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));
    wrap.querySelector('[data-act="close"]').onclick = () => {
      wrap.classList.remove("open");
      setTimeout(() => wrap.remove(), 220);
    };
    wrap.querySelector('[data-act="dl"]').onclick = (e) => download(u, title, e.currentTarget);
  }

  // ورقة الخيارات السفلية
  function open(url, title, kind = "ملف") {
    if (!url) { window.toast && toast("الرابط غير متوفر", "error"); return; }
    const u = normalize(url);
    closeSheet();

    const overlay = document.createElement("div");
    overlay.className = "fk-sheet-overlay";
    overlay.innerHTML = `
      <div class="fk-sheet" role="dialog" aria-modal="true">
        <div class="fk-grabber"></div>
        <div class="fk-file-head">
          <div class="fk-file-badge">${escHtml(fileLabel(u))}</div>
          <div class="fk-file-meta">
            <strong>${escHtml(title || kind)}</strong>
            <span>${escHtml(kind)}</span>
          </div>
        </div>
        <button class="fk-action primary" data-act="view">
          <span class="fk-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></span><span>فتح داخل التطبيق</span>
        </button>
        <button class="fk-action" data-act="download">
          <span class="fk-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></span><span>تحميل الملف</span>
        </button>
        <button class="fk-action" data-act="browser">
          <span class="fk-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span><span>فتح في المتصفح</span>
        </button>
        <div class="fk-row">
          <button class="fk-action ghost" data-act="share"><span class="fk-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.6" y1="13.5" x2="15.4" y2="17.5"/><line x1="15.4" y1="6.5" x2="8.6" y2="10.5"/></svg></span><span>مشاركة</span></button>
          <button class="fk-action ghost" data-act="copy"><span class="fk-a-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span><span>نسخ الرابط</span></button>
        </div>
        <button class="fk-close" data-act="close">إغلاق</button>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeSheet();
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "view") { closeSheet(); openViewer(u, title); }
      else if (act === "download") { download(u, title, btn.querySelector("span:last-child")); }
      else if (act === "browser") { window.open(u, "_blank", "noopener"); }
      else if (act === "share") { share(u, title); }
      else if (act === "copy") { copyLink(u); }
      else if (act === "close") { closeSheet(); }
    });
  }

  return { open, openViewer, download, share, copyLink, normalize, isPdf, isImage, isAudio };
})();

// توافق مع الاستدعاءات القديمة
function copyAndOpenExternal(url, title) { FileKit.open(url, title, "كتاب"); }
async function shareFile(url, title, type = "ملف") { return FileKit.share(url, title); }

// ── PdfReader: قارئ PDF كامل داخل الموقع ───────────────────────
const PdfReader = (() => {
  let pdfDoc = null;
  let currentPage = 1;
  let scale = 1.4;
  let overlay = null;
  let canvasWrap = null;
  let canvas = null;
  let pageInfoEl = null;

  function isReady() { return typeof window.pdfjsLib !== "undefined"; }

  function buildOverlay(title) {
    overlay = document.createElement("div");
    overlay.className = "pdf-overlay";
    overlay.innerHTML = `
      <div class="pdf-bar">
        <button class="pdf-icon-btn" data-act="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <span class="pdf-title">${escHtml(title || "قراءة PDF")}</span>
        <span class="pdf-spacer"></span>
        <span class="pdf-page-info">—</span>
        <button class="pdf-icon-btn" data-act="dl" aria-label="تحميل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>
      </div>
      <div class="pdf-toolbar">
        <button class="pdf-icon-btn" data-act="zoom-out" aria-label="تصغير"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <span class="pdf-zoom-label">100%</span>
        <button class="pdf-icon-btn" data-act="zoom-in" aria-label="تكبير"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
        <span class="pdf-tool-sep"></span>
        <button class="pdf-icon-btn" data-act="prev" aria-label="السابق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
        <span class="pdf-page-counter">1 / —</span>
        <button class="pdf-icon-btn" data-act="next" aria-label="التالي"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
      <div class="pdf-status"><span class="pdf-spinner"></span><span>جارٍ تحميل الملف…</span></div>
      <div class="pdf-canvas-wrap">
        <canvas class="pdf-canvas"></canvas>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    canvasWrap = overlay.querySelector(".pdf-canvas-wrap");
    canvas = overlay.querySelector(".pdf-canvas");
    pageInfoEl = overlay.querySelector(".pdf-page-info");
    return overlay;
  }

  async function open(url, title) {
    if (!isReady()) { window.open(normalize(url), "_blank", "noopener"); return; }
    close();
    const u = normalize(url);
    buildOverlay(title);
    overlay.querySelector(".pdf-title").textContent = title || "قراءة PDF";

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return;
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "close") close();
      else if (act === "dl") download(u, title, null);
      else if (act === "zoom-in") setZoom(scale * 1.2);
      else if (act === "zoom-out") setZoom(scale / 1.2);
      else if (act === "prev") gotoPage(currentPage - 1);
      else if (act === "next") gotoPage(currentPage + 1);
    });

    canvasWrap.addEventListener("click", (e) => {
      if (e.target !== canvas && !canvas.contains(e.target)) return;
      const r = canvasWrap.getBoundingClientRect();
      if (e.clientX < r.left + r.width * 0.3) gotoPage(currentPage - 1);
      else if (e.clientX > r.left + r.width * 0.7) gotoPage(currentPage + 1);
    });

    try {
      const task = pdfjsLib.getDocument(u);
      task.onProgress = (p) => {
        if (p.total) {
          const pct = Math.round((p.loaded / p.total) * 100);
          overlay.querySelector(".pdf-status span:last-child").textContent = `جارٍ تحميل الملف… ${pct}%`;
        }
      };
      pdfDoc = await task.promise;
      currentPage = 1;
      scale = 1.4;
      overlay.querySelector(".pdf-status").style.display = "none";
      overlay.querySelector(".pdf-page-counter").textContent = `1 / ${pdfDoc.numPages}`;
      pageInfoEl.textContent = `${pdfDoc.numPages} صفحة`;
      updateZoomLabel();
      await renderPage();
    } catch (err) {
      overlay.querySelector(".pdf-status").style.display = "flex";
      overlay.querySelector(".pdf-status span:last-child").textContent = "تعذر فتح الملف";
      console.error("PDF error:", err);
    }
  }

  async function renderPage() {
    if (!pdfDoc) return;
    const page = await pdfDoc.getPage(currentPage);
    const baseViewport = page.getViewport({ scale: 1 });
    const wrapW = canvasWrap.clientWidth - 48;
    const fitScale = Math.max(0.25, Math.min(1, wrapW / baseViewport.width));
    const viewport = page.getViewport({ scale: fitScale * scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.maxWidth = "100%";
    canvas.style.height = "auto";
    canvas.style.margin = "0 auto";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  function setZoom(s) {
    scale = Math.max(0.5, Math.min(4, s));
    updateZoomLabel();
    renderPage();
  }
  function updateZoomLabel() {
    const el = overlay.querySelector(".pdf-zoom-label");
    if (el) el.textContent = Math.round(scale * 100) + "%";
  }
  function gotoPage(n) {
    if (!pdfDoc || n < 1 || n > pdfDoc.numPages || n === currentPage) return;
    currentPage = n;
    overlay.querySelector(".pdf-page-counter").textContent = `${n} / ${pdfDoc.numPages}`;
    renderPage();
    canvasWrap.scrollTop = 0;
  }
  function close() {
    if (!overlay) return;
    overlay.classList.remove("open");
    setTimeout(() => { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); }, 220);
    overlay = null; pdfDoc = null; canvas = null; canvasWrap = null;
  }

  return { open, close };
})();
