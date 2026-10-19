// public/data/*.json 의 표시용 문자열에 라틴 문자나 일본어 가나가 섞여 있으면 실패한다.
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATA = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data');
const DISPLAY_FIELDS = new Set(['name', 'sub', 'kind', 'type', 'item']);
const BAD = /[A-Za-z぀-ヿ]/;
// 공식 텍스트가 쓰는 묶음 표기("폭탄 화살 x5")의 x는 허용
const clean = (s) => s.replace(/\bx\d+\b/g, '');

let bad = 0;
for (const file of (await readdir(DATA)).filter((f) => f.endsWith('.json') && f !== 'index.json')) {
  const rows = JSON.parse(await readFile(path.join(DATA, file), 'utf8'));
  const check = (obj, where) => {
    for (const [k, v] of Object.entries(obj)) {
      if (DISPLAY_FIELDS.has(k) && typeof v === 'string' && BAD.test(clean(v))) {
        bad++;
        if (bad <= 40) console.log(`${file} ${where}.${k}: "${v}"`);
      }
    }
  };
  for (const r of rows) {
    check(r, r.id);
    for (const c of r.chests ?? []) check(c, `${r.id}/${c.id}`);
  }
}
if (bad) {
  console.error(`\n한국어가 아닌 표시 문자열 ${bad}건`);
  process.exit(1);
}
console.log('OK: 표시 문자열에 라틴/가나 문자 없음');
