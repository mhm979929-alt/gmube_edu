// ── Watch Page ──────────────────────────────────────────────────
async function renderWatch(videoId) {
  setPageTitle("جاري التحميل...");
  renderPage(`
    <div class="page watch-page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <span class="inner-title" id="watch-title">الفيديو</span>
      </div>
      <div id="watch-body">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  let video = null;
  let liked = false;
  let userRating = 0;

  try {
    video = await getVideoById(videoId);
  } catch {}

  if (!video) {
    el("watch-body").innerHTML = emptyBox("الفيديو غير موجود");
    featherRefresh();
    return;
  }

  setPageTitle(video.title);
  if (el("watch-title")) el("watch-title").textContent = video.title;

  // Check liked state
  try {
    const likedList = JSON.parse(localStorage.getItem("liked_videos") || "[]");
    liked = likedList.includes(video.$id);
  } catch {}

  // Update views
  updateVideoViews(video.$id, (video.views || 0) + 1).catch(() => {});

  function buildPlayerHtml(url) {
    if (isYouTubeUrl(url)) {
      const id = extractYouTubeId(url);
      if (!id) return `<div class="player-wrap"><p style="color:#fff;text-align:center;padding:20px">رابط الفيديو غير صالح</p></div>`;
      return `<div class="player-wrap">
        <div id="plyr-container">
          <div class="plyr__video-embed" id="player">
            <iframe
              src="https://www.youtube.com/embed/${id}?origin=${location.origin}&iv_load_policy=3&modestbranding=1&playsinline=1&showinfo=0&rel=0&enablejsapi=1"
              allowfullscreen
              allow="autoplay">
            </iframe>
          </div>
        </div>
      </div>`;
    }
    return `<div class="player-wrap">
      <div id="plyr-container">
        <video id="player" playsinline controls>
          <source src="${escHtml(url)}" type="video/mp4">
          <source src="${escHtml(url)}" type="video/webm">
        </video>
      </div>
    </div>`;
  }

  function initPlyr() {
    const playerEl = document.getElementById("player");
    if (!playerEl || typeof Plyr === "undefined") return;
    try {
      const p = new Plyr(playerEl, {
        controls: [
          "play-large","play","progress","current-time","duration",
          "mute","volume","captions","settings","pip","airplay","fullscreen"
        ],
        settings: ["quality","speed","loop"],
        youtube: { noCookie: false, rel: 0, showinfo: 0, iv_load_policy: 3, modestbranding: 1 },
        i18n: {
          play: "تشغيل", pause: "إيقاف", mute: "كتم الصوت", unmute: "إلغاء الكتم",
          enterFullscreen: "ملء الشاشة", exitFullscreen: "خروج", settings: "الإعدادات",
          speed: "السرعة", normal: "عادي", quality: "الجودة"
        },
        tooltips: { controls: true, seek: true },
      });
      // Plyr default color override
      const root = document.getElementById("plyr-container");
      if (root) {
        root.style.setProperty("--plyr-color-main", "#4CAF50");
        root.style.setProperty("--plyr-video-background", "#000");
      }
    } catch(e) { console.warn("Plyr init error", e); }
  }

  async function renderBody() {
    const session = Auth.get();
    const [comments, playlistVideos] = await Promise.all([
      getComments(videoId).catch(() => []),
      video.playlist_id ? getVideosByPlaylist(video.playlist_id).catch(() => []) : Promise.resolve([]),
    ]);
    const suggestions = playlistVideos.filter(v => v.$id !== videoId);
    const topComments = comments.filter(c => !c.parent_id);
    const replies = comments.filter(c => c.parent_id);

    const body = el("watch-body");
    if (!body) return;

    body.innerHTML = `
      ${buildPlayerHtml(video.url)}

      <div class="watch-info">
        <h2 class="watch-title">${escHtml(video.title)}</h2>
        <div class="watch-meta-row">
          <span class="watch-meta-item"><i data-feather="eye"></i> ${formatNumber(video.views || 0)}</span>
          <span class="watch-meta-item"><i data-feather="calendar"></i> ${formatDate(video.created_at)}</span>
          ${video.category ? `<span class="cat-pill">${escHtml(video.category)}</span>` : ""}
          ${video.grade ? `<span class="cat-pill" style="background:rgba(33,150,243,0.15);color:#2196F3">${escHtml(video.grade)}</span>` : ""}
        </div>

        <div class="watch-actions">
          <button class="action-btn${liked ? " liked" : ""}" id="like-btn">
            <i data-feather="thumbs-up"></i>
            <span id="like-count">${formatNumber(video.likes || 0)}</span>
          </button>
          <button class="action-btn" onclick="navigateTo('/channel/${escHtml(video.user_id)}')">
            <i data-feather="user"></i>
            <span>${escHtml(video.user_name || "")}</span>
          </button>
          ${video.playlist_id ? `
          <button class="action-btn" onclick="navigateTo('/playlist/${escHtml(video.playlist_id)}')">
            <i data-feather="list"></i>
            <span>القائمة</span>
          </button>` : ""}
        </div>

        <div class="watch-rating">
          <span style="color:#aaa;font-size:13px">تقييمك:</span>
          ${starsHtml(userRating, false)}
          <span style="color:#777;font-size:12px">${video.avg_rating ? video.avg_rating.toFixed(1) + " ★" : ""} (${video.rating_count || 0} تقييم)</span>
        </div>
      </div>

      ${suggestions.length ? `
      <div class="section" style="margin-top:0">
        <div class="section-header"><span class="section-title">دروس القائمة</span></div>
        <div class="videos-grid" id="suggestions-grid">
          ${suggestions.map(videoCardHtml).join("")}
        </div>
      </div>` : ""}

      <div class="comments-section">
        <div class="section-header" style="padding:0 16px 8px">
          <span class="section-title">التعليقات (${topComments.length})</span>
        </div>

        ${session ? `
        <div class="comment-form">
          <div id="reply-banner" style="display:none" class="reply-banner">
            <span id="reply-name-text"></span>
            <button onclick="clearReply()" class="cancel-reply">إلغاء</button>
          </div>
          ${starsHtml(0, false, 5)}
          <div class="comment-input-wrap">
            <textarea id="comment-input" class="comment-textarea" placeholder="اكتب تعليقاً..." rows="2"></textarea>
            <button class="comment-submit" id="comment-submit"><i data-feather="send"></i></button>
          </div>
        </div>` : `
        <div class="login-prompt" onclick="navigateTo('/login')">
          <i data-feather="log-in"></i> سجّل الدخول للتعليق
        </div>`}

        <div id="comments-list">
          ${topComments.length ? topComments.map(c => commentHtml(c, replies)).join("") : emptyBox("لا توجد تعليقات بعد", "كن أول من يعلق")}
        </div>
      </div>
    `;
    featherRefresh();
    initPlyr();

    // Suggestions
    const sugGrid = el("suggestions-grid");
    if (sugGrid) {
      sugGrid.querySelectorAll(".video-card").forEach(card => {
        card.addEventListener("click", () => navigateTo(`/watch/${card.dataset.id}`));
      });
    }

    // Like button
    const likeBtn = el("like-btn");
    if (likeBtn) {
      likeBtn.addEventListener("click", async () => {
        const likedList = JSON.parse(localStorage.getItem("liked_videos") || "[]");
        const idx = likedList.indexOf(video.$id);
        let newLikes = video.likes || 0;
        if (idx >= 0) {
          likedList.splice(idx, 1); newLikes = Math.max(0, newLikes - 1);
          liked = false; likeBtn.classList.remove("liked");
        } else {
          likedList.push(video.$id); newLikes++;
          liked = true; likeBtn.classList.add("liked");
        }
        localStorage.setItem("liked_videos", JSON.stringify(likedList));
        el("like-count").textContent = formatNumber(newLikes);
        updateVideoLikes(video.$id, newLikes).catch(() => {});
      });
    }

    // Star rating
    setupInteractiveStars();

    // Comment submit
    if (session) {
      let replyTo = null, replyName = null;

      window.clearReply = () => {
        replyTo = null; replyName = null;
        el("reply-banner").style.display = "none";
      };

      // Reply buttons (delegated)
      el("comments-list").addEventListener("click", e => {
        const btn = e.target.closest(".reply-to-btn");
        if (btn) {
          replyTo = btn.dataset.id;
          replyName = btn.dataset.name;
          const banner = el("reply-banner");
          banner.style.display = "flex";
          el("reply-name-text").textContent = `رد على: ${replyName}`;
          el("comment-input").focus();
          featherRefresh();
        }
      });

      el("comment-submit").addEventListener("click", async () => {
        const text = (el("comment-input").value || "").trim();
        if (!text) { toast("اكتب تعليقاً أولاً", "warn"); return; }
        el("comment-submit").disabled = true;
        try {
          await addComment(video.$id, session.user_id, session.name, text, userRating, replyTo || undefined);
          el("comment-input").value = "";
          userRating = 0;
          clearReply();
          // Refresh comments
          const newComments = await getComments(videoId).catch(() => []);
          const topC = newComments.filter(c => !c.parent_id);
          const repC = newComments.filter(c => c.parent_id);
          el("comments-list").innerHTML = topC.length ? topC.map(c => commentHtml(c, repC)).join("") : emptyBox("لا توجد تعليقات بعد");
          featherRefresh();
          setupInteractiveStars();
          if (video.rating_count !== undefined && userRating > 0) {
            const newCount = (video.rating_count || 0) + 1;
            const newAvg = ((video.avg_rating || 0) * (video.rating_count || 0) + userRating) / newCount;
            updateVideoRating(video.$id, newAvg, newCount).catch(() => {});
          }
          toast("تم إرسال تعليقك", "success");
        } catch (e) {
          toast("فشل إرسال التعليق", "error");
        } finally {
          el("comment-submit").disabled = false;
          featherRefresh();
        }
      });
    }
  }

  function commentHtml(c, replies) {
    const cReplies = replies.filter(r => r.parent_id === c.$id);
    return `<div class="comment-item">
      <div class="comment-header">
        ${avatarHtml(c.user_name, null, 32)}
        <div class="comment-meta">
          <span class="comment-user">${escHtml(c.user_name)}</span>
          ${c.rating ? starsHtml(c.rating, true, 5) : ""}
          <span class="comment-date">${formatDate(c.created_at)}</span>
        </div>
        <button class="reply-to-btn" data-id="${escHtml(c.$id)}" data-name="${escHtml(c.user_name)}">
          <i data-feather="corner-down-left"></i> رد
        </button>
      </div>
      <p class="comment-text">${escHtml(c.text)}</p>
      ${cReplies.map(r => `
        <div class="reply-item">
          <div class="comment-header">
            ${avatarHtml(r.user_name, null, 26)}
            <div class="comment-meta">
              <span class="comment-user">${escHtml(r.user_name)}</span>
              <span class="comment-date">${formatDate(r.created_at)}</span>
            </div>
          </div>
          <p class="comment-text">${escHtml(r.text)}</p>
        </div>
      `).join("")}
    </div>`;
  }

  function setupInteractiveStars() {
    const starsEl = qs(".watch-rating .stars");
    if (!starsEl) return;
    starsEl.classList.add("stars-interactive");
    starsEl.querySelectorAll(".star").forEach(s => {
      s.addEventListener("click", () => {
        userRating = parseInt(s.dataset.star);
        starsEl.querySelectorAll(".star").forEach((st, i) => {
          st.classList.toggle("filled", i < userRating);
        });
        starsEl.dataset.value = userRating;
      });
    });
  }

  await renderBody();
}
