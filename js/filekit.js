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

  // تطبيع مصادر الملفات لتعمل داخل Android WebView.
  // Dropbox عبر www.dropbox.com يمر بتحويلات وصفحات وسيطة؛ النطاق المباشر
  // يعيد PDF مع دعم Range، وهو المسار الذي يحتاجه PDF.js للملفات الكبيرة.
  function normalize(url) {
    if (!url) return url;
    let value = String(url).trim();
    try {
      const parsed = new URL(value, window.location.href);
      if (/(^|\.)dropbox\.com$/i.test(parsed.hostname) &&
          !/dropboxusercontent\.com$/i.test(parsed.hostname)) {
        parsed.hostname = "dl.dropboxusercontent.com";
        parsed.searchParams.delete("raw");
        parsed.searchParams.set("dl", "1");
        value = parsed.toString();
      }
    } catch {}
    const drive = value.match(/drive\.google\.com\/file\/d\/([^/]+)/) ||
                  value.match(/drive\.google\.com\/open\?id=([^&]+)/);
    if (drive) return `https://drive.google.com/uc?export=download&id=${drive[1]}`;
    return value;
  }

  function isGoogleDrive(url) {
    return /(?:drive|docs)\.google\.com/i.test(String(url || ""));
  }

  function googleDriveId(url) {
    const s = String(url || "");
    const m = s.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i) ||
              s.match(/[?&]id=([^&#]+)/i);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function googleViewerUrl(url) {
    const id = googleDriveId(url);
    // رابط Drive الرسمي يعرض PDF داخل iframe ولا يحاول WebView فتح PDF الخام.
    if (id) return `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;
    // لا نستخدم docs.google.com/gview للملفات العامة؛ فهو محجوب في بعض WebViews.
    return normalize(url);
  }

  // عارض مضمّن احتياطي للمصادر التي تمنع PDF.js داخل WebView (خصوصًا Drive).
  // بالنسبة للمصادر المباشرة، نستخدم الرابط المطبع نفسه ولا نمرره إلى gview.
  function openEmbeddedViewer(url, title, options = {}) {
    const u = normalize(url);
    const downloadButton = options.allowInternalDownload === false ? "" : `<button class="pdf-icon-btn" data-act="download" aria-label="تحميل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0-0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>`;
    const wrap = document.createElement("div");
    wrap.className = "pdf-embed-overlay";
    wrap.innerHTML = `
      <div class="pdf-embed-bar">
        <button class="pdf-icon-btn" data-act="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <span class="pdf-title">${escHtml(title || "عرض PDF")}</span>
        <span class="pdf-spacer"></span>
        ${downloadButton}${options.allowExternal === false ? "" : `<button class="pdf-icon-btn" data-act="browser" aria-label="فتح خارج التطبيق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></button>`}
      </div>
      <div class="pdf-embed-status"><span class="pdf-spinner"></span><span>جارٍ تجهيز المعاينة…</span></div>
      <iframe class="pdf-embed-frame" title="${escHtml(title || "عرض PDF")}" sandbox="allow-scripts allow-same-origin allow-forms" allow="fullscreen" referrerpolicy="no-referrer"></iframe>`;
    document.body.appendChild(wrap);
    if (options.protectViewer) protectViewer(wrap);
    requestAnimationFrame(() => wrap.classList.add("open"));

    const frame = wrap.querySelector(".pdf-embed-frame");
    const status = wrap.querySelector(".pdf-embed-status");
    const close = () => {
      wrap.classList.remove("open");
      setTimeout(() => wrap.remove(), 220);
    };
    wrap.querySelector('[data-act="close"]').onclick = close;
    const browserBtn = wrap.querySelector('[data-act="browser"]');
    if (browserBtn) browserBtn.onclick = () => { close(); openExternal(u); };
    frame.addEventListener("load", () => { if (status) status.style.display = "none"; }, { once: true });
    frame.src = googleViewerUrl(u);
    setTimeout(() => {
      if (status && status.style.display !== "none") {
        status.querySelector("span:last-child").textContent = options.allowExternal === false ? "تعذر تجهيز المعاينة داخل التطبيق" : "إذا لم تظهر المعاينة، استخدم زر الفتح الخارجي";
      }
    }, 12000);
    return wrap;
  }

  // كشف نوع الملف من أول بايتات (يعمل مع Drive عبر CORS ورؤوس Range)
  async function sniffType(url) {
    try {
      const res = await fetch(url, { headers: { Range: "bytes=0-15" }, mode: "cors" });
      if (res.status !== 206 && res.status !== 200) return "";
      const bytes = new Uint8Array(await res.arrayBuffer());
      const head = bytes.slice(0, 16);
      const s = String.fromCharCode(...head);
      if (s.startsWith("%PDF")) return "pdf";
      if (head[0] === 0xFF && head[1] === 0xD8) return "jpg";
      if (s.startsWith("\x89PNG")) return "png";
      if (s.startsWith("GIF8")) return "gif";
      if (s.startsWith("OggS")) return "ogg";
      if (s.startsWith("ID3") || s.startsWith("fLaC")) return "mp3";
      if (s.startsWith("RIFF")) return "wav";
      return "";
    } catch { return ""; }
  }

  // فحص الملف: امتداد من URL أو من أول بايتات، وحجمه عبر HEAD (CORS)
  async function probe(url) {
    const u = normalize(url);
    const urlExt = ext(u);
    let size = 0;
    let type = "";
    try {
      const res = await fetch(u, { method: "HEAD", mode: "cors" });
      if (res.ok) {
        size = Number(res.headers.get("content-length")) || 0;
        type = (res.headers.get("content-type") || "").toLowerCase();
      }
    } catch {}
    let e = urlExt;
    if (!e) {
      if (type.startsWith("image/")) e = type.split("/")[1];
      else if (type.startsWith("audio/")) e = type.split("/")[1];
      else if (type.includes("pdf")) e = "pdf";
    }
    if (!e) e = await sniffType(u);
    return { type, size, ext: e };
  }

  // إنشاء رابط Android intent يطلب من الغلاف تشغيل متصفح النظام.
  // روابط wa.me تخرج عادةً لأنها تُسلَّم إلى تطبيق خارجي؛ روابط PDF العادية
  // قد يعترضها WebView، لذلك نستخدم intent مع رابط احتياطي للمتصفح.
  function systemBrowserIntent(url) {
    const raw = String(url || "").trim();
    try {
      const parsed = new URL(raw, window.location.href);
      if (!(parsed.protocol === "http:" || parsed.protocol === "https:")) return raw;
      const target = `${parsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
      return `intent://${target}#Intent;scheme=${parsed.protocol.slice(0, -1)};action=android.intent.action.VIEW;S.browser_fallback_url=${encodeURIComponent(raw)};end`;
    } catch {
      return raw;
    }
  }

  // فتح رابط خارج WebView. في مسار الكتب نستخدم Android intent، أما بقية
  // أنواع الملفات فتحافظ على سلوكها السابق.
  function openExternal(url, options = {}) {
    const raw = String(url || "").trim();
    if (!raw) return;
    const u = options.systemBrowser ? systemBrowserIntent(raw) : normalize(raw);
    const a = document.createElement("a");
    a.href = u;
    a.target = "_blank";
    a.rel = "external noopener noreferrer";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1200);
  }

  // حماية واجهة العرض فقط؛ لا تدّعي منع لقطات الشاشة أو أدوات المطوّر.
  function protectViewer(root) {
    if (!root) return;
    root.style.userSelect = "none";
    ["contextmenu", "copy", "cut", "dragstart"].forEach(type => {
      root.addEventListener(type, e => e.preventDefault());
    });
    root.addEventListener("keydown", e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (["c", "s", "u", "p"].includes(String(e.key).toLowerCase())) e.preventDefault();
    });
  }

  function fileLabel(url) {
    const e = ext(url);
    if (!e) return "ملف";
    return e.toUpperCase();
  }

  // تنزيل داخل الصفحة: لا نضع حدًا مصطنعًا لحجم Blob؛ ملفات الكتب الكبيرة
  // تُقرأ على دفعات حتى يظل المستخدم داخل WebView ولا يعود إلى عارض PDF الخام.
  function directDownloadLink(url, name) {
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.setAttribute("download", name);
    a.rel = "noopener";
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 1000);
  }

  // في تطبيق React Native الأصلي نُسلّم رابط الملف إلى طبقة التنزيل المحلية.
  // يبقى تنزيل المتصفح المعتاد هو البديل عند عدم وجود الجسر.
  function requestNativeDownload(url, title) {
    try {
      const bridge = window.ReactNativeWebView;
      if (!bridge || typeof bridge.postMessage !== "function") return false;
      const u = normalize(url);
      const name = `${(title || "file").replace(/[\\/:*?"<>|]+/g, " ").trim()}.${ext(u) || "pdf"}`;
      bridge.postMessage(JSON.stringify({
        type: "download",
        url: u,
        title: title || "كتاب دراسي",
        fileName: name
      }));
      return true;
    } catch {
      return false;
    }
  }

  function loadCoverImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("cover image unavailable"));
      image.src = src;
    });
  }

  async function canvasToPngBytes(canvas) {
    if (canvas.toBlob) {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(value => value ? resolve(value) : reject(new Error("cover render failed")), "image/png");
      });
      return new Uint8Array(await blob.arrayBuffer());
    }
    const data = atob(canvas.toDataURL("image/png").split(",")[1]);
    const bytes = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i++) bytes[i] = data.charCodeAt(i);
    return bytes;
  }

  // غلاف ثابت ومشترك لكل PDF: لا نستخدم عنوان الكتاب أو المادة أو الصف.
  // يُرسم محلياً ثم يُضمّن كصفحة أولى في نسخة التنزيل فقط.
  async function buildStaticPdfCover() {
    const canvas = document.createElement("canvas");
    canvas.width = 1240;
    canvas.height = 1754;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("cover canvas unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const icon = await loadCoverImage(new URL("assets/pdf-cover-icon.png", document.baseURI).href);
    const iconSize = 190;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(icon, (canvas.width - iconSize) / 2, 560, iconSize, iconSize);

    try { if (document.fonts?.ready) await document.fonts.ready; } catch {}
    ctx.fillStyle = "#171717";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";
    ctx.font = "700 64px Cairo, Arial, sans-serif";
    ctx.fillText("المنصة التعليمية السورية", canvas.width / 2, 850);
    return canvasToPngBytes(canvas);
  }

  function saveBlob(blob, name) {
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.setAttribute("download", name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 60000);
  }

  async function downloadPdfWithCover(url, name, setState) {
    if (!window.PDFLib?.PDFDocument) throw new Error("pdf cover library unavailable");
    setState("جارٍ تحميل PDF…");
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("pdf response unavailable");
    const sourceBytes = await res.arrayBuffer();
    setState("جارٍ تجهيز الغلاف…");
    const coverBytes = await buildStaticPdfCover();
    const sourcePdf = await window.PDFLib.PDFDocument.load(sourceBytes);
    const outputPdf = await window.PDFLib.PDFDocument.create();
    const coverPage = outputPdf.addPage([595.28, 841.89]);
    const coverImage = await outputPdf.embedPng(coverBytes);
    coverPage.drawImage(coverImage, { x: 0, y: 0, width: 595.28, height: 841.89 });
    const originalPages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    originalPages.forEach(page => outputPdf.addPage(page));
    setState("جارٍ حفظ النسخة…");
    const resultBytes = await outputPdf.save();
    saveBlob(new Blob([resultBytes], { type: "application/pdf" }), name);
  }

  async function download(url, title, btn) {
    const u = normalize(url);
    const pdfFile = isPdf(u);
    const name = `${(title || "file").replace(/[\\/:*?"<>|]+/g, " ").trim()}.${ext(u) || "pdf"}`;
    const setState = (t) => { if (btn) btn.innerHTML = t; };

    // ملفات PDF فقط تمر بمسار الغلاف. بقية الأنواع لا تتغير طريقة تنزيلها.
    if (pdfFile) {
      try {
        await downloadPdfWithCover(u, name, setState);
        setState("✅ تم الحفظ");
        if (window.toast) toast("تم تحميل PDF مع الغلاف", "success");
        return true;
      } catch (error) {
        console.warn("pdf_cover_download_failed", error?.message || error);
        setState("جارٍ بدء التحميل…");
        directDownloadLink(u, name);
        if (window.toast) toast("تعذر إضافة الغلاف؛ بدأ تحميل ملف PDF الأصلي", "info");
        setTimeout(() => setState("تحميل الملف"), 1800);
        return false;
      }
    }

    if (requestNativeDownload(u, title)) {
      setState("جارٍ التنزيل في التطبيق…");
      if (window.toast) toast("بدأ حفظ الملف في مكتبة الهاتف", "info");
      return true;
    }

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

      const blob = new Blob(chunks, { type: res.headers.get("content-type") || "application/octet-stream" });
      saveBlob(blob, name);
      setState("✅ تم الحفظ");
      if (window.toast) toast("تم تحميل الملف بنجاح", "success");
      return true;
    } catch {
      // لا نستخدم window.location؛ فهو يعيد WebView إلى رسالة معاينة PDF القديمة.
      // رابط Dropbox المطبع يحتوي dl=1، وعنصر download يسمح لمدير التحميل بالتقاطه.
      setState("جارٍ بدء التحميل…");
      directDownloadLink(u, name);
      if (window.toast) toast("بدأ تحميل الملف", "info");
      setTimeout(() => setState("تحميل الملف"), 1800);
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
  async function openViewer(url, title, options = {}) {
    const u = normalize(url);

    // بعد تطبيع Google Drive، نجرّب PDF.js مباشرة أولًا. هذا مهم داخل WebView
    // لأن Google Viewer نفسه قد لا يعمل أو قد يُمنع من العرض داخل التطبيق.
    const isDriveFile = isGoogleDrive(u);
    // روابط Drive لا تسمح عادةً بـ CORS داخل WebView؛ استخدم Preview الرسمي مباشرة.
    if (isDriveFile) return openEmbeddedViewer(u, title, options);
    const directPdf = isPdf(u);
    const info = directPdf ? { type: "application/pdf", size: 0, ext: "pdf" } : await probe(u);
    const realExt = info.ext || ext(u);
    const isPdfFile = directPdf || realExt === "pdf" || (info.type && info.type.includes("pdf"));
    const isImg = ["jpg", "jpeg", "png", "webp", "gif"].includes(realExt) ||
                  (info.type && info.type.startsWith("image/"));
    const isAud = ["mp3", "wav", "m4a", "ogg", "aac"].includes(realExt) ||
                  (info.type && info.type.startsWith("audio/"));

    // لا نرفض PDF كبيرًا قبل أن يحاول PDF.js التحميل التدريجي.
    if (isPdfFile) return PdfReader.open(u, title, options);
    if (isImg || isAud) {
      const wrap = document.createElement("div");
      wrap.className = "fk-viewer";
      const body = isImg
        ? `<div class="fk-viewer-img"><img src="${escHtml(u)}" alt="${escHtml(title || "")}"></div>`
        : `<div class="fk-viewer-audio"><div class="fk-audio-art"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg></div><audio controls autoplay src="${escHtml(u)}"></audio></div>`;

      const downloadButton = options.allowInternalDownload === false ? "" : `<button class="fk-icon-btn" data-act="dl" aria-label="تحميل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>`;
      const browserButton = options.allowExternal === false ? "" : `<button class="fk-icon-btn" data-act="browser" aria-label="فتح خارج التطبيق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></button>`;
      wrap.innerHTML = `
        <div class="fk-viewer-bar">
          <button class="fk-icon-btn" data-act="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
          <span class="fk-viewer-title">${escHtml(title || "عرض الملف")}</span>
          ${downloadButton}${browserButton}
        </div>
        <div class="fk-viewer-body">${body}</div>`;
      document.body.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add("open"));
      wrap.querySelector('[data-act="close"]').onclick = () => {
        wrap.classList.remove("open");
        setTimeout(() => wrap.remove(), 220);
      };
      const downloadBtn = wrap.querySelector('[data-act="dl"]');
      if (downloadBtn) downloadBtn.onclick = (e) => download(u, title, e.currentTarget);
      const browserBtn = wrap.querySelector('[data-act="browser"]');
      if (browserBtn) browserBtn.onclick = () => openExternal(u);
      return;
    }

    if (options.allowExternal === false) {
      closeSheet();
      if (window.toast) toast("تعذر تجهيز المعاينة داخل التطبيق", "error");
      return;
    }

    // غير معروف/مكتبي → فتح في المتصفح للأنواع الأخرى.
    closeSheet();
    if (window.toast) toast("يُفتح الملف في المتصفح", "info");
    openExternal(u);
  }

  // فتح الكتاب مباشرة في متصفح الجهاز الخارجي، من دون معاينة أو عارض داخل التطبيق.
  function openBook(url, title) {
    if (!url) { window.toast && toast("الرابط غير متوفر", "error"); return; }
    closeSheet();
    openExternal(url, { systemBrowser: true });
  }

  // ورقة الخيارات السفلية
  function open(url, title, kind = "ملف") {
    if (!url) { window.toast && toast("الرابط غير متوفر", "error"); return; }
    if (kind === "كتاب") { openBook(url, title); return; }
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
      else if (act === "browser") { closeSheet(); openExternal(u); }
      else if (act === "share") { share(u, title); }
      else if (act === "copy") { copyLink(u); }
      else if (act === "close") { closeSheet(); }
    });
  }

  return { open, openBook, openViewer, openEmbeddedViewer, download, share, copyLink, normalize, isPdf, isImage, isAudio, openExternal, protectViewer };
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

  function buildOverlay(title, options = {}) {
    const downloadButton = options.allowInternalDownload === false ? "" : `<button class="pdf-icon-btn" data-act="dl" aria-label="تحميل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></button>`;
    const browserButton = options.allowExternal === false ? "" : `<button class="pdf-icon-btn" data-act="browser" aria-label="فتح خارج التطبيق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg></button>`;
    overlay = document.createElement("div");
    overlay.className = "pdf-overlay";
    overlay.innerHTML = `
      <div class="pdf-bar">
        <button class="pdf-icon-btn" data-act="close" aria-label="إغلاق"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <span class="pdf-title">${escHtml(title || "قراءة PDF")}</span>
        <span class="pdf-spacer"></span>
        <span class="pdf-page-info">—</span>
        ${downloadButton}${browserButton}
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
    if (options.protectViewer) FileKit.protectViewer(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    canvasWrap = overlay.querySelector(".pdf-canvas-wrap");
    canvas = overlay.querySelector(".pdf-canvas");
    pageInfoEl = overlay.querySelector(".pdf-page-info");
    return overlay;
  }

  async function open(url, title, options = {}) {
    if (!isReady()) { FileKit.openEmbeddedViewer(url, title, options); return; }
    close();
    const u = FileKit.normalize(url);
    buildOverlay(title, options);
    overlay.querySelector(".pdf-title").textContent = title || "قراءة PDF";

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) return;
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "close") close();
      else if (act === "dl") FileKit.download(u, title, null);
      else if (act === "browser") FileKit.openExternal(u);
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
      const task = pdfjsLib.getDocument({
        url: u,
        // يتيح العرض التدريجي للملفات الكبيرة إذا كان المصدر يدعم Range/CORS.
        rangeChunkSize: 1024 * 1024,
        disableStream: false,
        disableAutoFetch: false,
        withCredentials: false
      });
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
      // عند فشل PDF.js بسبب CORS أو مصدر غير مباشر، نبقى داخل التطبيق عبر العارض المضمّن.
      close();
      FileKit.openEmbeddedViewer(u, title);
      if (window.toast) toast("تم تحويل الملف إلى عارض بديل داخل التطبيق", "info");
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
    const oldOverlay = overlay;
    if (!oldOverlay) return;
    oldOverlay.classList.remove("open");
    setTimeout(() => { if (oldOverlay.parentNode) oldOverlay.parentNode.removeChild(oldOverlay); }, 220);
    overlay = null; pdfDoc = null; canvas = null; canvasWrap = null;
  }

  return { open, close };
})();
