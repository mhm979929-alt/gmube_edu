// ── Subject Page ────────────────────────────────────────────────
async function renderSubject(subjectEncoded) {
  const subject = decodeURIComponent(subjectEncoded || "");
  setPageTitle(subject);

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <span class="inner-title">${escHtml(subject)}</span>
      </div>
      <div id="subject-stats" class="subject-stats">${spinner()}</div>
      <div class="subject-tabs" id="subject-tabs">
        <button class="stab active" data-tab="lessons">الدروس</button>
        <button class="stab" data-tab="books">الكتب</button>
        <button class="stab" data-tab="summaries">الملخصات</button>
        <button class="stab" data-tab="audios">الصوتيات</button>
        <button class="stab" data-tab="photos">الصور</button>
        <button class="stab" data-tab="tests">الاختبارات</button>
      </div>
      <div id="subject-content" class="subject-content">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let data = { videos: [], books: [], summaries: [], audios: [], photos: [], tests: [] };
  let currentTab = "lessons";

  try {
    [data.videos, data.books, data.summaries, data.audios, data.photos, data.tests] = await Promise.all([
      getVideos(subject).catch(() => []),
      getBooks(subject).catch(() => []),
      getSummaries(subject).catch(() => []),
      getAudios(subject).catch(() => []),
      getPhotos(subject).catch(() => []),
      getTests(subject).catch(() => []),
    ]);
  } catch {}

  // Render stats
  const statsEl = el("subject-stats");
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="subj-stat"><i data-feather="video" style="color:#4CAF50"></i><span>${data.videos.length} درس</span></div>
      <div class="subj-stat"><i data-feather="book-open" style="color:#2196F3"></i><span>${data.books.length} كتاب</span></div>
      <div class="subj-stat"><i data-feather="file-text" style="color:#FF9800"></i><span>${data.summaries.length} ملخص</span></div>
      <div class="subj-stat"><i data-feather="headphones" style="color:#9C27B0"></i><span>${data.audios.length} صوتي</span></div>
      <div class="subj-stat"><i data-feather="image" style="color:#E91E63"></i><span>${data.photos.length} صورة</span></div>
    `;
    featherRefresh();
  }

  // Tabs
  function activateTab(tab) {
    currentTab = tab;
    el("subject-tabs").querySelectorAll(".stab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
    renderTabContent();
  }

  el("subject-tabs").querySelectorAll(".stab").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  function renderTabContent() {
    const content = el("subject-content");
    if (!content) return;

    if (currentTab === "lessons") {
      if (!data.videos.length) { content.innerHTML = emptyBox("لا توجد دروس"); featherRefresh(); return; }
      content.innerHTML = `<div class="videos-grid">${data.videos.map(videoCardHtml).join("")}</div>`;
      featherRefresh();
      content.querySelectorAll(".video-card").forEach(card => {
        card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
      });
    } else if (currentTab === "books") {
      if (!data.books.length) { content.innerHTML = emptyBox("لا توجد كتب"); featherRefresh(); return; }
      content.innerHTML = data.books.map(b => `
        <div class="book-card" data-url="${escHtml(b.url)}" style="cursor:pointer">
          <div class="book-icon"><i data-feather="book-open"></i></div>
          <div class="book-info">
            <span class="book-title">${escHtml(b.title)}</span>
            <span class="book-meta">${escHtml(b.grade || "")}</span>
          </div>
          <div class="book-open-btn"><i data-feather="external-link"></i></div>
        </div>
      `).join("");
      featherRefresh();
      content.querySelectorAll(".book-card").forEach(card => {
        card.addEventListener("click", () => window.open(card.dataset.url, "_blank"));
      });
    } else if (currentTab === "summaries") {
      if (!data.summaries.length) { content.innerHTML = emptyBox("لا توجد ملخصات"); featherRefresh(); return; }
      content.innerHTML = data.summaries.map(s => `
        <div class="generic-card" onclick="navigateTo('/summary/${escHtml(s.$id)}')">
          <div class="generic-icon orange"><i data-feather="file-text"></i></div>
          <div class="generic-info">
            <span class="generic-title">${escHtml(s.title)}</span>
            <span class="generic-meta">${escHtml(s.teacher_name || "")} · ${formatDate(s.created_at)}</span>
          </div>
          <i data-feather="chevron-left" class="chevron"></i>
        </div>
      `).join("");
      featherRefresh();
      // Show summary modal on click
      content.querySelectorAll(".generic-card").forEach((card, i) => {
        card.addEventListener("click", () => {
          const s = data.summaries[i];
          showSummaryModal(s);
        });
      });
    } else if (currentTab === "audios") {
      if (!data.audios.length) { content.innerHTML = emptyBox("لا توجد صوتيات"); featherRefresh(); return; }
      content.innerHTML = data.audios.map(a => `
        <div class="generic-card audio-card" data-url="${escHtml(a.url)}">
          <div class="generic-icon purple"><i data-feather="headphones"></i></div>
          <div class="generic-info">
            <span class="generic-title">${escHtml(a.title)}</span>
            <span class="generic-meta">${escHtml(a.teacher_name || "")} · ${formatNumber(a.plays || 0)} تشغيل</span>
          </div>
          <i data-feather="play" class="chevron" style="color:#9C27B0"></i>
        </div>
      `).join("");
      featherRefresh();
      content.querySelectorAll(".audio-card").forEach(card => {
        card.addEventListener("click", () => {
          const url = card.dataset.url;
          showAudioModal(url, card.querySelector(".generic-title").textContent);
        });
      });
    } else if (currentTab === "photos") {
      if (!data.photos.length) { content.innerHTML = emptyBox("لا توجد صور"); featherRefresh(); return; }
      content.innerHTML = `<div class="photos-grid">${data.photos.map(p => `
        <div class="photo-card" data-url="${escHtml(p.url)}">
          <div class="photo-preview">
            <img src="${escHtml(p.url)}" alt="${escHtml(p.title)}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="photo-fallback" style="display:none"><i data-feather="image"></i></div>
          </div>
          <p class="photo-title">${escHtml(p.title)}</p>
        </div>
      `).join("")}</div>`;
      featherRefresh();
      content.querySelectorAll(".photo-card").forEach(card => {
        card.addEventListener("click", () => showPhotoModal(card.dataset.url));
      });
    } else if (currentTab === "tests") {
      if (!data.tests.length) { content.innerHTML = emptyBox("لا توجد اختبارات"); featherRefresh(); return; }
      content.innerHTML = data.tests.map(t => `
        <div class="test-item" data-id="${escHtml(t.$id)}">
          <div class="test-icon"><i data-feather="clipboard"></i></div>
          <div class="test-info">
            <span class="test-title">${escHtml(t.title)}</span>
            <span class="test-meta">${t.questions ? t.questions.length : 0} سؤال</span>
          </div>
          <div class="chevron-wrap"><i data-feather="chevron-left"></i></div>
        </div>
      `).join("");
      featherRefresh();
      const session = Auth.get();
      content.querySelectorAll(".test-item").forEach(item => {
        item.addEventListener("click", () => {
          if (!session) { toast("يرجى تسجيل الدخول لأداء الاختبار", "warn"); navigateTo("/login"); return; }
          navigateTo(`/take-test/${item.dataset.id}`);
        });
      });
    }
  }

  renderTabContent();
}

function showSummaryModal(summary) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="modal-box summary-modal">
    <div class="modal-header">
      <span class="modal-title">${escHtml(summary.title)}</span>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-feather="x"></i></button>
    </div>
    <div class="modal-body">
      <p class="summary-meta">${escHtml(summary.teacher_name || "")} · ${formatDate(summary.created_at)}</p>
      <div class="summary-content">${escHtml(summary.content)}</div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  featherRefresh();
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}

function showAudioModal(url, title) {
  const existing = qs(".audio-modal-overlay");
  if (existing) existing.remove();
  const modal = document.createElement("div");
  modal.className = "modal-overlay audio-modal-overlay";
  modal.innerHTML = `<div class="modal-box" style="max-width:400px">
    <div class="modal-header">
      <span class="modal-title">${escHtml(title)}</span>
      <button class="modal-close" onclick="this.closest('.modal-overlay').remove()"><i data-feather="x"></i></button>
    </div>
    <div class="modal-body" style="padding:20px">
      <audio controls autoplay style="width:100%;border-radius:8px" src="${escHtml(url)}">
        متصفحك لا يدعم الصوت
      </audio>
    </div>
  </div>`;
  document.body.appendChild(modal);
  featherRefresh();
  modal.addEventListener("click", e => { if (e.target === modal) { modal.querySelector("audio").pause(); modal.remove(); } });
}

function showPhotoModal(url) {
  const modal = document.createElement("div");
  modal.className = "modal-overlay";
  modal.innerHTML = `<div class="photo-modal-inner">
    <button class="modal-close-abs" onclick="this.closest('.modal-overlay').remove()"><i data-feather="x"></i></button>
    <img src="${escHtml(url)}" alt="صورة" style="max-width:94vw;max-height:90vh;border-radius:12px;object-fit:contain">
  </div>`;
  document.body.appendChild(modal);
  featherRefresh();
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); });
}
