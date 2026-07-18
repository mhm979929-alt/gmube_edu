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
      <div id="subject-content" class="subject-content">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  // 1. جلب القوائم الخاصة بهذه المادة
  const playlists = await getPlaylistsBySubject(subject);
  const content = el("subject-content");

  if (!playlists.length) {
    content.innerHTML = emptyBox("لا توجد قوائم مرتبة بعد", "سيقوم الأدمن بترتيب المحتوى في قوائم قريباً");
    featherRefresh();
    return;
  }

  // 2. عرض القوائم كبطاقات
  content.innerHTML = playlists.map(p => `
    <div class="playlist-card" data-id="${p.$id}" data-type="${p.type}" style="background:#141414;border-radius:14px;padding:14px;border:1px solid rgba(255,255,255,0.04);cursor:pointer;margin:0 14px 8px;display:flex;align-items:center;gap:12px">
      <div class="generic-icon orange"><i data-feather="list"></i></div>
      <div class="generic-info" style="flex:1;text-align:right">
        <span class="generic-title" style="font-weight:600">📂 ${escHtml(p.name)}</span>
        <span class="generic-meta" style="color:#777;display:block;font-size:12px">${escHtml(p.description || '')}</span>
        <span class="generic-meta" style="color:#4CAF50;display:block;font-size:11px">النوع: ${p.type}</span>
      </div>
      <i data-feather="chevron-left" class="chevron" style="color:#555"></i>
    </div>
  `).join("");
  featherRefresh();

  // 3. عند الضغط على القائمة، ننتقل إلى صفحة عرض محتوى القائمة
  content.querySelectorAll(".playlist-card").forEach(card => {
    card.addEventListener("click", () => {
      navigateTo(`/playlist/${card.dataset.id}`);
    });
  });
}
