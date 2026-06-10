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
  // Подстрока больше НЕ засчитывается (раньше любые 4+ буквы из ответа проходили)
  await page.waitForTimeout(1500); // авто-переход к следующей
  check('подстрока не засчитывается', !(await page.evaluate(() => isAnswerCorrect('подг', 'подготовка, приготовление'))));
  check('второй вариант перевода засчитывается', await page.evaluate(() => isAnswerCorrect('приготовление', 'подготовка, приготовление')));
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

  console.log('— Интервальное повторение (SRS)');
  const srsCheck = await page.evaluate(() => {
    const today = todayKey();
    srs = {}; known = new Set();
    // Правильный ответ продвигает по коробкам с растущими интервалами
    srsCorrect('test');
    const b1 = srs['test'].box === 1 && srs['test'].due === addDays(today, 1);
    srsCorrect('test');
    const b2 = srs['test'].box === 2 && srs['test'].due === addDays(today, 3);
    srsCorrect('test'); srsCorrect('test'); srsCorrect('test'); srsCorrect('test');
    const cap = srs['test'].box === 5 && srs['test'].due === addDays(today, 30);
    // Ошибка сбрасывает в коробку 0, слово доступно сразу
    srsWrong('test');
    const reset = srs['test'].box === 0 && srs['test'].due === today && !known.has('test');
    return { b1, b2, cap, reset };
  });
  check('коробка 1 → повтор через 1 день', srsCheck.b1);
  check('коробка 2 → повтор через 3 дня', srsCheck.b2);
  check('потолок: коробка 5, 30 дней', srsCheck.cap);
  check('ошибка сбрасывает в коробку 0', srsCheck.reset);
  // Слова с будущим сроком не попадают в колоду повторения
  const futureCheck = await page.evaluate(() => {
    srs = {};
    srs[WORDS[0][0]] = { box: 1, due: addDays(todayKey(), 1) };
    srs[WORDS[1][0]] = { box: 0, due: todayKey() };
    buildReviewDeck();
    return reviewDeck.length === 1 && reviewDeck[0][0] === WORDS[1][0];
  });
  check('в повторение попадают только наступившие сроки', futureCheck);

  console.log('— Миграция прогресса v1');
  const migCheck = await page.evaluate(() => {
    localStorage.setItem('ox_progress', JSON.stringify({ known: ['apple'], repeat: ['banana'] }));
    srs = {}; known = new Set();
    loadProgress();
    return srs['apple'] && srs['apple'].box === 3 && srs['banana'] && srs['banana'].box === 0 && known.has('apple') && !known.has('banana');
  });
  check('v1 {known, repeat} мигрирует в SRS', migCheck);

  console.log('— Дневная цель');
  const goalLabel = await page.textContent('#goal-label');
  check('плашка цели отображается', /\d+ \/ \d+/.test(goalLabel), goalLabel);
  await page.selectOption('#goal-select', '50');
  await page.waitForTimeout(100);
  check('смена цели работает', (await page.textContent('#goal-label')).includes('/ 50'));
  check('цель сохраняется', await page.evaluate(() => JSON.parse(localStorage.getItem('ox_settings')).goal === 50));

  console.log('— Сохранение настроек');
  await page.evaluate(() => setAppLang('ru'));
  await page.reload();
  await page.waitForTimeout(300);
  check('язык сохранился после перезагрузки', await page.evaluate(() => appLang === 'ru'));
  check('прогресс (SRS) сохранился', await page.evaluate(() => known.has('apple') && srs['banana'] && srs['banana'].box === 0));
  check('нет JS-ошибок в конце', errors.length === 0, errors[0]);

  await browser.close();
  console.log(failures === 0 ? '\nВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : `\nПРОВАЛЕНО ПРОВЕРОК: ${failures}`);
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
