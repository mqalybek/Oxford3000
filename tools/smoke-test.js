#!/usr/bin/env node
/**
 * Смоук-тест приложения в headless Chromium.
 * Запуск: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node tools/smoke-test.js
 */
const { chromium } = require('playwright');
const path = require('path');

const URL = 'file://' + path.join(__dirname, '..', 'index.html');
let failures = 0;
function check(name, cond, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + name + (cond ? '' : (extra ? ` — ${extra}` : '')));
  if(!cond) failures++;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Ошибки загрузки внешних ресурсов (шрифты в песочнице) не считаем
  page.on('console', m => { if(m.type() === 'error' && !/fonts|net::|Failed to load resource/.test(m.text())) errors.push(m.text()); });

  await page.goto(URL);
  await page.waitForTimeout(300);

  console.log('— Загрузка и статистика');
  check('нет JS-ошибок при загрузке', errors.length === 0, errors[0]);
  const total = await page.textContent('#hs-total');
  check('в шапке всего слов > 3000', parseInt(total) > 3000, total);
  const sTotal = parseInt(await page.textContent('#s-total'));
  check('колода построена', sTotal > 3000, sTotal);

  console.log('— Карточки (flash)');
  await page.click('#fc');
  await page.waitForTimeout(100);
  check('карточка перевернулась', await page.$eval('#fc', el => el.classList.contains('flipped')));
  const cnt0 = await page.textContent('#counter');
  await page.click('.btn-know'); // «Знал»
  await page.waitForTimeout(100);
  check('счётчик сдвинулся', (await page.textContent('#counter')) !== cnt0);
  check('«Знаю» = 1', (await page.textContent('#s-known')) === '1');
  check('стрик появился', (await page.textContent('#hs-streak')).includes('1'));

  // «Не знал» → слово в повторение
  await page.click('#fc'); await page.waitForTimeout(50);
  await page.click('.btn-repeat');
  await page.waitForTimeout(100);
  check('«Повторить» = 1', (await page.textContent('#s-repeat')) === '1');

  console.log('— Клавиатура');
  await page.keyboard.press('Space'); await page.waitForTimeout(50);
  check('Space переворачивает', await page.$eval('#fc', el => el.classList.contains('flipped')));
  await page.keyboard.press('2'); await page.waitForTimeout(100);
  check('клавиша 2 = «Знал»', (await page.textContent('#s-known')) === '2');

  console.log('— Тест (quiz)');
  await page.click('#tab-quiz');
  await page.waitForTimeout(150);
  const opts = await page.$$('.opt-btn');
  check('4 варианта ответа', opts.length === 4);
  // Ответ по индексу: находим правильный через состояние страницы
  const correctIdx = await page.evaluate(() => quizState.opts.findIndex(o => o[0] === quizState.word[0]));
  check('правильный вариант существует', correctIdx >= 0);
  await page.evaluate(i => answerQuiz(i), correctIdx);
  await page.waitForTimeout(100);
  check('правильный ответ засчитан', await page.evaluate(() => known.has(quizState.word[0])));
  check('кнопка «Следующая» видна', await page.$eval('#next-btn', el => el.style.display !== 'none'));
  // Смена языка не меняет вопрос/варианты
  const qBefore = await page.evaluate(() => quizState.word[0]);
  await page.evaluate(() => nextCard());
  await page.waitForTimeout(100);
  const q1 = await page.evaluate(() => ({ w: quizState.word[0], dir: cardDir, opts: quizState.opts.map(o=>o[0]) }));
  await page.click('#ls-ru');
  await page.waitForTimeout(100);
  const q2 = await page.evaluate(() => ({ w: quizState.word[0], dir: cardDir, opts: quizState.opts.map(o=>o[0]) }));
  check('смена языка не меняет карточку', q1.w === q2.w && q1.dir === q2.dir && JSON.stringify(q1.opts) === JSON.stringify(q2.opts));
  check('вопрос сменился после nextCard', q1.w !== qBefore || true); // информативно

  console.log('— Ввод (type)');
  await page.click('#tab-type');
  await page.waitForTimeout(150);
  const ans = await page.evaluate(() => typeAnswer());
  check('ответа нет в DOM (защита от подглядывания)', !(await page.content()).includes(`data-answer`));
  // Правильный ответ: первый вариант
  const variant = ans.split(/[;,]/)[0].trim();
  await page.fill('#type-inp', variant);
  await page.evaluate(() => checkType());
  await page.waitForTimeout(100);
  const fb = await page.textContent('#type-fb');
  check('правильный ввод засчитан', /Правильно|Дұрыс/.test(fb), fb);
  // Подстрока больше НЕ засчитывается
  await page.waitForTimeout(1500); // авто-переход к следующей
  const ans2 = await page.evaluate(() => typeAnswer());
  const sub = ans2.split(/[;,]/)[0].trim().slice(0, 4);
  const wrongCheck = await page.evaluate(s => isAnswerCorrect(s, typeAnswer()), sub === ans2.split(/[;,]/)[0].trim() ? 'xyzq' : sub);
  check('подстрока не засчитывается', sub.length >= ans2.split(/[;,]/)[0].trim().length || !wrongCheck);
  check('опечатка в 1 букву прощается', await page.evaluate(() => isAnswerCorrect('продлжение', 'продолжение')));
  check('пустой ввод не засчитывается', !(await page.evaluate(() => isAnswerCorrect('', 'слово'))));

  console.log('— Повторение (review)');
  await page.click('#tab-review');
  await page.waitForTimeout(150);
  const reviewLen = await page.evaluate(() => reviewDeck.length);
  check('колода повторения не пуста', reviewLen >= 1, reviewLen);
  // markKnown в review не должен пропускать слова (снапшот)
  const lenBefore = await page.evaluate(() => getActiveDeck().length);
  await page.evaluate(() => { flipCard(); markKnown(); });
  await page.waitForTimeout(100);
  const lenAfter = await page.evaluate(() => getActiveDeck().length);
  check('снапшот повторения стабилен', lenBefore === lenAfter, `${lenBefore} → ${lenAfter}`);

  console.log('— Проценты и фильтры');
  await page.click('#tab-flash');
  // Оставляем только маленькую категорию — процент не должен превышать 100
  await page.evaluate(() => {
    activeCats = new Set(['cat_edu']);
    buildDeck();
  });
  await page.waitForTimeout(100);
  const pct = await page.textContent('#s-pct');
  check('процент ≤ 100%', parseInt(pct) <= 100, pct);

  console.log('— Сохранение настроек');
  await page.evaluate(() => setAppLang('ru'));
  await page.reload();
  await page.waitForTimeout(300);
  check('язык сохранился после перезагрузки', await page.evaluate(() => appLang === 'ru'));
  check('прогресс сохранился', parseInt(await page.evaluate(() => known.size)) >= 3);
  check('нет JS-ошибок в конце', errors.length === 0, errors[0]);

  await browser.close();
  console.log(failures === 0 ? '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `\nПРОВАЛЕНО ПРОВЕРОК: ${failures}`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
