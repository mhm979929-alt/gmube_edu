// ── Notifications Page ──────────────────────────────────────────
async function renderNotifications() {
  setPageTitle("الإشعارات");
  const session = Auth.get();

  if (!session) {
    renderPage(`
      <div class="page">
        <div class="inner-header">
          <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
          <span class="inner-title">الإشعارات</span>
        </div>
        <div class="guest-wrap">
          <div class="guest-card">
            <i data-feather="bell-off" class="guest-icon"></i>
            <p class="guest-title">يرجى تسجيل الدخول</p>
            <button class="btn-primary" onclick="navigateTo('/login')">تسجيل الدخول</button>
          </div>
        </div>
      </div>
    `);
    featherRefresh();
    return;
  }

  renderPage(`
    <div class="page">
      <div class="inner-header">
        <button class="back-btn" onclick="goBack()"><i data-feather="arrow-right"></i></button>
        <i data-feather="bell" style="color:#4CAF50"></i>
        <span class="inner-title">الإشعارات</span>
      </div>
      <div id="notifs-list">${spinner()}</div>
    </div>
  `);
  featherRefresh();

  async function loadNotifs() {
    const listEl = el("notifs-list");
    if (!listEl) return;
    try {
      const notifs = await getNotifications(session.user_id);
      if (!notifs.length) {
        listEl.innerHTML = emptyBox("لا توجد إشعارات", "ستظهر إشعاراتك هنا");
        featherRefresh();
        return;
      }
      listEl.innerHTML = notifs.map(n => `
        <div class="notif-item${!n.is_read ? " unread" : ""}" data-id="${escHtml(n.$id)}" data-related="${escHtml(n.related_id || "")}">
          <div class="notif-icon${!n.is_read ? " unread" : ""}"><i data-feather="bell"></i></div>
          <div class="notif-content">
            <span class="notif-title${!n.is_read ? " unread" : ""}">${escHtml(n.title)}</span>
            <span class="notif-message">${escHtml(n.message)}</span>
            <span class="notif-date">${formatDate(n.created_at)}</span>
          </div>
          ${!n.is_read ? `<div class="notif-dot"></div>` : ""}
        </div>
      `).join("");
      featherRefresh();

      listEl.querySelectorAll(".notif-item").forEach(item => {
        item.addEventListener("click", async () => {
          const id = item.dataset.id;
          const related = item.dataset.related;
          if (item.classList.contains("unread")) {
            item.classList.remove("unread");
            item.querySelector(".notif-icon")?.classList.remove("unread");
            item.querySelector(".notif-title")?.classList.remove("unread");
            item.querySelector(".notif-dot")?.remove();
            markNotificationAsRead(id).catch(() => {});
          }
          if (related) navigateTo(`/watch/${related}`);
        });
      });
    } catch {
      listEl.innerHTML = errorBox("فشل تحميل الإشعارات", loadNotifs);
      featherRefresh();
    }
  }

  await loadNotifs();
}
