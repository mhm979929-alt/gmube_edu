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
          <p style="color:#777;font-size:14px;margin-top:4px">منصة التعليم السوري</p>
        </div>

        <div class="login-tabs" id="login-tabs">
          <button class="ltab active" data-type="student"><i data-feather="user"></i> طالب</button>
          <button class="ltab" data-type="teacher"><i data-feather="book"></i> أستاذ</button>
        </div>

        <div id="login-error" class="login-error" style="display:none"></div>

        <div class="field-group">
          <label class="field-label" id="identity-label">الاسم أو البريد الإلكتروني</label>
          <div class="input-wrap" id="name-wrap">
            <i data-feather="user"></i>
            <input id="login-name" class="field-input" type="text" placeholder="اسمك القديم أو بريدك الإلكتروني" autocomplete="username">
          </div>
        </div>

        <div class="field-group" id="signup-fields" style="display:none">
          <label class="field-label">البريد الإلكتروني</label>
          <div class="input-wrap" id="email-wrap">
            <i data-feather="mail"></i>
            <input id="signup-email" class="field-input" type="email" placeholder="name@example.com" autocomplete="email">
          </div>
        </div>

        <div class="field-group">
          <label class="field-label">كلمة السر</label>
          <div class="input-wrap" id="pass-wrap">
            <i data-feather="lock"></i>
            <input id="login-pass" class="field-input" type="password" placeholder="8 محارف على الأقل للحساب الجديد" autocomplete="current-password">
            <button class="eye-btn" id="eye-btn" type="button"><i data-feather="eye"></i></button>
          </div>
        </div>

        <div class="field-group" id="confirm-wrap" style="display:none">
          <label class="field-label">تأكيد كلمة السر</label>
          <div class="input-wrap">
            <i data-feather="check-circle"></i>
            <input id="signup-confirm" class="field-input" type="password" placeholder="أعد كتابة كلمة السر" autocomplete="new-password">
          </div>
        </div>

        <button class="btn-primary full" id="login-submit" type="button">
          <i data-feather="log-in"></i> تسجيل الدخول
        </button>
        <a class="btn-secondary full" id="google-btn" href="https://mhm979929-alt.github.io/gmube_edu/google-start.html" target="_blank" rel="noopener external" style="margin-top:10px">
          <svg class="google-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.42z"/>
            <path fill="#34A853" d="M12 21.5c2.64 0 4.86-.87 6.48-2.36l-3.14-2.45c-.87.58-1.98.92-3.34.92-2.56 0-4.73-1.73-5.51-4.06H3.24V16.1A9.79 9.79 0 0 0 12 21.5z"/>
            <path fill="#FBBC05" d="M6.49 13.55A5.89 5.89 0 0 1 6.18 12c0-.54.11-1.07.31-1.55V8.1H3.24A9.48 9.48 0 0 0 2.2 12c0 1.41.34 2.75 1.04 3.9l3.25-2.35z"/>
            <path fill="#EA4335" d="M12 6.39c1.44 0 2.73.5 3.75 1.48l2.81-2.81C16.85 3.5 14.63 2.5 12 2.5a9.79 9.79 0 0 0-8.76 5.6l3.25 2.35C7.27 8.12 9.44 6.39 12 6.39z"/>
          </svg>
          تسجيل الدخول بواسطة Google
        </a>
        <button id="signup-toggle" type="button" style="display:none;width:100%;margin-top:12px;background:none;border:0;color:#2f8f62;cursor:pointer;font-family:inherit;font-size:14px">
          إنشاء حساب طالب جديد
        </button>
        <p id="login-help" style="color:#888;font-size:12px;text-align:center;margin-top:8px;line-height:1.7">
          يمكن للطلاب القدامى الدخول بالاسم، وللمعلمين الدخول بالاسم فقط.
        </p>
      </div>
    </div>
  `);
  featherRefresh();

  let userType = "student";
  let mode = "login";
  const errBox = el("login-error");

  function showError(message) {
    errBox.style.display = "flex";
    errBox.innerHTML = `<i data-feather="alert-circle"></i> ${escHtml(message)}`;
    featherRefresh();
  }

  function updateMode() {
    const signup = mode === "signup" && userType === "student";
    el("signup-fields").style.display = signup ? "block" : "none";
    el("confirm-wrap").style.display = signup ? "block" : "none";
    el("google-btn").style.display = userType === "student" ? "inline-flex" : "none";
    // التسجيل الجديد للطلاب يتم عبر Google فقط؛ يبقى تسجيل الاسم للحسابات القديمة.
    el("signup-toggle").style.display = "none";
    el("identity-label").textContent = signup ? "الاسم الكامل" : (userType === "teacher" ? "اسم الأستاذ" : "الاسم أو البريد الإلكتروني");
    el("login-name").placeholder = signup ? "اكتب اسمك كاملاً" : (userType === "teacher" ? "اكتب اسم الأستاذ" : "اسمك القديم أو بريدك الإلكتروني");
    el("login-name").autocomplete = signup ? "name" : "username";
    el("login-pass").autocomplete = signup ? "new-password" : "current-password";
    el("login-pass").placeholder = signup ? "8 محارف على الأقل" : "كلمة السر";
    el("login-submit").innerHTML = signup ? `<i data-feather="user-plus"></i> إنشاء الحساب` : `<i data-feather="log-in"></i> تسجيل الدخول`;
    el("signup-toggle").textContent = "";
    el("login-help").textContent = signup
      ? "سيُنشأ حساب الطالب مباشرة في Appwrite. لا يمكن إنشاء حساب أستاذ من التطبيق."
      : (userType === "teacher"
        ? "حسابات المعلمين تُنشأ حصراً من لوحة التحكم، ويمكن تسجيل الدخول هنا بالاسم وكلمة السر."
        : "يمكن للطلاب القدامى الدخول بالاسم، أما الطالب الجديد فيضغط زر Google ويختار حسابه للتسجيل تلقائياً.");
    featherRefresh();
  }

  el("login-tabs").querySelectorAll(".ltab").forEach(btn => {
    btn.addEventListener("click", () => {
      userType = btn.dataset.type;
      if (userType === "teacher") mode = "login";
      el("login-tabs").querySelectorAll(".ltab").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      errBox.style.display = "none";
      updateMode();
    });
  });

  el("signup-toggle").addEventListener("click", () => {
    mode = mode === "signup" ? "login" : "signup";
    errBox.style.display = "none";
    updateMode();
  });

  el("eye-btn").addEventListener("click", () => {
    const inp = el("login-pass");
    const showing = inp.type === "text";
    inp.type = showing ? "password" : "text";
    el("eye-btn").innerHTML = showing ? `<i data-feather="eye"></i>` : `<i data-feather="eye-off"></i>`;
    featherRefresh();
  });

  ["name-wrap", "email-wrap", "pass-wrap"].forEach(wrapId => {
    const wrap = el(wrapId);
    if (!wrap) return;
    const input = wrap.querySelector("input");
    input.addEventListener("focus", () => wrap.classList.add("focused"));
    input.addEventListener("blur", () => wrap.classList.remove("focused"));
  });

  async function handleSubmit() {
    const name = (el("login-name").value || "").trim();
    const pass = (el("login-pass").value || "").trim();
    const submitBtn = el("login-submit");
    errBox.style.display = "none";

    if (!name || !pass) return showError("يرجى ملء جميع الحقول");
    if (mode === "signup") {
      const email = (el("signup-email").value || "").trim();
      const confirm = (el("signup-confirm").value || "").trim();
      if (!email || !confirm) return showError("يرجى ملء جميع حقول إنشاء الحساب");
      if (pass !== confirm) return showError("كلمتا السر غير متطابقتين");
      if (pass.length < 8) return showError("كلمة السر يجب أن تكون 8 محارف على الأقل");
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="spinner-sm"></div> ${mode === "signup" ? "جاري إنشاء الحساب..." : "جاري الدخول..."}`;
    try {
      if (mode === "signup") {
        await Auth.registerStudent(name, el("signup-email").value.trim(), pass);
      } else {
        await Auth.login(userType, name, pass);
      }
      toast("مرحباً " + Auth.get().name, "success");
      navigateTo("/");
    } catch (e) {
      showError(e.message || (mode === "signup" ? "تعذر إنشاء الحساب" : "بيانات الدخول غير صحيحة"));
      submitBtn.disabled = false;
      updateMode();
    }
  }

  el("login-submit").addEventListener("click", handleSubmit);
  ["login-name", "signup-email", "login-pass", "signup-confirm"].forEach(id => {
    const input = el(id);
    if (input) input.addEventListener("keydown", e => { if (e.key === "Enter") handleSubmit(); });
  });

  const oauth = new URLSearchParams((location.hash.split("?")[1] || "")).get("oauth");
  if (oauth === "success") {
    if (Auth.isLoggedIn()) {
      toast("تم تسجيل الدخول بواسطة Google", "success");
      navigateTo("/");
      return;
    }
    showError("عاد Google دون جلسة Appwrite صالحة. حاول مرة أخرى.");
  } else if (oauth === "failed") {
    showError("لم يكتمل تسجيل الدخول بواسطة Google. يمكنك استخدام البريد وكلمة السر.");
  }

  updateMode();
}