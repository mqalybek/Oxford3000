#!/usr/bin/env node
/**
 * Обогащение словаря IPA-транскрипцией (7-е поле записи).
 *
 * Источник: open-dict-data/ipa-dict (Wiktionary-производные, открытая лицензия).
 *   https://github.com/open-dict-data/ipa-dict
 *   data/en_UK.txt  — британская норма (приоритет, стандарт школ КЗ/СНГ)
 *   data/en_US.txt  — американская (запасной вариант)
 *
 * Скачать перед запуском:
 *   curl -sSL -o /tmp/en_UK.txt https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_UK.txt
 *   curl -sSL -o /tmp/en_US.txt https://raw.githubusercontent.com/open-dict-data/ipa-dict/master/data/en_US.txt
 *
 * Запуск:  node tools/add-ipa.js [путь_к_UK] [путь_к_US]
 * Формат записи: [слово, часть речи, уровень, kz, ru, категория, ipa?]
 */
const fs = require('fs');
const path = require('path');

const UK_PATH = process.argv[2] || '/tmp/en_UK.txt';
const US_PATH = process.argv[3] || '/tmp/en_US.txt';
const DATA_PATH = path.join(__dirname, '..', 'data.js');

function parseIpaFile(file) {
  const map = new Map();
  if (!fs.existsSync(file)) return map;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const word = line.slice(0, tab).trim().toLowerCase();
    // Берём первый вариант транскрипции (до запятой), сохраняем /…/
    const ipa = line.slice(tab + 1).split(',')[0].trim();
    if (word && /^\/.*\/$/.test(ipa) && !map.has(word)) map.set(word, ipa);
  }
  return map;
}

const uk = parseIpaFile(UK_PATH);
const us = parseIpaFile(US_PATH);
if (!uk.size && !us.size) {
  console.error('Не найдены файлы IPA. Скачайте en_UK.txt / en_US.txt (см. шапку скрипта).');
  process.exit(1);
}

// Британская норма в приоритете, американская — запасная
function lookup(headword) {
  const hw = headword.trim().toLowerCase();
  const get = k => uk.get(k) || us.get(k);
  let ipa = get(hw);
  if (ipa) return ipa;
  // Слэш-формы вроде «a / an» — берём первый вариант
  if (hw.includes('/')) {
    const first = hw.split('/')[0].trim();
    ipa = get(first);
    if (ipa) return ipa;
  }
  // Фразовые («look after») намеренно пропускаем — частичная транскрипция вводит в заблуждение
  return null;
}

const src = fs.readFileSync(DATA_PATH, 'utf8');
const WORDS = eval(src + '; WORDS');

let added = 0, already = 0, missed = 0;
const missExamples = [];
const enriched = WORDS.map(w => {
  const row = w.slice(0, 6); // нормализуем до 6 базовых полей
  if (w[6] && /^\/.*\/$/.test(w[6])) { row[6] = w[6]; already++; return row; }
  const ipa = lookup(w[0]);
  if (ipa) { row[6] = ipa; added++; }
  else { missed++; if (missExamples.length < 25) missExamples.push(w[0]); }
  return row;
});

const out = 'const WORDS = [\n' + enriched.map(r => '  ' + JSON.stringify(r)).join(',\n') + '\n];\n';
fs.writeFileSync(DATA_PATH, out);

const total = enriched.length;
const withIpa = added + already;
console.log(`Записей: ${total}`);
console.log(`IPA добавлено: ${added}, уже было: ${already}, без IPA: ${missed}`);
console.log(`Покрытие IPA: ${(withIpa / total * 100).toFixed(1)}%`);
console.log(`Примеры без IPA: ${missExamples.join(', ')}`);
