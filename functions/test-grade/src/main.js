/**
 * test-grade — تصحيح الاختبار على الخادم
 *
 * لماذا؟
 * كانت مجموعة tests مقروءة للزوار وتحمل مع كل سؤال مؤشّر الجواب الصحيح
 * (correct). أي زائر كان يستطيع قراءة أجوبة كل الاختبارات (367 مؤشراً).
 *
 * الآن:
 *   - tests.questions لم يعد يحتوي correct إطلاقاً.
 *   - الأجوبة في مجموعة test_answers المغلقة تماماً (لا قراءة لأي مستخدم).
 *   - هذه الدالة تقرأها بمفتاح إداري وتُرجع النتيجة + مؤشرات الصح فقط.
 *
 * الاستجابة: { ok: true, score, total, correct: [..] } أو { ok: false }
 */

const ENDPOINT = process.env.APPWRITE_FUNCTION_API_ENDPOINT
  || process.env.APPWRITE_ENDPOINT
  || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.GMUBE_DATABASE_ID || 'gmube_db';
const ANSWERS_COLLECTION = 'test_answers';

const MAX_TEST_ID = 64;
const MAX_ANSWERS = 200;

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
  return { ok: res.ok, status: res.status, data };
}

export default async ({ req, res, log, error }) => {
  try {
    let payload;
    try {
      payload = JSON.parse(req.body || '{}');
    } catch {
      return res.json({ ok: false }, 400);
    }

    const key = process.env.APPWRITE_FUNCTION_API_KEY
      || (req.headers && (req.headers['x-appwrite-key'] || req.headers['X-Appwrite-Key']))
      || '';

    if (!PROJECT || !key) {
      error('missing project id or dynamic api key');
      return res.json({ ok: false }, 500);
    }

    const testId = String(payload.testId ?? '').trim().slice(0, MAX_TEST_ID);
    if (!testId) return res.json({ ok: false }, 400);

    if (!Array.isArray(payload.answers)) return res.json({ ok: false }, 400);
    const submitted = payload.answers.slice(0, MAX_ANSWERS).map((v) => (Number.isInteger(v) ? v : -1));

    const docRes = await appwrite(
      `/databases/${DATABASE}/collections/${ANSWERS_COLLECTION}/documents/${encodeURIComponent(testId)}`,
      { key }
    );

    if (!docRes.ok || !docRes.data?.answers) {
      log(`grade miss: no answers for ${testId}`);
      return res.json({ ok: false }, 404);
    }

    let answerKey;
    try {
      answerKey = JSON.parse(docRes.data.answers);
    } catch {
      error(`corrupt answers for ${testId}`);
      return res.json({ ok: false }, 500);
    }
    if (!Array.isArray(answerKey)) return res.json({ ok: false }, 500);

    const total = answerKey.length;
    const correct = [];
    let score = 0;
    for (let i = 0; i < total; i++) {
      if (submitted[i] === answerKey[i]) {
        score++;
        correct.push(i);
      }
    }

    // مؤشرات الصح تُعاد لعرض المراجعة بعد التسليم.
    // ملاحظة: أي مراجعة بعد التسليم تكشف الأجوبة بطبيعتها؛ ما أُغلق فعلاً هو
    // قراءتها **قبل** المحاولة ومن غير تسجيل دخول. الإغلاق الكامل يحتاج
    // تتبّع المحاولات على الخادم (مرحلة لاحقة).
    log(`graded ${testId}: ${score}/${total}`);
    return res.json({ ok: true, score, total, correct, correctOptions: answerKey });
  } catch (e) {
    error(`test-grade failed: ${e.message}`);
    return res.json({ ok: false }, 500);
  }
};
