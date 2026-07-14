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
    const videos = await getVideosByPlaylist(playlistId);
    const title = videos[0]?.playlist_name ?? "قائمة التشغيل";
    setPageTitle(title);
    if (el("playlist-title")) el("playlist-title").textContent = title;

    const body = el("playlist-body");
    if (!videos.length) {
      body.innerHTML = emptyBox("لا توجد دروس في هذه القائمة", "القائمة فارغة حالياً");
      featherRefresh();
      return;
    }
    body.innerHTML = `<div class="videos-grid">${videos.map(videoCardHtml).join("")}</div>`;
    featherRefresh();
    body.querySelectorAll(".video-card").forEach(card => {
      card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
    });
  } catch {
    el("playlist-body").innerHTML = errorBox("فشل تحميل القائمة", () => renderPlaylist(playlistId));
    featherRefresh();
  }
}
