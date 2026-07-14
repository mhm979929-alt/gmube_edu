// ── Utility Functions ───────────────────────────────────────────

function el(id) { return document.getElementById(id); }
function qs(sel) { return document.querySelector(sel); }
function qsa(sel) { return document.querySelectorAll(sel); }

function html(strings, ...values) {
  return strings.reduce((result, str, i) => result + str + (values[i] !== undefined ? escHtml(values[i]) : ""), "");
}

function escHtml(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function raw(v) { return v ?? ""; }

function avatarHtml(name, avatarUrl, size = 40) {
  if (avatarUrl) {
    return `<img src="${escHtml(avatarUrl)}" class="avatar-img" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover" onerror="this.outerHTML=avatarInitial('${escHtml(name)}',${size})">`;
  }
  return avatarInitialEl(name, size);
}

function avatarInitialEl(name, size = 40) {
  const initial = (name || "?").charAt(0).toUpperCase();
  const fontSize = Math.round(size * 0.45);
  return `<div class="avatar-init" style="width:${size}px;height:${size}px;border-radius:50%;background:#4CAF50;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;color:#fff;font-weight:700;flex-shrink:0">${initial}</div>`;
}

function spinner() {
  return `<div class="spinner-wrap"><div class="spinner"></div></div>`;
}

function errorBox(msg, onRetry) {
  const id = "retry_" + Math.random().toString(36).slice(2);
  setTimeout(() => {
    const btn = el(id);
    if (btn && onRetry) btn.addEventListener("click", onRetry);
  }, 0);
  return `<div class="empty-wrap">
    <div class="empty-icon" style="background:rgba(239,68,68,0.1)">
      <i data-feather="alert-triangle" style="color:#ef4444"></i>
    </div>
    <p class="empty-text">${escHtml(msg)}</p>
    <p class="empty-sub">تحقق من اتصالك بالإنترنت</p>
    <button class="retry-btn" id="${id}"><i data-feather="refresh-cw"></i> إعادة المحاولة</button>
  </div>`;
}

function emptyBox(msg, sub = "") {
  return `<div class="empty-wrap">
    <div class="empty-icon"><i data-feather="inbox"></i></div>
    <p class="empty-text">${escHtml(msg)}</p>
    ${sub ? `<p class="empty-sub">${escHtml(sub)}</p>` : ""}
  </div>`;
}

function videoCardHtml(video) {
  const thumb = isYouTubeUrl(video.url) ? getYouTubeThumbnail(video.url) : (video.thumbnail_url || video.thumbnail || "");
  const thumbHtml = thumb
    ? `<img src="${escHtml(thumb)}" class="video-thumb-img" loading="lazy" onerror="this.parentElement.innerHTML='<div class=thumb-fallback><i data-feather=\\'play-circle\\'></i></div>'">`
    : `<div class="thumb-fallback"><i data-feather="play-circle"></i></div>`;
  return `<div class="video-card" data-id="${escHtml(video.$id)}">
    <div class="video-thumb">${thumbHtml}</div>
    <p class="video-title">${escHtml(video.title)}</p>
    <p class="video-meta">${escHtml(video.user_name || "")} · ${formatNumber(video.views || 0)} مشاهدة</p>
  </div>`;
}

function categoryBarHtml(selected, onSelect, navigateToSubject = true) {
  return `<div class="cat-bar">
    ${CATEGORIES.map(c => `<button class="cat-btn${c === selected ? " active" : ""}" data-cat="${escHtml(c)}">${escHtml(c)}</button>`).join("")}
  </div>`;
}

function gradeBarHtml(selected) {
  return `<div class="grade-bar">
    <button class="grade-btn${!selected ? " active" : ""}" data-grade="">الكل</button>
    ${GRADES.map(g => `<button class="grade-btn${g === selected ? " active" : ""}" data-grade="${escHtml(g)}">${escHtml(g)}</button>`).join("")}
  </div>`;
}

function starsHtml(value, readonly = true, max = 5) {
  let out = `<div class="stars${readonly ? "" : " stars-interactive"}" data-value="${value}">`;
  for (let i = 1; i <= max; i++) {
    out += `<span class="star${i <= value ? " filled" : ""}" data-star="${i}">★</span>`;
  }
  out += "</div>";
  return out;
}

function toast(msg, type = "info") {
  const existing = qs(".toast");
  if (existing) existing.remove();
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.classList.add("show"); }, 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 300); }, 3000);
}

function confirm(msg, onOk) {
  const modal = document.createElement("div");
  modal.className = "confirm-overlay";
  modal.innerHTML = `<div class="confirm-box">
    <p>${escHtml(msg)}</p>
    <div class="confirm-btns">
      <button class="btn-cancel">إلغاء</button>
      <button class="btn-ok">تأكيد</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.querySelector(".btn-cancel").addEventListener("click", () => modal.remove());
  modal.querySelector(".btn-ok").addEventListener("click", () => { modal.remove(); onOk(); });
}

function featherRefresh() {
  if (window.feather) feather.replace();
}

function setPageTitle(title) {
  document.title = title ? `${title} | GMube Edu` : "GMube Edu";
}
