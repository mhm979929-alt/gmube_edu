/**
 * login-by-name — تسجيل الدخول بالاسم عبر الخادم
 *
 * لماذا هذه الدالة؟
 * الحسابات القديمة في المنصة لا تملك بريداً حقيقياً؛ بريدها الاصطناعي هو
 * `${user_id}@gmube.app`. لتحويل الاسم إلى هذا البريد كان التطبيق يستعلم
 * مجموعة students/teachers من المتصفح — وهذا يجعلها مقروءة للزوار ويكشف
 * أسماء الطلاب ومعرّفاتهم لأي شخص على الإنترنت.
 *
 * هذه الدالة تنقل الاستعلام إلى الخادم بمفتاح إداري، وتُرجع جلسة صالحة فقط
 * عند صحة الاسم وكلمة السر معاً، فلا يحدث أي تعداد.
 *
 * الاستجابة: { ok: true, userId, secret, profile } أو { ok: false } — بلا تفاصيل.
 *
 * ملاحظة Appwrite 1.6+: مفتاح الدالة الديناميكي يصل في ترويسة x-appwrite-key
 * وليس في متغير بيئة، لذلك يُقرأ من الطلب.
 */

const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT
  || process.env.APPWRITE_ENDPOINT
  || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.GMUBE_DATABASE_ID || 'gmube_db';
const DOMAIN = process.env.GMUBE_ACCOUNT_DOMAIN || 'gmube.app';

const MAX_NAME = 80;
const MAX_PASS = 256;

/**
 * ميزانية زمنية موحّدة للفشل.
 * مسار "الاسم غير موجود" لا يتصل بالشبكة، ومسار "كلمة سر خاطئة" ينشئ جلسة
 * فاشلة (رحلة شبكة إضافية). بدون توحيد الزمن يمكن تمييز الحالتين بالتوقيت
 * فيُعرف أي اسم مسجّل في المنصة. لذلك نُكمل كل فشل إلى نفس الميزانية ± نطاق
 * عشوائي صغير، فيصبح الزمن ضجيجاً لا إشارة.
 */
const FAIL_BUDGET_MS = 1100;
const FAIL_JITTER_MS = 90;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** يُكمل حتى الميزانية المطلوبة من لحظة بدء الطلب */
async function padTo(startedAt, budget = FAIL_BUDGET_MS) {
  const jitter = Math.floor(Math.random() * FAIL_JITTER_MS);
  const remaining = budget + jitter - (Date.now() - startedAt);
  if (remaining > 0) await sleep(remaining);
}

async function appwrite(path, { method = 'GET', body, key } = {}) {
  const headers = { 'X-Appwrite-Project': PROJECT, 'Content-Type': 'application/json' };
  if (key) headers['X-Appwrite-Key'] = key;
  const res = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  const resHeaders = {};
  if (res.headers && typeof res.headers.forEach === 'function') {
    res.headers.forEach((value, name) => { resHeaders[String(name).toLowerCase()] = value; });
  }
  return { ok: res.ok, status: res.status, data, headers: resHeaders };
}

const sanitize = (value, max) => String(value ?? '').trim().slice(0, max);

export default async ({ req, res, log, error }) => {
  const startedAt = Date.now();
  try {
    let payload;
    try {
      payload = JSON.parse(req.body || '{}');
    } catch {
      return res.json({ ok: false }, 400);
    }

    // المفتاح الديناميكي: ترويسة في Appwrite 1.6+، ومتغير بيئة في الإصدارات الأقدم
    const key = process.env.APPWRITE_FUNCTION_API_KEY
      || (req.headers && (req.headers['x-appwrite-key'] || req.headers['X-Appwrite-Key']))
      || '';

    if (!PROJECT || !key) {
      error('missing project id or dynamic api key');
      return res.json({ ok: false }, 500);
    }

    const type = payload.type === 'teacher' ? 'teacher' : 'student';
    const name = sanitize(payload.name, MAX_NAME);
    const password = String(payload.password ?? '').slice(0, MAX_PASS);

    if (!name || !password) return res.json({ ok: false }, 400);

    const collection = type === 'teacher' ? 'teachers' : 'students';

    // Appwrite 2.x: الاستعلامات تُرسل كـ JSON مفهرس في المعامل queries
    const queries = [
      { method: 'equal', attribute: 'name', values: [name] },
      { method: 'limit', values: [1] },
    ];
    const qs = queries
      .map((q, i) => `queries[${i}]=${encodeURIComponent(JSON.stringify(q))}`)
      .join('&');

    const found = await appwrite(
      `/databases/${DATABASE}/collections/${collection}/documents?${qs}`,
      { key }
    );

    const doc = found.ok && Array.isArray(found.data?.documents) ? found.data.documents[0] : null;
    if (!doc || !doc.user_id) {
      await padTo(startedAt);
      log(`login miss: ${type} name not found`);
      return res.json({ ok: false });
    }

    // البريد الاصطناعي هو الجسر الوحيد بين الاسم القديم وحساب Appwrite
    const email = `${doc.user_id}@${DOMAIN}`;

    // التحقق من كلمة السر: إنشاء جلسة فعلية. النجاح وحده يعني صحتها.
    //
    // key = null إجباري: عند إنشاء الجلسة بمفتاح إداري تُحتسب الجلسة ضمن جلسات
    // المستخدم بلا فائدة. الطلب المجهول هو ما يفعله المتصفح نفسه.
    const session = await appwrite('/account/sessions/email', {
      method: 'POST',
      key: null,
      body: { email, password },
    });

    // Appwrite 2.x لا يضع السرّ في جسم الاستجابة للطلبات المجهولة (الحقل secret
    // يصل فارغاً)، بل يضعه في كوكي a_session_<project> وترويسة X-Fallback-Cookies.
    // قيمة الكوكي هي نفسها السرّ الذي يُعيده الإصدار الأقدم في الجسم.
    let sessionSecret = typeof session.data?.secret === 'string' ? session.data.secret : '';
    if (!sessionSecret) {
      const cookieName = `a_session_${PROJECT}`;
      const fallback = session.headers?.['x-fallback-cookies'];
      if (fallback) {
        try {
          const jar = JSON.parse(fallback);
          if (jar && typeof jar[cookieName] === 'string') sessionSecret = jar[cookieName];
        } catch { /* ترويسة غير صالحة — ننتقل للبديل */ }
      }
      if (!sessionSecret) {
        const rawCookie = session.headers?.['set-cookie'] || '';
        const match = rawCookie.match(new RegExp(`${cookieName}=([^;,\\s]+)`));
        if (match) sessionSecret = match[1];
      }
    }

    if (!session.ok || !sessionSecret || !session.data?.userId) {
      await padTo(startedAt);
      // نوع الخطأ يفرّق بين كلمة سر خاطئة (user_invalid_credentials)
      // وصلاحية ناقصة للدالة (general_unauthorized_scope) — بلا أي بيانات حساسة.
      log(`login miss: ${type} bad password (${session.data?.type || session.status})`);
      return res.json({ ok: false });
    }

    // العميل الذي ينشئ جلسته بنفسه (الويب) لا يحتاج جلسة الخادم، فنحذفها
    // فوراً كي لا تتراكم جلسات يتيمة مع كل تسجيل دخول.
    // الحذف يتم بسرّ الجلسة نفسها عبر /account/sessions/current — لا يحتاج مفتاحاً.
    if (payload.clientCreatesSession === true) {
      try {
        const del = await fetch(`${ENDPOINT}/account/sessions/current`, {
          method: 'DELETE',
          headers: { 'X-Appwrite-Project': PROJECT, 'X-Appwrite-Session': sessionSecret },
        });
        log(`dispose session: ${del.status}`);
      } catch (e) { log(`dispose session failed: ${e.message}`); }
    }

    log(`login ok: ${type} ${session.data.userId}`);
    return res.json({
      ok: true,
      userId: session.data.userId,
      secret: sessionSecret,
      // البريد الاصطناعي — يُعيده للعميل الذي يستطيع إنشاء جلسته بنفسه (الويب).
      // لا يُكشف إلا بعد التحقق من كلمة السر، وهو بريد المستخدم نفسه.
      email,
      profile: {
        name: doc.name || '',
        subject: doc.subject || '',
        grade: doc.grade || '',
        role: doc.role || type,
      },
    });
  } catch (e) {
    error(`login-by-name failed: ${e.message}`);
    return res.json({ ok: false }, 500);
  }
};
