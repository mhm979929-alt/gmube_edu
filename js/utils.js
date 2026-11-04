// ── Utility Functions ───────────────────────────────────────────
function el(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

function escHtml(v) {
  if (v === null || v === undefined) return "";
  return String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function avatarHtml(name, avatarUrl, size = 40) {
  if (avatarUrl) {
    // القيم تُمرَّر عبر data-* ولا تُحقن داخل سلسلة JS، ما يمنع كسر السمة (XSS)
    return `<img src="${escHtml(avatarUrl)}" alt="${escHtml(name || '')}" class="avatar-img" data-fallback-name="${escHtml(name || '')}" data-fallback-size="${size}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" onerror="this.replaceWith(avatarInitialEl(this.dataset.fallbackName, Number(this.dataset.fallbackSize)))">`;
  }
  return avatarInitialEl(name, size);
}
function avatarInitialEl(name, size = 40) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.42);
  // تدرّج ثابت مشتق من الاسم: يعطي كل أستاذ لوناً مميزاً بلا عشوائية
  const palettes = [
    ["#10B981", "#34D399"],
    ["#0EA5E9", "#38BDF8"],
    ["#8B5CF6", "#A78BFA"],
    ["#F59E0B", "#FBBF24"],
    ["#EC4899", "#F472B6"],
    ["#14B8A6", "#2DD4BF"],
  ];
  let hash = 0;
  for (let i = 0; i < String(name || "").length; i++) hash = (hash * 31 + String(name).charCodeAt(i)) >>> 0;
  const [c1, c2] = palettes[hash % palettes.length];
  return `<div class="avatar-init" style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(140deg,${c1},${c2});display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;color:#04150F;font-weight:800;flex-shrink:0;letter-spacing:-0.5px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.28)">${escHtml(initial)}</div>`;
}

function spinner() { return `<div class="spinner-wrap"><div class="spinner"></div></div>`; }

function errorBox(msg, onRetry) {
  const id = "retry_" + Math.random().toString(36).slice(2);
  setTimeout(() => { const btn = el(id); if (btn && onRetry) btn.addEventListener("click", onRetry); }, 0);
  return `<div class="empty-wrap"><div class="empty-icon" style="background:rgba(239,68,68,0.1)"><i data-feather="alert-triangle" style="color:#ef4444"></i></div><p class="empty-text">${escHtml(msg)}</p><p class="empty-sub">تحقق من اتصالك بالإنترنت</p><button class="retry-btn" id="${id}"><i data-feather="refresh-cw"></i> إعادة المحاولة</button></div>`;
}
function emptyBox(msg, sub = "") {
  return `<div class="empty-wrap"><div class="empty-icon"><i data-feather="inbox"></i></div><p class="empty-text">${escHtml(msg)}</p>${sub ? `<p class="empty-sub">${escHtml(sub)}</p>` : ""}</div>`;
}

function normalizeVideoThumbnailUrl(value) {
  if (!value) return "";
  try {
    const parsed = new URL(String(value), window.location.href);
    if (parsed.pathname.includes("/storage/buckets/video_thumbnails/files/") && typeof APPWRITE_PROJECT_ID !== "undefined" && APPWRITE_PROJECT_ID) {
      parsed.searchParams.set("project", APPWRITE_PROJECT_ID);
    }
    return parsed.href;
  } catch {
    return String(value);
  }
}

function videoCardHtml(video) {
  const thumb = normalizeVideoThumbnailUrl(video.thumbnail || video.thumbnail_url || (isYouTubeUrl(video.url) ? getYouTubeThumbnail(video.url) : ""));
  // الأيقونة الاحتياطية موجودة دائماً تحت الصورة؛ إن فشل التحميل تُحذف الصورة وتظهر هي
  const imgHtml = thumb ? `<img src="${escHtml(thumb)}" class="video-thumb-img" loading="lazy" alt="" onerror="this.remove()">` : "";
  return `<div class="video-card" data-id="${escHtml(video.$id)}"><div class="video-thumb"><div class="thumb-fallback"><i data-feather="play-circle"></i></div>${imgHtml}</div><p class="video-title">${escHtml(video.title)}</p><p class="video-meta">${escHtml(video.user_name || "")} · ${formatNumber(video.views || 0)} مشاهدة</p></div>`;
}

function simpleLessonRow(video) {
  const thumb = normalizeVideoThumbnailUrl(video.thumbnail || video.thumbnail_url || (isYouTubeUrl(video.url) ? getYouTubeThumbnail(video.url) : ""));
  const thumbHtml = thumb
    ? `<img src="${escHtml(thumb)}" alt="" loading="lazy">`
    : `<i data-feather="play-circle"></i>`;
  return `<button class="simple-row" type="button" data-id="${escHtml(video.$id)}">
    <span class="simple-row-thumb">${thumbHtml}</span>
    <span class="simple-row-copy">
      <strong>${escHtml(video.title || "درس")}</strong>
      <small>${escHtml(video.user_name || video.category || "درس")}</small>
    </span>
    <i data-feather="chevron-left"></i>
  </button>`;
}

function categoryBarHtml(selected) {
  return `<div class="cat-bar">${CATEGORIES.map(c => `<button class="cat-btn${c === selected ? " active" : ""}" data-cat="${escHtml(c)}">${escHtml(c)}</button>`).join("")}</div>`;
}

function gradeBarHtml(selected) {
  return `<div class="grade-bar"><button class="grade-btn${!selected ? " active" : ""}" data-grade="">الكل</button>${GRADES.map(g => `<button class="grade-btn${g === selected ? " active" : ""}" data-grade="${escHtml(g)}">${escHtml(g)}</button>`).join("")}</div>`;
}

function starsHtml(value, readonly = true, max = 5) {
  let out = `<div class="stars${readonly ? "" : " stars-interactive"}" data-value="${value}">`;
  for (let i = 1; i <= max; i++) { out += `<span class="star${i <= value ? " filled" : ""}" data-star="${i}">★</span>`; }
  out += "</div>"; return out;
}

function toast(msg, type = "info") {
  const existing = qs(".toast"); if (existing) existing.remove();
  const t = document.createElement("div"); t.className = `toast toast-${type}`; t.textContent = msg;
  document.body.appendChild(t); setTimeout(() => { t.classList.add("show"); }, 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3000);
}

function confirm(msg, onOk) {
  const modal = document.createElement("div"); modal.className = "confirm-overlay";
  modal.innerHTML = `<div class="confirm-box"><p>${escHtml(msg)}</p><div class="confirm-btns"><button class="btn-cancel">إلغاء</button><button class="btn-ok">تأكيد</button></div></div>`;
  document.body.appendChild(modal);
  modal.querySelector(".btn-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector(".btn-ok").addEventListener("click", () => { modal.remove(); onOk(); });
}

function featherRefresh() { if (window.feather) feather.replace(); }
function setPageTitle(title) { document.title = title ? `${title} | المنصة التعليمية السورية` : "المنصة التعليمية السورية"; }

// ── Student learning continuity (local only; no new Appwrite fields) ──
const LEARNING_ACTIVITY_KEY = "gmube_last_learning_activity";
function learningActivityStorageKey() {
  const userId = window.Auth?.get?.()?.user_id || window.getCurrentUserId?.() || "guest";
  return `${LEARNING_ACTIVITY_KEY}_${userId}`;
}
function saveLearningActivity(activity) {
  if (!activity || !activity.id) return;
  try {
    localStorage.setItem(learningActivityStorageKey(), JSON.stringify({
      type: activity.type || "content",
      id: String(activity.id),
      title: String(activity.title || "محتوى تعليمي"),
      meta: String(activity.meta || ""),
      updatedAt: Date.now(),
    }));
  } catch {}
}
function getLearningActivity() {
  try {
    const raw = localStorage.getItem(learningActivityStorageKey());
    if (!raw) return null;
    const activity = JSON.parse(raw);
    return activity && activity.id ? activity : null;
  } catch { return null; }
}
function learningActivityLabel(type) {
  return ({ video: "فيديو", book: "كتاب", test: "اختبار", summary: "ملخص", audio: "صوتيات" })[type] || "محتوى";
}
function learningActivityRoute(activity) {
  if (!activity) return "/";
  const routes = { video: "/watch/", book: "/books", test: "/take-test/", summary: "/", audio: "/" };
  const prefix = routes[activity.type] || "/";
  return prefix.endsWith("/") && activity.type !== "book" ? prefix + encodeURIComponent(activity.id) : prefix;
}


// ── دالة عرض نوع القائمة (تم تعديلها للعربية ودعم "صور") ──
function getPlaylistTypeLabel(type) {
  const map = {
    video: 'فيديو',
    book: 'كتاب',
    audio: 'صوتيات',
    summary: 'ملخص',
    test: 'اختبار',
    photo: 'صور' // ✅ تمت إضافة هذا السطر
  };
  return map[type] || type;
}