#!/usr/bin/env node
/**
 * deploy-function.mjs — نشر دالة Appwrite من المجلد المحلي
 *
 * الاستخدام:
 *   node scripts/deploy-function.mjs login-by-name
 *   node scripts/deploy-function.mjs login-by-name --activate
 *
 * المفتاح يُقرأ من APPWRITE_API_KEY أو من .secrets/appwrite.key (مستثنى من git)
 * ولا يظهر أبداً في سطر الأمر.
 */

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID || '6a54cfea00202c1d3e20';

const functionId = process.argv[2];
const activate = process.argv.includes('--activate');
const ensure = process.argv.includes('--ensure');

if (!functionId) {
  console.error('✖ مرّر معرّف الدالة: node scripts/deploy-function.mjs <functionId> [--ensure] [--activate]');
  process.exit(1);
}

function readKey() {
  if (process.env.APPWRITE_API_KEY) return process.env.APPWRITE_API_KEY.trim();
  const file = join(ROOT, '.secrets', 'appwrite.key');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  console.error('✖ لا يوجد مفتاح. ضع APPWRITE_API_KEY أو أنشئ .secrets/appwrite.key');
  process.exit(1);
}

const KEY = readKey();
const headers = { 'X-Appwrite-Project': PROJECT, 'X-Appwrite-Key': KEY };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const fnDir = join(ROOT, 'functions', functionId);
  if (!existsSync(fnDir)) {
    console.error(`✖ لا يوجد مجلد ${fnDir}`);
    process.exit(1);
  }

  // 0) إنشاء الدالة نفسها إن لم تكن موجودة (--ensure)
  if (ensure) {
    const probe = await fetch(`${ENDPOINT}/functions/${functionId}`, { headers });
    if (probe.status === 404) {
      const created = await fetch(`${ENDPOINT}/functions`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionId,
          name: functionId,
          runtime: 'node-22',
          execute: ['any'],
          // أقل صلاحية ممكنة: قراءة المستندات فقط، بلا كتابة
          scopes: ['documents.read'],
          entrypoint: 'src/main.js',
          commands: '',
          timeout: 15,
          enabled: true,
          logging: true,
        }),
      });
      const body = await created.json();
      if (!created.ok) {
        console.error(`✖ فشل إنشاء الدالة: ${body.message || created.status}`);
        process.exit(1);
      }
      console.log(`✔ أُنشئت الدالة ${functionId} (${body.runtime}, scopes: ${(body.scopes || []).join(',')})`);
    } else {
      console.log(`▸ الدالة ${functionId} موجودة`);
    }
  }

  // 1) حزمة tar.gz (بلا node_modules — Appwrite يثبّت التبعيات بنفسه)
  const tarball = join(tmpdir(), `fn-${functionId}-${Date.now()}.tar.gz`);
  // على Windows يفسّر GNU tar المسار C:\ كأنه مضيف بعيد — --force-local يمنع ذلك
  const tarFlags = ['-czf', tarball, '--exclude=node_modules', '-C', fnDir, '.'];
  if (process.platform === 'win32') tarFlags.unshift('--force-local');
  execFileSync('tar', tarFlags, { stdio: 'inherit' });
  const bytes = readFileSync(tarball);
  console.log(`▸ الحزمة: ${(bytes.length / 1024).toFixed(1)} KB`);

  // 2) إنشاء النشر
  const form = new FormData();
  form.append('entrypoint', 'src/main.js');
  form.append('commands', '');
  form.append('activate', activate ? 'true' : 'false');
  form.append('code', new Blob([bytes], { type: 'application/gzip' }), `${functionId}.tar.gz`);

  const res = await fetch(`${ENDPOINT}/functions/${functionId}/deployments`, {
    method: 'POST',
    headers,
    body: form,
  });
  const dep = await res.json();
  if (!res.ok) {
    console.error(`✖ فشل إنشاء النشر: ${dep.message || res.status}`);
    process.exit(1);
  }
  console.log(`▸ النشر: ${dep.$id} · الحالة: ${dep.status}`);

  // 3) متابعة البناء
  for (let i = 0; i < 60; i++) {
    await sleep(3000);
    const r = await fetch(`${ENDPOINT}/functions/${functionId}/deployments/${dep.$id}`, { headers });
    const d = await r.json();
    process.stdout.write(`\r  البناء: ${d.status}      `);
    if (d.status === 'ready' || d.status === 'failed') {
      console.log('');
      if (d.status === 'failed') {
        console.error(`✖ فشل البناء:\n${d.buildLogs || '(بلا سجل)'}`);
        process.exit(1);
      }
      console.log(`✔ جاهز · buildId ${d.buildId}`);
      if (!activate) {
        console.log('ℹ لم يُفعَّل. أعد التشغيل مع --activate لتفعيله.');
      }
      return;
    }
  }
  console.error('\n✖ انتهى وقت الانتظار.');
  process.exit(1);
}

main().catch((e) => {
  console.error('✖ خطأ:', e.message);
  process.exit(1);
});
