#!/usr/bin/env node
/**
 * migrate-test-answers.mjs — فصل أجوبة الاختبارات عن المستند العام
 *
 * المشكلة: مجموعة tests مقروءة للزوار، وكل مستند يحمل questions كسلسلة JSON
 * تحتوي الحقل correct (مؤشر الجواب الصحيح). أي زائر يقرأ كل الأجوبة.
 *
 * الحل:
 *   1) مجموعة test_answers جديدة بلا أي صلاحية للمستخدمين (المفتاح الإداري فقط).
 *   2) لكل اختبار: ننقل مصفوفة correct إليها بمستند معرّفه = معرّف الاختبار.
 *   3) نعيد كتابة tests.questions بلا الحقل correct.
 *
 * السكربت آمن للتشغيل المتكرر: يتخطى ما نُقل بالفعل.
 *
 * الاستخدام:
 *   node scripts/migrate-test-answers.mjs            (معاينة)
 *   node scripts/migrate-test-answers.mjs --apply    (تنفيذ)
 *   node scripts/migrate-test-answers.mjs --rollback (إعادة الأجوبة إلى tests)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID || '6a54cfea00202c1d3e20';
const DATABASE = process.env.APPWRITE_DATABASE_ID || 'gmube_db';

const APPLY = process.argv.includes('--apply');
const ROLLBACK = process.argv.includes('--rollback');
// --populate: يملأ test_answers فقط دون المساس بـ tests.
// يُستخدم أولاً حتى تبقى الاختبارات تعمل ريثما تُنشر دالة التصحيح.
const POPULATE_ONLY = process.argv.includes('--populate');

const ANSWERS_COLLECTION = 'test_answers';

function readKey() {
  if (process.env.APPWRITE_API_KEY) return process.env.APPWRITE_API_KEY.trim();
  const file = join(ROOT, '.secrets', 'appwrite.key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  console.error('✖ لا يوجد مفتاح. ضع APPWRITE_API_KEY أو أنشئ .secrets/appwrite.key');
  process.exit(1);
}

const KEY = readKey();
const headers = {
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': KEY,
  'Content-Type': 'application/json',
};

async function api(path, { method = 'GET', body } = {}) {
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

/** يسترجع كل المستندات مع تقسيم الصفحات */
async function listAll(collection) {
  const out = [];
  let cursor = null;
  for (;;) {
    const queries = [{ method: 'limit', values: [100] }];
    if (cursor) queries.push({ method: 'cursorAfter', values: [cursor] });
    const qs = queries.map((q, i) => `queries[${i}]=${encodeURIComponent(JSON.stringify(q))}`).join('&');
    const r = await api(`/databases/${DATABASE}/collections/${collection}/documents?${qs}`);
    if (!r.ok) throw new Error(`${collection}: ${r.data?.message || r.status}`);
    out.push(...(r.data.documents || []));
    if ((r.data.documents || []).length < 100) break;
    cursor = r.data.documents[r.data.documents.length - 1].$id;
  }
  return out;
}

async function ensureCollection() {
  const exists = await api(`/databases/${DATABASE}/collections/${ANSWERS_COLLECTION}`);
  if (exists.ok) return 'موجودة';

  const created = await api(`/databases/${DATABASE}/collections`, {
    method: 'POST',
    body: {
      collectionId: ANSWERS_COLLECTION,
      name: 'Test Answers (server only)',
      permissions: [],            // لا قراءة ولا كتابة لأي مستخدم
      documentSecurity: false,
      enabled: true,
    },
  });
  if (!created.ok) throw new Error(`إنشاء المجموعة: ${created.data?.message || created.status}`);
  return 'أُنشئت';
}

async function ensureAttributes() {
  const spec = [
    { key: 'test_id', size: 64 },
    { key: 'answers', size: 4096 },
  ];
  const done = [];
  for (const a of spec) {
    const r = await api(`/databases/${DATABASE}/collections/${ANSWERS_COLLECTION}/attributes/string`, {
      method: 'POST',
      body: { key: a.key, size: a.size, required: true, array: false },
    });
    done.push(`${a.key}: ${r.ok ? 'أُضيف' : (r.data?.message || r.status)}`);
  }
  return done;
}

function parseQuestions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log(`\n▸ ${PROJECT} / ${DATABASE} · الوضع: ${ROLLBACK ? 'تراجع' : APPLY ? 'تنفيذ' : 'معاينة'}\n`);

  const tests = await listAll('tests');
  console.log(`▸ اختبارات: ${tests.length}`);

  if (ROLLBACK) {
    const answers = await listAll(ANSWERS_COLLECTION);
    const byId = new Map(answers.map((a) => [a.test_id, a]));
    let restored = 0;
    for (const t of tests) {
      const qs = parseQuestions(t.questions);
      const stored = byId.get(t.$id);
      if (!qs || !stored) continue;
      let list; try { list = JSON.parse(stored.answers); } catch { continue; }
      const merged = qs.map((q, i) => ({ ...q, correct: list[i] ?? 0 }));
      if (!APPLY) { restored++; continue; }
      const r = await api(`/databases/${DATABASE}/collections/tests/documents/${t.$id}`, {
        method: 'PATCH',
        body: { data: { questions: JSON.stringify(merged) } },
      });
      if (r.ok) restored++;
      else console.log(`  ✖ ${t.$id}: ${r.data?.message || r.status}`);
    }
    console.log(`\n${APPLY ? 'أُعيدت' : 'ستُعاد'} الأجوبة إلى ${restored} اختباراً.`);
    return;
  }

  const collState = APPLY ? await ensureCollection() : '(معاينة)';
  console.log(`▸ ${ANSWERS_COLLECTION}: ${collState}`);
  if (APPLY) {
    for (const line of await ensureAttributes()) console.log(`   • ${line}`);
  }

  const existing = APPLY ? new Set((await listAll(ANSWERS_COLLECTION)).map((d) => d.test_id)) : new Set();

  let migrated = 0, skipped = 0, failed = 0, leaked = 0;
  for (const t of tests) {
    const qs = parseQuestions(t.questions);
    if (!qs) { skipped++; continue; }

    const hasCorrect = qs.some((q) => q && Object.prototype.hasOwnProperty.call(q, 'correct'));
    if (!hasCorrect) { skipped++; continue; }
    leaked += qs.filter((q) => q && q.correct !== undefined).length;

    if (!APPLY) { migrated++; continue; }

    const answerList = qs.map((q) => (q && Number.isInteger(q.correct) ? q.correct : 0));
    const stripped = qs.map((q) => {
      const { correct, ...rest } = q || {};
      return rest;
    });

    // 1) اكتب الأجوبة في المجموعة المغلقة (معرّف ثابت = معرّف الاختبار)
    if (!existing.has(t.$id)) {
      const w = await api(`/databases/${DATABASE}/collections/${ANSWERS_COLLECTION}/documents`, {
        method: 'POST',
        body: { documentId: t.$id, data: { test_id: t.$id, answers: JSON.stringify(answerList) } },
      });
      if (!w.ok) {
        console.log(`  ✖ ${t.$id} (كتابة الأجوبة): ${w.data?.message || w.status}`);
        failed++;
        continue;
      }
    }

    // 2) أزل correct من المستند العام — بشرط نجاح الخطوة الأولى
    if (POPULATE_ONLY) { migrated++; continue; }

    const u = await api(`/databases/${DATABASE}/collections/tests/documents/${t.$id}`, {
      method: 'PATCH',
      body: { data: { questions: JSON.stringify(stripped) } },
    });
    if (!u.ok) {
      console.log(`  ✖ ${t.$id} (تحديث الاختبار): ${u.data?.message || u.status}`);
      failed++;
      continue;
    }
    migrated++;
  }

  console.log('');
  if (leaked) console.log(`▸ مؤشرات الجواب الصحيح المكشوفة الآن: ${leaked}`);
  console.log(`▸ ${APPLY ? 'نُقل' : 'سيُنقل'}: ${migrated} · متخطّى: ${skipped} · فشل: ${failed}`);
  if (!APPLY && migrated) console.log('\nأعد التشغيل مع --apply للتنفيذ.');
}

main().catch((e) => {
  console.error('✖ خطأ:', e.message);
  process.exit(1);
});
