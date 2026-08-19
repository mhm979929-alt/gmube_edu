// ── Authentication Manager ──────────────────────────────────────
const SESSION_KEY = "gmube_edu_session";

const Auth = {
  session: null,

  async init() {
    // لا نستخدم localStorage لإثبات الدخول؛ Account.get هو مصدر الحقيقة الوحيد.
    const appUser = await getCurrentSession();
    if (!appUser) {
      this.session = null;
      setSessionData(null, null, null);
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    let profile = null;
    try { profile = await findProfileForAccountUser(appUser); } catch {}

    const session = {
      // الحساب غير المرتبط بملف يُعامل كطالب فقط؛ لا نثق بنوع مخزن في المتصفح.
      type: profile?.type || "student",
      role: profile?.role || "student",
      name: profile?.name || appUser.name || appUser.email,
      user_id: profile?.user_id || appUser.$id,
      id: appUser.$id,
      subject: profile?.subject,
      grade: profile?.grade,
    };
    this.session = session;
    setSessionData(session.user_id, session.name, session.role);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  persist(user, fallbackType = "student") {
    const session = {
      type: user.type || fallbackType,
      role: user.role || user.type || (fallbackType === "teacher" ? "teacher" : "student"),
      name: user.name,
      user_id: user.user_id || user.$id || user.id,
      id: user.$id || user.id || user.user_id,
      subject: user.subject ?? undefined,
      grade: user.grade ?? undefined,
    };
    this.session = session;
    setSessionData(session.user_id, session.name, session.role);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async login(type, name, secret) {
    const user = await loginUser(type, name, secret);
    return this.persist(user, type);
  },

  async registerStudent(name, email, password) {
    const user = await registerStudentAccount(name, email, password);
    return this.persist(user, "student");
  },

  loginWithGoogle() {
    return startGoogleStudentLogin();
  },

  async completeGoogleLogin() {
    const session = await this.init();
    if (!session) throw new Error("تعذر التحقق من جلسة Google");
    return session;
  },

  logout() {
    this.session = null;
    setSessionData(null, null, null);
    localStorage.removeItem(SESSION_KEY);
    logoutUser().catch(() => {});
  },

  isLoggedIn() {
    return !!this.session;
  },

  get() {
    return this.session;
  },
};