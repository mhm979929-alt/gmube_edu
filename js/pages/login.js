// ── Login Page ──────────────────────────────────────────────────
function renderLogin() {
  setPageTitle("تسجيل الدخول");

  renderPage(`
    <div class="page">
      <div class="login-wrap">
        <button class="back-btn" onclick="goBack()" style="align-self:flex-start;margin-bottom:16px"><i data-feather="arrow-right"></i></button>
        <div class="login-logo">
          <div class="logo-icon big"><i data-feather="book-open"></i></div>
          <h1 class="logo-text" style="font-size:24px;margin-top:12px">GMube Edu</h1>
          <p style="color:#777;font-size:14px;margin-top:4px">منصة التعليم الجزائري</p>
        </div>

        <div class="login-tabs" id="login-tabs">
          <button class="ltab active" data-type="student"><i data-feather="user"></i> طالب</button>
          <button class="ltab" data-type="teacher"><i data-feather="book"></i> أستاذ</button>
        </div>

        <div id="login-error" class="login-error" style="display:none"></div>

        <div class="field-group">
          <label class="field-label">الاسم</label>
          <div class="input-wrap" id="name-wrap">
            <i data-feather="user"></i>
            <input id="login-name" class="field-input" type="text" placeholder="اكتب اسمك كاملاً" autocomplete="name">
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">كلمة السر</label>
          <div class="input-wrap" id="pass-wrap">
            <i data-feather="lock"></i>
            <input id="login-pass" class="field-input" type="password" placeholder="كلمة السر" autocomplete="current-password">
            <button class="eye-btn" id="eye-btn" type="button"><i data-feather="eye"></i></button>
          </div>
        </div>

        <button class="btn-primary full" id="login-submit">
          <i data-feather="log-in"></i> تسجيل الدخول
        </button>
      </div>
    </div>
  `);
  featherRefresh();

  let userType = "student";

  // Tabs
  el("login-tabs").querySelectorAll(".ltab").forEach(btn => {
    btn.addEventListener("click", () => {
      userType = btn.dataset.type;
      el("login-tabs").querySelectorAll(".ltab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // Show/hide password
  el("eye-btn").addEventListener("click", () => {
    const inp = el("login-pass");
    const showing = inp.type === "text";
    inp.type = showing ? "password" : "text";
    el("eye-btn").innerHTML = showing ? `<i data-feather="eye"></i>` : `<i data-feather="eye-off"></i>`;
    featherRefresh();
  });

  // Focus style
  ["name-wrap", "pass-wrap"].forEach(wrapId => {
    const wrap = el(wrapId);
    const input = wrap.querySelector("input");
    input.addEventListener("focus", () => wrap.classList.add("focused"));
    input.addEventListener("blur", () => wrap.classList.remove("focused"));
  });

  // Submit
  async function handleLogin() {
    const name = (el("login-name").value || "").trim();
    const pass = (el("login-pass").value || "").trim();
    const errBox = el("login-error");
    const submitBtn = el("login-submit");

    if (!name || !pass) {
      errBox.style.display = "flex";
      errBox.innerHTML = `<i data-feather="alert-circle"></i> يرجى ملء جميع الحقول`;
      featherRefresh();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="spinner-sm"></div> جاري الدخول...`;
    errBox.style.display = "none";

    try {
      await Auth.login(userType, name, pass);
      toast("مرحباً " + Auth.get().name, "success");
      navigateTo("/");
    } catch (e) {
      errBox.style.display = "flex";
      errBox.innerHTML = `<i data-feather="alert-circle"></i> ${escHtml(e.message || "بيانات الدخول غير صحيحة")}`;
      featherRefresh();
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i data-feather="log-in"></i> تسجيل الدخول`;
      featherRefresh();
    }
  }

  el("login-submit").addEventListener("click", handleLogin);
  el("login-pass").addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
}
