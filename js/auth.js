// ── Authentication Manager ──────────────────────────────────────
const SESSION_KEY = "gmube_edu_session";
const OAUTH_TX_KEY = "gmube_oauth_bridge_tx";
const OAUTH_TX_STARTED_KEY = "gmube_oauth_bridge_started_at";
const OAUTH_TX_TTL_MS = 120000;

function bridgeWebViewDetected() {
  const ua = String(navigator.userAgent || "");
  const explicitWebView = /AppCreator24|AC24|;\s*wv\)|\bwv\b/i.test(ua);
  const androidWebView = /Android/i.test(ua) && /Version\/4\.0/i.test(ua) && /Chrome\//i.test(ua) && /Mobile/i.test(ua);
  const iosWebView = /(iPhone|iPad|iPod)/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua);
  // لا نبدّل Chrome/Safari العادي إلى رابط deep-link.
  return explicitWebView || androidWebView || iosWebView;
}

function randomOAuthTransaction() {
  if (window.crypto?.getRandomValues) {
    const bytes = new Uint8Array(24);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
}

function wait(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

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

  async loginWithGoogle() {
    if (!OAUTH_BRIDGE_ENABLED || !bridgeWebViewDetected()) {
      return startGoogleStudentLogin();
    }

    const tx = randomOAuthTransaction();
    localStorage.setItem(OAUTH_TX_KEY, tx);
    localStorage.setItem(OAUTH_TX_STARTED_KEY, String(Date.now()));

    const bridgeUrl = `${OAUTH_BRIDGE_ORIGIN}/api/start?tx=${encodeURIComponent(tx)}`;
    // فتح target=_blank هو المسار الذي يحوّل AppCreator24 إلى المتصفح الخارجي.
    const link = document.createElement("a");
    link.href = bridgeUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();

    // احتياط للبيئات التي تمنع النقر البرمجي؛ لا نضع السر أو النتيجة في الرابط.
    setTimeout(() => {
      if (document.visibilityState === "visible") {
        try { window.open(bridgeUrl, "_blank", "noopener,noreferrer"); } catch {}
      }
    }, 250);
    return { pending: true, tx };
  },

  async resumeGoogleBridge() {
    if (!OAUTH_BRIDGE_ENABLED) return null;
    const tx = localStorage.getItem(OAUTH_TX_KEY);
    const startedAt = Number(localStorage.getItem(OAUTH_TX_STARTED_KEY) || 0);
    if (!tx) return null;
    if (startedAt && Date.now() - startedAt > OAUTH_TX_TTL_MS) {
      localStorage.removeItem(OAUTH_TX_KEY);
      localStorage.removeItem(OAUTH_TX_STARTED_KEY);
      throw new Error("انتهت مهلة تسجيل الدخول بواسطة Google؛ ابدأ المحاولة من جديد.");
    }

    const deadline = Date.now() + Math.min(OAUTH_TX_TTL_MS, 30000);
    while (Date.now() < deadline) {
      try {
        const response = await fetch(`${OAUTH_BRIDGE_ORIGIN}/api/status?tx=${encodeURIComponent(tx)}`, {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = await response.json().catch(() => ({}));

        if (data.status === "ready" && data.userId && data.secret) {
          // createSession هو الجسر الوحيد بين نتيجة OAuth وسياق Appwrite داخل التطبيق.
          await account.createSession(data.userId, data.secret);
          localStorage.removeItem(OAUTH_TX_KEY);
          localStorage.removeItem(OAUTH_TX_STARTED_KEY);
          return await this.completeGoogleLogin();
        }
        if (data.status === "failed") {
          localStorage.removeItem(OAUTH_TX_KEY);
          localStorage.removeItem(OAUTH_TX_STARTED_KEY);
          throw new Error("لم يكتمل تسجيل الدخول بواسطة Google.");
        }
        if (response.status === 404 || response.status === 410) {
          localStorage.removeItem(OAUTH_TX_KEY);
          localStorage.removeItem(OAUTH_TX_STARTED_KEY);
          throw new Error("انتهت معاملة تسجيل الدخول؛ ابدأ المحاولة من جديد.");
        }
      } catch (error) {
        if (error?.message && !/Failed to fetch|NetworkError/i.test(error.message)) throw error;
      }
      await wait(1500);
    }
    // نبقي المعاملة كي تستمر محاولة قصيرة عند عودة التطبيق مرة أخرى.
    throw new Error("لم تصل نتيجة Google بعد؛ افتح تسجيل الدخول وحاول مرة أخرى.");
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