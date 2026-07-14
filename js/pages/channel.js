// ── Channel Page ────────────────────────────────────────────────
async function renderChannel(userId) {
  setPageTitle("القناة");
  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <span class="inner-title" id="channel-title">جاري التحميل...</span>
      </div>
      <div id="channel-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let teacher = null;
  let videos = [];

  try {
    [teacher, videos] = await Promise.all([
      getTeacherByUserId(userId).catch(() => null),
      getVideosByTeacher(userId).catch(() => []),
    ]);
  } catch {}

  if (!teacher) {
    el("channel-body").innerHTML = emptyBox("القناة غير موجودة");
    featherRefresh();
    return;
  }

  setPageTitle(teacher.name);
  if (el("channel-title")) el("channel-title").textContent = teacher.name;

  const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
  const session = Auth.get();

  let following = false;
  if (session && session.type === "student") {
    try { following = await isFollowing(session.user_id, teacher.user_id); } catch {}
  }

  el("channel-body").innerHTML = `
    <div class="channel-cover"></div>
    <div class="channel-info-wrap">
      ${avatarHtml(teacher.name, teacher.avatar, 80)}
      <div class="channel-details">
        <span class="channel-name">${escHtml(teacher.name)}</span>
        <span class="channel-subject">${escHtml(teacher.subject || "")}</span>
        <div class="channel-stats-row">
          <span><i data-feather="video"></i> ${videos.length} درس</span>
          <span><i data-feather="eye"></i> ${formatNumber(totalViews)}</span>
        </div>
      </div>
      ${session && session.type === "student" ? `
      <button class="follow-btn${following ? " following" : ""}" id="follow-btn">
        ${following ? "متابَع ✓" : "متابعة +"}
      </button>` : ""}
    </div>

    <div class="section" style="margin-top:12px">
      <div class="section-header"><span class="section-title">الدروس (${videos.length})</span></div>
      <div class="videos-grid" id="channel-videos">
        ${videos.length ? videos.map(videoCardHtml).join("") : emptyBox("لا توجد دروس بعد")}
      </div>
    </div>
  `;
  featherRefresh();

  el("channel-videos").querySelectorAll(".video-card").forEach(card => {
    card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
  });

  // Follow button
  const followBtn = el("follow-btn");
  if (followBtn && session) {
    followBtn.addEventListener("click", async () => {
      followBtn.disabled = true;
      try {
        if (following) {
          await unfollowTeacher(session.user_id, teacher.user_id);
          following = false;
          followBtn.textContent = "متابعة +";
          followBtn.classList.remove("following");
        } else {
          await followTeacher(session.user_id, teacher.user_id);
          following = true;
          followBtn.textContent = "متابَع ✓";
          followBtn.classList.add("following");
        }
      } catch { toast("حدث خطأ", "error"); }
      followBtn.disabled = false;
    });
  }
}
