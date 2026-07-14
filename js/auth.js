// ── Authentication Manager ──────────────────────────────────────
const SESSION_KEY = "gmube_edu_session";

const Auth = {
  session: null,

  init() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        this.session = JSON.parse(raw);
        setSessionData(this.session.user_id, this.session.name, this.session.role ?? null);
      }
    } catch {}
  },

  async login(type, name, secret) {
    const user = await loginUser(type, name, secret);
    const s = {
      type,
      name: user.name,
      user_id: user.user_id,
      id: user.$id,
      subject: user.subject ?? undefined,
      grade: user.grade ?? undefined,
      role: user.role ?? "student",
    };
    this.session = s;
    setSessionData(s.user_id, s.name, s.role ?? null);
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    return s;
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
