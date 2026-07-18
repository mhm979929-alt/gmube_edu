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
    }

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
    } else {
      // عرض افتراضي للملخصات، الصوتيات، الصور
      body.innerHTML = `<p style="text-align:center;color:#777;padding:20px">هذا النوع من المحتوى قيد التطوير</p>`;
      featherRefresh();
    }

  } catch (err) {
    el("playlist-body").innerHTML = errorBox("فشل تحميل القائمة", () => renderPlaylist(playlistId));
    featherRefresh();
  }
}
