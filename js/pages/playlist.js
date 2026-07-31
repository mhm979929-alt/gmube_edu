// ── Playlist Page ───────────────────────────────────────────────
async function renderPlaylist(playlistId) {
  setPageTitle("قائمة التشغيل");
  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <span class="inner-title" id="playlist-title">قائمة التشغيل</span>
      </div>
      <div id="playlist-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  try {
    // 1. جلب معلومات القائمة الأساسية
    const playlist = await databases.getDocument(DATABASE_ID, COLLECTIONS.PLAYLISTS, playlistId);
    setPageTitle(playlist.name);
    if (el("playlist-title")) el("playlist-title").textContent = playlist.name;

    console.log(`🔍 تم فتح قائمة: ${playlist.name} (النوع: ${playlist.type})`); // سجل نوع القائمة

    let items = [];
    // 2. جلب العناصر بناءً على النوع
    if (playlist.type === 'video') {
      items = await getVideosByPlaylist(playlistId);
    } else if (playlist.type === 'book') {
      items = await getBooksByPlaylist(playlistId);
    } else if (playlist.type === 'audio') {
      items = await getAudiosByPlaylist(playlistId);
    } else if (playlist.type === 'summary') {
      items = await getSummariesByPlaylist(playlistId);
    } else if (playlist.type === 'test') {
      items = await getTestsByPlaylist(playlistId);
    } else if (playlist.type === 'photo') {
      items = await getPhotosByPlaylist(playlistId);
    }

    console.log(`📦 عدد العناصر الموجودة في القائمة: ${items.length}`); // سجل عدد العناصر

    const body = el("playlist-body");
    if (!items.length) {
      body.innerHTML = emptyBox("لا توجد محتويات في هذه القائمة", "القائمة فارغة حالياً");
      featherRefresh();
      return;
    }

    // 3. عرض المحتويات حسب النوع
    if (playlist.type === 'video') {
      body.innerHTML = `<div class="videos-grid">${items.map(videoCardHtml).join("")}</div>`;
      featherRefresh();
      body.querySelectorAll(".video-card").forEach(card => {
        card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
      });
    } else if (playlist.type === 'book') {
      body.innerHTML = `<div class="books-grid">${items.map(b => `
        <div class="book-card" data-url="${escHtml(b.url)}" style="cursor:pointer">
          <div class="book-icon"><i data-feather="book-open"></i></div>
          <div class="book-info">
            <span class="book-title">${escHtml(b.title)}</span>
            <span class="book-meta">${escHtml(b.subject)} · ${escHtml(b.grade)}</span>
          </div>
          <div class="book-open-btn"><i data-feather="external-link"></i></div>
        </div>
      `).join("")}</div>`;
      featherRefresh();
      body.querySelectorAll(".book-card").forEach(card => {
        card.addEventListener("click", () => window.open(card.dataset.url, "_blank"));
      });
    } else if (playlist.type === 'test') {
      body.innerHTML = `<div class="tests-list">${items.map(t => `
        <div class="test-item" data-id="${escHtml(t.$id)}">
          <div class="test-icon"><i data-feather="clipboard"></i></div>
          <div class="test-info">
            <span class="test-title">${escHtml(t.title)}</span>
            <span class="test-meta">${t.questions ? t.questions.length : 0} سؤال</span>
          </div>
          <div class="chevron-wrap"><i data-feather="chevron-left"></i></div>
        </div>
      `).join("")}</div>`;
      featherRefresh();
      const session = Auth.get();
      body.querySelectorAll(".test-item").forEach(item => {
        item.addEventListener("click", () => {
          if (!session) { toast("يرجى تسجيل الدخول لأداء الاختبار", "warn"); navigateTo("/login"); return; }
          navigateTo(`/take-test/${item.dataset.id}`);
        });
      });
    } else if (playlist.type === 'summary') {
      body.innerHTML = items.map(s => `
        <div class="generic-card" style="margin:0 14px 8px;cursor:pointer">
          <div class="generic-icon orange"><i data-feather="file-text"></i></div>
          <div class="generic-info">
            <span class="generic-title">${escHtml(s.title)}</span>
            <span class="generic-meta">${escHtml(s.teacher_name || "")} · ${formatDate(s.created_at)}</span>
          </div>
          <i data-feather="chevron-left" class="chevron"></i>
        </div>
      `).join("");
      featherRefresh();
      body.querySelectorAll(".generic-card").forEach((card, i) => {
        card.addEventListener("click", () => {
          const s = items[i];
          showSummaryModal(s);
        });
      });
    } else if (playlist.type === 'audio') {
      body.innerHTML = items.map(a => `
        <div class="generic-card audio-card" data-url="${escHtml(a.url)}" style="margin:0 14px 8px;cursor:pointer">
          <div class="generic-icon purple"><i data-feather="headphones"></i></div>
          <div class="generic-info">
            <span class="generic-title">${escHtml(a.title)}</span>
            <span class="generic-meta">${escHtml(a.teacher_name || "")} · ${formatNumber(a.plays || 0)} تشغيل</span>
          </div>
          <i data-feather="play" class="chevron" style="color:#9C27B0"></i>
        </div>
      `).join("");
      featherRefresh();
      body.querySelectorAll(".audio-card").forEach(card => {
        card.addEventListener("click", () => {
          const url = card.dataset.url;
          showAudioModal(url, card.querySelector(".generic-title").textContent);
        });
      });
    } else if (playlist.type === 'photo') {
      body.innerHTML = `<div class="photos-grid">${items.map(p => `
        <div class="photo-card" data-url="${escHtml(p.url)}" style="margin:0 14px 8px">
          <div class="photo-preview">
            <img src="${escHtml(p.url)}" alt="${escHtml(p.title)}" loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="photo-fallback" style="display:none"><i data-feather="image"></i></div>
          </div>
          <p class="photo-title">${escHtml(p.title)}</p>
        </div>
      `).join("")}</div>`;
      featherRefresh();
      body.querySelectorAll(".photo-card").forEach(card => {
        card.addEventListener("click", () => showPhotoModal(card.dataset.url));
      });
    }

  } catch (err) {
    el("playlist-body").innerHTML = errorBox("فشل تحميل القائمة", () => renderPlaylist(playlistId));
    featherRefresh();
  }
}

// ── دوال النوافذ المنبثقة للملخصات والصور والصوتيات ──
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
  modal.addEventListener("click", e => { if (e.target === modal) modal.remove(); }
  );
}