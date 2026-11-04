#!/usr/bin/env node
/**
 * harden-appwrite.mjs — تشديد صلاحيات مجموعات Appwrite
 *
 * الاستخدام (من جذر المشروع):
 *   APPWRITE_API_KEY=... node scripts/harden-appwrite.mjs --inspect
 *   APPWRITE_API_KEY=... node scripts/harden-appwrite.mjs --apply
 *   APPWRITE_API_KEY=... node scripts/harden-appwrite.mjs --verify   (بلا مفتاح)
 *
 * المفتاح يُقرأ من متغيّر بيئة فقط ولا يُكتب في أي ملف.
 * بدون --apply يعمل السكربت في وضع المعاينة (لا يغيّر شيئاً).
 * --verify يفحص المجموعة كزائر (بلا مفتاح) ويؤكد أن الإغلاق نجح فعلاً.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID || '6a54cfea00202c1d3e20';
const DATABASE = process.env.APPWRITE_DATABASE_ID || 'gmube_db';

/** المفتاح من متغيّر البيئة، وإلا من .secrets/appwrite.key (مستثنى من git) */
function readKey() {
  if (process.env.APPWRITE_API_KEY) return process.env.APPWRITE_API_KEY.trim();
  const file = join(ROOT, '.secrets', 'appwrite.key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  return '';
}

const KEY = readKey();

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const VERIFY = args.includes('--verify');

if (!KEY && !VERIFY) {
  console.error('✖ مطلوب APPWRITE_API_KEY في متغيّر البيئة (أو استخدم --verify بلا مفتاح).');
  console.error('  أنشئه من: Appwrite Console → Overview → Integrations → API keys');
  console.error('  (صلاحيات: databases.read + collections.read + collections.write)');
  process.exit(1);
}

/**
 * ملاحظة مهمة (تصحيح بعد الفحص الفعلي):
 *   test_results و follows **ليستا مكشوفتين**. لديهما documentSecurity: true
 *   وبلا صلاحية قراءة على مستوى المجموعة، وفحص الزائر أعاد total=0 لكل منهما.
 *   إضافة read("users") إليهما كانت ستكون **تراجعاً أمنياً** لا تحسيناً،
 *   لذلك أُزيلتا من هذه القائمة نهائياً.
 *
 * الهدف الحقيقي الوحيد: students
 *   45 مستنداً (اسم + user_id + صف + دور) مقروءة للزوار لأن
 *   $permissions = ['read("any")'] و documentSecurity = false.
 *
 * teachers: تبقى مقروءة للزوار عمداً — هي صفحة دليل عام (اسم + مادة + صف)،
 *   وإغلاقها يكسر تصفح المدرّسين لغير المسجّلين. لا تُضاف هنا.
 */
const TARGETS = {
  students: {
    read: ['users'],
    write: [],
    why: 'بيانات 45 طالباً (اسم + user_id + صف) كانت مكشوفة لكل من يعرف معرّف المشروع',
    prerequisite:
      'دالة login-by-name منشورة + LOGIN_FUNCTION_ID مضبوط في js/config.js، وإلا لن يدخل الحساب القديم',
  },
};

const headers = {
  'X-Appwrite-Project': PROJECT,
  'X-Appwrite-Key': KEY,
  'Content-Type': 'application/json',
};

const api = async (path, options = {}) => {
  const res = await fetch(`${ENDPOINT}${path}`, { headers, ...options });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) {
    const msg = body?.message || res.statusText;
    throw new Error(`${res.status} ${msg}`);
  }
  return body;
};

const getCollection = (id) => api(`/databases/${DATABASE}/collections/${id}`);

const setCollection = (id, name, permissions, documentSecurity) =>
  api(`/databases/${DATABASE}/collections/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ name, permissions, documentSecurity, enabled: true }),
  });

const fmt = (perms = []) => (perms.length ? perms.join(', ') : '— (لا شيء)');

/** فحص الزائر: نفس الطلب الذي ينجح حالياً من أي متصفح بلا تسجيل دخول */
async function guestProbe(collectionId) {
  const url = `${ENDPOINT}/databases/${DATABASE}/collections/${collectionId}/documents`;
  const res = await fetch(url, { headers: { 'X-Appwrite-Project': PROJECT } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, total: body?.total ?? null, message: body?.message || null };
}

async function verify() {
  console.log(`\n▸ فحص الزائر — المشروع ${PROJECT} · قاعدة البيانات ${DATABASE}`);
  console.log('  (طلب بلا مفتاح وبلا جلسة، كما يفعل أي شخص على الإنترنت)\n');

  let leaked = 0;
  for (const id of Object.keys(TARGETS)) {
    const r = await guestProbe(id);
    const safe = r.status === 401 || r.status === 403 || r.total === 0;
    if (!safe) leaked++;
    console.log(`${safe ? '✔' : '✖'} ${id}: HTTP ${r.status} · total=${r.total ?? '—'}${r.message ? ` · ${r.message}` : ''}`);
    console.log(`   ${safe ? 'مغلقة — لا تسريب' : 'لا تزال مكشوفة — البيانات مقروءة للزوار'}`);
  }

  console.log('');
  if (leaked) {
    console.log(`${leaked} مجموعة لا تزال مكشوفة.`);
    process.exit(2);
  }
  console.log('كل المجموعات المستهدفة مغلقة أمام الزوار.');
}

async function main() {
  if (VERIFY) return verify();

  console.log(`\n▸ المشروع: ${PROJECT} · قاعدة البيانات: ${DATABASE}`);
  console.log(`▸ الوضع: ${APPLY ? 'تطبيق فعلي' : 'معاينة فقط (أضف --apply للتطبيق)'}\n`);

  const rows = [];
  for (const [id, target] of Object.entries(TARGETS)) {
    let current;
    try {
      current = await getCollection(id);
    } catch (e) {
      console.log(`✖ ${id}: تعذّر القراءة — ${e.message}`);
      continue;
    }

    const before = current.$permissions || [];
    const after = [
      ...target.read.map((r) => `read("${r}")`),
      ...target.write.map((w) => `write("${w}")`),
    ];

    const changed = JSON.stringify([...before].sort()) !== JSON.stringify([...after].sort());
    rows.push({ id, before, after, changed, why: target.why, prerequisite: target.prerequisite });

    if (changed && APPLY) {
      try {
        await setCollection(id, current.name, after, current.documentSecurity);
        console.log(`✔ ${id} — تم التحديث`);
      } catch (e) {
        console.log(`✖ ${id} — فشل التحديث: ${e.message}`);
      }
    }
  }

  console.log('\n┌─ الحالة ────────────────────────────────────────────────');
  for (const r of rows) {
    console.log(`│ ${r.id}`);
    console.log(`│   الآن : ${fmt(r.before)}`);
    console.log(`│   بعد  : ${fmt(r.after)}`);
    console.log(`│   السبب: ${r.why}`);
    if (r.prerequisite) console.log(`│   شرط : ${r.prerequisite}`);
    console.log('│');
  }
  console.log('└─────────────────────────────────────────────────────────');

  const pending = rows.filter((r) => r.changed).length;
  if (!APPLY && pending) {
    console.log(`\n${pending} مجموعة تحتاج تغييراً. أعد التشغيل مع --apply لتطبيقها.`);
  } else if (APPLY) {
    console.log('\nتم. تحقّق الآن: node scripts/harden-appwrite.mjs --verify');
  } else {
    console.log('\nكل المجموعات في الوضع المطلوب بالفعل.');
  }
}

main().catch((e) => {
  console.error('✖ خطأ:', e.message);
  process.exit(1);
});
