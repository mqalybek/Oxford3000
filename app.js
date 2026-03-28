let appLang = 'kz'; // Default: Kazakh
let mode = 'flash';
let activeLevels = new Set(['A1','A2','B1','B2']);
let deck = [];
let idx = 0;
let flipped = false;
let known = new Set();
let repeat = new Set();
let quizAnswered = false;
let typeAnswered = false;
let cardDir = true;
let soundOn = true;
let correctStreak = 0;
let timerInterval = null;
let timerSeconds = 10;

const UI_TEXT = {
  header_words: { ru: 'Слов', kz: 'Сөздер' },
  header_known: { ru: 'Знаю', kz: 'Білемін' },
  header_progress: { ru: 'Прогресс', kz: 'Прогресс' },
  header_streak: { ru: 'Дней подряд', kz: 'Қатарынан күн' },
  hero_title: { ru: 'Выучи английский<br>раз и навсегда', kz: 'Ағылшын тілін<br>біржолата үйреніңіз' },
  hero_subtitle: { ru: '3000 самых важных слов Oxford с переводом на русский. Карточки, тесты, ввод — три режима тренировки.', kz: 'Оксфордтың ең маңызды 3000 сөзі. Флеш-карталар, тесттер, жазу — 3 жаттығу режимі.' },
  btn_start: { ru: 'Начать тренировку →', kz: 'Жаттығуды бастау →' },
  lvl_a1: { ru: 'A1 — Начальный', kz: 'A1 — Бастапқы' },
  lvl_a2: { ru: 'A2 — Элементарный', kz: 'A2 — Қарапайым' },
  lvl_b1: { ru: 'B1 — Средний', kz: 'B1 — Орташа' },
  lvl_b2: { ru: 'B2 — Выше среднего', kz: 'B2 — Орташадан жоғары' },
  tab_flash: { ru: 'Карточки', kz: 'Флеш-карталар' },
  tab_quiz: { ru: 'Тест 4 варианта', kz: 'Тест 4 нұсқа' },
  tab_type: { ru: 'Введи перевод', kz: 'Аударманы жаз' },
  tab_review: { ru: 'Повторение', kz: 'Қайталау' },
  lbl_level: { ru: 'Уровень:', kz: 'Деңгей:' },
  btn_shuffle: { ru: '🔀 Перемешать', kz: '🔀 Араластыру' },
  stat_total: { ru: 'Всего', kz: 'Барлығы' },
  stat_known: { ru: 'Знаю', kz: 'Білемін' },
  stat_repeat: { ru: 'Повторить', kz: 'Қайталау' },
  stat_progress: { ru: 'Прогресс', kz: 'Прогресс' },
  btn_graph: { ru: '📊 График прогресса', kz: '📊 Прогресс графигі' },
  btn_graph_hide: { ru: '📊 Скрыть график', kz: '📊 Графикті жасыру' },
  btn_sound_on: { ru: '🔊 Звук: вкл', kz: '🔊 Дыбыс: қосулы' },
  btn_sound_off: { ru: '🔇 Звук: выкл', kz: '🔇 Дыбыс: өшірулі' },
  btn_reset: { ru: '🗑 Сбросить прогресс', kz: '🗑 Прогресті өшіру' },
  graph_title: { ru: '📊 График прогресса за 7 дней', kz: '📊 7 күндік прогресс графигі' },
  graph_stat_total: { ru: 'Всего слов', kz: 'Барлық сөздер' },
  graph_stat_known: { ru: 'Изучено', kz: 'Жатталды' },
  graph_stat_left: { ru: 'Осталось', kz: 'Қалды' },
  footer_title: { ru: 'Перевод на <strong>Қазақ</strong> / Русский языки', kz: '<strong>Қазақша</strong> / Орысша аударма' },
  footer_desc: { ru: 'Делись с друзьями — открывается в любом браузере', kz: 'Достарыңызбен бөлісіңіз — кез келген браузерде ашылады' },
  confirm_reset: { ru: 'Сбросить весь прогресс? Это нельзя отменить.', kz: 'Барлық прогресті өшіру керек пе? Бұны кері қайтару мүмкін емес.' },
  btn_back: { ru: '← Назад', kz: '← Артқа' },
  card_hint: { ru: 'Нажми, чтобы перевернуть', kz: 'Аудару үшін басыңыз' },
  card_hint_knew: { ru: 'Ты знал это слово?', kz: 'Бұл сөзді білдіңіз бе?' },
  btn_wrong: { ru: '✗ Не знал', kz: '✗ Білмедім' },
  btn_correct: { ru: '✓ Знал!', kz: '✓ Білдім!' },
  btn_skip: { ru: '→ Пропустить', kz: '→ Өткізіп жіберу' },
  btn_next: { ru: 'Следующая →', kz: 'Келесі →' },
  lbl_eng_word: { ru: 'Английское слово', kz: 'Ағылшын сөзі' },
  lbl_kz_trans: { ru: 'Қазақша аударма', kz: 'Қазақша аударма' },
  lbl_ru_trans: { ru: 'Перевод на русский', kz: 'Орысша аударма' },
  lbl_kz_trans_lbl: { ru: 'Қазақша аудармасы', kz: 'Қазақша аударма' },
  lbl_ru_trans_lbl: { ru: 'Русский перевод', kz: 'Орысша аударма' },
  q_translate_kz: { ru: 'Қазақшаға аудар:', kz: 'Қазақшаға аударыңыз:' },
  q_translate_ru: { ru: 'Переведи на русский:', kz: 'Орысшаға аударыңыз:' },
  q_guess_en_kz: { ru: 'Ағылшынша қалай болады?', kz: 'Ағылшын тілінде қалай?' },
  q_guess_en_ru: { ru: 'Какое английское слово?', kz: 'Ағылшын сөзін табыңыз:' },
  t_translate_kz: { ru: 'Қазақша аудармасын жаз:', kz: 'Қазақша аудармасын жазыңыз:' },
  t_translate_ru: { ru: 'Введи перевод на русский:', kz: 'Орысша аудармасын жазыңыз:' },
  t_guess_en_kz: { ru: 'Ағылшынша сөзді жаз:', kz: 'Ағылшын сөзін жазыңыз:' },
  t_guess_en_ru: { ru: 'Введи английское слово:', kz: 'Ағылшын сөзін жазыңыз:' },
  placeholder_type: { ru: 'Введи ответ...', kz: 'Жауапты жазыңыз...' },
  btn_show_ans: { ru: 'Показать ответ', kz: 'Жауапты көрсету' },
  btn_check_ans: { ru: 'Проверить', kz: 'Тексеру' },
  fb_correct: { ru: 'Правильно! ✓', kz: 'Дұрыс! ✓' },
  fb_wrong_pre: { ru: 'Неверно. Ответ: <b>', kz: 'Қате. Жауап: <b>' },
  fb_wrong_post: { ru: '</b>', kz: '</b>' },
  fb_ans_pre: { ru: 'Ответ: <b>', kz: 'Жауап: <b>' },
  fb_ans_post: { ru: '</b>', kz: '</b>' },
  empty_review: { ru: 'Нет слов для повторения.<br>Отмечай слова кнопкой "Повторить"!', kz: 'Қайталайтын сөздер жоқ.<br>"Қайталау" арқылы сөздерді белгілеңіз!' },
  empty_level: { ru: 'Нет слов для выбранных уровней.', kz: 'Таңдалған деңгейлер үшін сөздер жоқ.' },
  res_words_learned: { ru: 'слов изучено!', kz: 'сөз жатталды!' },
  res_repeat: { ru: 'Повторить:', kz: 'Қайталау:' },
  res_words: { ru: 'слов', kz: 'сөз' },
  res_passed: { ru: 'Пройдено:', kz: 'Өтілді:' },
  res_cards: { ru: 'карточек', kz: 'карта' },
  btn_restart: { ru: 'Начать заново', kz: 'Қайтадан бастау' },
  btn_repeat_errs: { ru: 'Повторить ошибки', kz: 'Қателерді қайталау' }
};

function t(key) {
  if(!UI_TEXT[key]) return key;
  return UI_TEXT[key][appLang];
}

function updateUI() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.innerHTML = t(el.getAttribute('data-i18n'));
  });
  document.getElementById('sound-btn').textContent = soundOn ? t('btn_sound_on') : t('btn_sound_off');
  const graphBtn = document.getElementById('graph-btn');
  const area = document.getElementById('graph-area');
  if(area && area.style.display !== 'none') graphBtn.textContent = t('btn_graph_hide');
  else graphBtn.textContent = t('btn_graph');
  
  const inp = document.getElementById('type-inp');
  if(inp) inp.placeholder = t('placeholder_type');
}


// SAVE / LOAD
function saveProgress() {
  const today = new Date().toISOString().slice(0,10);
  let history = JSON.parse(localStorage.getItem('ox_history') || '[]');
  const todayEntry = history.find(e => e.date === today);
  if(todayEntry) todayEntry.known = known.size;
  else history.push({date: today, known: known.size});
  if(history.length > 30) history = history.slice(-30);
  localStorage.setItem('ox_progress', JSON.stringify({known:[...known],repeat:[...repeat]}));
  localStorage.setItem('ox_history', JSON.stringify(history));
  updateStreak();
}

function loadProgress() {
  const raw = localStorage.getItem('ox_progress');
  if(!raw) return;
  const data = JSON.parse(raw);
  known = new Set(data.known || []);
  repeat = new Set(data.repeat || []);
}

function resetProgress() {
  if(!confirm(t('confirm_reset'))) return;
  localStorage.removeItem('ox_progress');
  localStorage.removeItem('ox_history');
  known = new Set(); repeat = new Set(); correctStreak = 0;
  updateStats(); render();
}

// STREAK
function updateStreak() {
  let history = JSON.parse(localStorage.getItem('ox_history') || '[]');
  let streak = 0;
  let check = new Date();
  for(let i=0; i<365; i++) {
    const d = check.toISOString().slice(0,10);
    if(history.find(e => e.date === d && e.known > 0)) { streak++; check.setDate(check.getDate()-1); }
    else break;
  }
  const el = document.getElementById('hs-streak');
  if(el) el.textContent = streak + (streak > 0 ? '🔥' : '');
}

// SOUND
function speak(text) {
  if(!soundOn || !window.speechSynthesis) return;
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = 'en-US'; utt.rate = 0.9;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utt);
}
function toggleSound() {
  soundOn = !soundOn;
  updateUI();
}


function getTrans(w) {
  if (!w) return '';
  if (appLang === 'kz') return w.length > 3 ? w[3] : '';
  return w.length > 4 ? w[4] : (w.length > 3 ? w[3] : '');
}

// TIMER
function startTimer(onTimeout) {
  clearInterval(timerInterval);
  timerSeconds = 10;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if(timerSeconds <= 0) { clearInterval(timerInterval); if(onTimeout) onTimeout(); }
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); }
function updateTimerDisplay() {
  const d = document.getElementById('timer-display');
  if(!d) return;
  const color = timerSeconds <= 3 ? 'var(--red)' : timerSeconds <= 6 ? 'var(--amber)' : 'var(--green)';
  d.textContent = timerSeconds + 's';
  d.style.color = color; d.style.borderColor = color;
}

// CONFETTI
function launchConfetti() {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth; canvas.height = window.innerHeight;
  const pieces = Array.from({length:120}, () => ({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height - canvas.height,
    r:Math.random()*6+4, c:['#6c63ff','#34d399','#fbbf24','#f87171','#a78bfa','#60a5fa'][Math.floor(Math.random()*6)],
    vx:(Math.random()-0.5)*4, vy:Math.random()*4+2, angle:Math.random()*360, va:(Math.random()-0.5)*8
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    pieces.forEach(p => {
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.angle*Math.PI/180);
      ctx.fillStyle=p.c; ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*0.5); ctx.restore();
      p.x+=p.vx; p.y+=p.vy; p.angle+=p.va;
    });
    frame++;
    if(frame < 120) requestAnimationFrame(draw); else canvas.remove();
  }
  draw();
}


function toggleLang() {
  appLang = appLang === 'kz' ? 'ru' : 'kz';
  const btn = document.getElementById('lang-btn');
  const badge = document.getElementById('logo-badge');
  if(appLang === 'kz') {
    if(btn) btn.innerHTML = '🌍 Язык: 🇰🇿 Қаз';
    if(badge) badge.textContent = 'KZ';
  } else {
    if(btn) btn.innerHTML = '🌍 Язык: 🇷🇺 Рус';
    if(badge) badge.textContent = 'RU';
  }
  updateUI();
  render();
}

// GRAPH
function toggleGraph() {
  const area = document.getElementById('graph-area');
  const btn = document.getElementById('graph-btn');
  if(area.style.display === 'none') {
    area.style.display = ''; btn.textContent = t('btn_graph_hide'); drawGraph();
  } else { area.style.display = 'none'; btn.textContent = t('btn_graph'); }
}

function drawGraph() {
  const history = JSON.parse(localStorage.getItem('ox_history') || '[]');
  const canvas = document.getElementById('progress-chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = canvas.parentElement.offsetWidth - 40 || 500; canvas.height = 120;
  const days = [];
  for(let i=6; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const entry = history.find(e=>e.date===key);
    days.push({label:d.toLocaleDateString('ru',{weekday:'short'}), known: entry ? entry.known : 0});
  }
  const max = Math.max(...days.map(d=>d.known), 10);
  const W=canvas.width, H=canvas.height, padL=10, padR=10, padT=14, padB=22;
  const gW=W-padL-padR, gH=H-padT-padB, gap=gW/days.length, barW=gap*0.55;
  ctx.clearRect(0,0,W,H);
  [0.5,1].forEach(t => {
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
    const y=padT+gH*(1-t); ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(W-padR,y); ctx.stroke();
  });
  days.forEach((d,i) => {
    const x = padL + i*gap + gap/2 - barW/2;
    const barH = d.known > 0 ? Math.max((d.known/max)*gH, 4) : 3;
    const y = padT + gH - barH;
    const grad = ctx.createLinearGradient(0,y,0,padT+gH);
    grad.addColorStop(0,'#6c63ff'); grad.addColorStop(1,'#a78bfa');
    ctx.fillStyle = d.known > 0 ? grad : 'rgba(255,255,255,0.08)';
    ctx.beginPath(); ctx.roundRect(x,y,barW,barH,3); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.4)'; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText(d.label, x+barW/2, H-5);
    if(d.known>0){ ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.font='bold 10px sans-serif'; ctx.fillText(d.known, x+barW/2, y-3); }
  });
  const statsEl = document.getElementById('graph-stats');
  if(statsEl) {
    const total=WORDS.length;
    statsEl.innerHTML = [
      {label:t('graph_stat_total'),val:total,color:'var(--text)'},
      {label:t('graph_stat_known'),val:known.size,color:'var(--green)'},
      {label:t('graph_stat_left'),val:total-known.size,color:'var(--amber)'}
    ].map(s=>`<div style="background:var(--surface2);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:${s.color};font-family:Syne,sans-serif">${s.val}</div>
      <div style="font-size:11px;color:var(--muted);margin-top:2px">${s.label}</div></div>`).join('');
  }
}

function getBaseLevel(w) {
  const l = w[2];
  if(l.startsWith('A1')) return 'A1';
  if(l.startsWith('A2')) return 'A2';
  if(l.startsWith('B1')) return 'B1';
  return 'B2';
}

function buildDeck() {
  deck = WORDS.filter(w => activeLevels.has(getBaseLevel(w)));
  idx = 0; flipped = false; quizAnswered = false; typeAnswered = false;
  updateStats();
  render();
}

function shuffleDeck() {
  for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
  idx=0; flipped=false; quizAnswered=false; typeAnswered=false;
  render();
}

function toggleLevel(l) {
  if(activeLevels.has(l)) { if(activeLevels.size>1) activeLevels.delete(l); }
  else activeLevels.add(l);
  const btn = document.getElementById('lbtn-'+l);
  if(activeLevels.has(l)) btn.classList.add('active-'+l);
  else btn.className = 'lvl-btn';
  buildDeck();
}

function setMode(m) {
  mode=m; idx=0; flipped=false; quizAnswered=false; typeAnswered=false;
  ['flash','quiz','type','review'].forEach(t => {
    document.getElementById('tab-'+t).classList.toggle('active', t===m);
  });
  render();
}

function updateStats() {
  const total = WORDS.filter(w=>activeLevels.has(getBaseLevel(w))).length;
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  const pct = total>0 ? Math.round(known.size/total*100) : 0;
  document.getElementById('s-total').textContent = total;
  document.getElementById('s-known').textContent = known.size;
  document.getElementById('s-repeat').textContent = repeat.size;
  document.getElementById('s-pct').textContent = pct+'%';
  document.getElementById('hs-total').textContent = total;
  document.getElementById('hs-known').textContent = known.size;
  document.getElementById('hs-pct').textContent = pct+'%';
  const cur = d.length;
  const fill = cur>0 ? Math.round(idx/cur*100) : 0;
  document.getElementById('prog').style.width = fill+'%';
  document.getElementById('counter').textContent = cur>0 ? (idx+1)+' / '+cur : '';
  document.getElementById('pct-txt').textContent = cur>0 ? fill+'%' : '';
  saveProgress();
}

function getCard() {
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  return d[idx] || null;
}

function makeLevelPill(w) {
  return `<span class="level-pill lp-${getBaseLevel(w)}">${w[2]}</span>`;
}

function renderFlash() {
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  const w = d[idx];
  const dir = Math.random()<0.5;
  const front = dir ? w[0] : getTrans(w);
  const back = dir ? getTrans(w) : w[0];
  const frontLabel = dir ? t('lbl_eng_word') : (appLang==='kz'?t('lbl_kz_trans_lbl'):t('lbl_ru_trans_lbl'));
  const backLabel = dir ? (appLang==='kz'?t('lbl_kz_trans'):t('lbl_ru_trans')) : t('lbl_eng_word');
  return `
  <div class="card-actions" style="justify-content:flex-start;margin-bottom:12px">
    <button class="act-btn" onclick="goBack()" style="font-size:13px;padding:8px 18px">${t('btn_back')}</button>
  </div>
  <div class="card-scene">
    <div class="card-inner${flipped?' flipped':''}" onclick="flipCard()" id="fc">
      <div class="card-face card-front-face">
        <div class="card-eyebrow">${frontLabel}</div>
        <div class="card-word-main">${front}</div>
        <div class="card-pos-tag">${w[1]}</div>
        ${makeLevelPill(w)}
        <div class="card-hint">${t('card_hint')}</div>
      </div>
      <div class="card-face card-back-face">
        <div class="card-eyebrow">${backLabel}</div>
        <div class="card-translation">${back}</div>
        <div class="card-pos-tag">${w[1]}</div>
        ${makeLevelPill(w)}
        <div class="card-hint" style="margin-top:12px">${t('card_hint_knew')}</div>
      </div>
    </div>
  </div>
  <div class="card-actions" id="flash-actions" style="${flipped?'':'display:none'}">
    <button class="act-btn btn-repeat" onclick="markRepeat()">${t('btn_wrong')}</button>
    <button class="act-btn btn-know" onclick="markKnown()">${t('btn_correct')}</button>
  </div>
  <div id="flip-hint" style="${flipped?'display:none':''}">
    <div class="card-actions">
      <button class="act-btn" onclick="skip()">${t('btn_skip')}</button>
    </div>
  </div>`;
}

function getRandomOpts(w, count) {
  const others = WORDS.filter(x=>x[0]!==w[0] && activeLevels.has(getBaseLevel(x)));
  return [...others.sort(()=>Math.random()-.5).slice(0,count-1), w].sort(()=>Math.random()-.5);
}

function renderQuiz() {
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  const w = d[idx];
  const dir = Math.random()<0.5;
  const question = dir ? w[0] : getTrans(w);
  const qLabel = dir ? (appLang==='kz'?t('q_translate_kz'):t('q_translate_ru')) : (appLang==='kz'?t('q_guess_en_kz'):t('q_guess_en_ru'));
  const opts = getRandomOpts(w,4);
  if(!quizAnswered) setTimeout(() => {
    if(dir) speak(w[0]);
    startTimer(() => {
      if(!quizAnswered) {
        quizAnswered=true; correctStreak=0; repeat.add(w[0]);
        document.querySelectorAll('.opt-btn').forEach(o => {
          o.disabled=true;
          if(o.textContent===(dir?getTrans(w):w[0])) o.classList.add('correct');
        });
        const nb=document.getElementById('next-btn'); if(nb) nb.style.display='';
        updateStats();
      }
    });
  }, 50);
  return `
  <div class="quiz-panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <div class="quiz-eyebrow" style="margin-bottom:0">${qLabel}</div>
      <div id="timer-display" style="font-family:'Syne',sans-serif;font-size:18px;font-weight:700;min-width:40px;text-align:center;border:2px solid var(--green);border-radius:8px;padding:2px 8px;color:var(--green);transition:color .3s,border-color .3s">10s</div>
    </div>
    <div class="quiz-q">${question}</div>
    <div class="quiz-meta">${w[1]} · ${w[2]}</div>
    <div class="quiz-opts">
      ${opts.map(o=>{
        const ans = dir ? getTrans(o) : o[0];
        const isCorrect = o[0]===w[0];
        return `<button class="opt-btn" onclick="answerQuiz(this,${isCorrect},${dir},'${w[0].replace(/'/g,"\\'")}')">${ans}</button>`;
      }).join('')}
    </div>
  </div>
  <div class="card-actions">
    <button class="act-btn btn-next" onclick="nextCard()" id="next-btn" style="${quizAnswered?'':'display:none'}">${t('btn_next')}</button>
  </div>`;
}

function renderType() {
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  const w = d[idx];
  const dir = Math.random()<0.5;
  const question = dir ? w[0] : getTrans(w);
  const answer = dir ? getTrans(w) : w[0];
  const qLabel = dir ? (appLang==='kz'?t('t_translate_kz'):t('t_translate_ru')) : (appLang==='kz'?t('t_guess_en_kz'):t('t_guess_en_ru'));
  return `
  <div class="type-panel">
    <div class="quiz-eyebrow">${qLabel}</div>
    <div class="quiz-q">${question}</div>
    <div class="quiz-meta">${w[1]} · ${w[2]}</div>
    <input class="type-input" id="type-inp" placeholder="${t('placeholder_type')}" data-answer="${answer.replace(/"/g,'&quot;')}" onkeydown="if(event.key==='Enter')checkType()" ${typeAnswered?'disabled':''} autofocus>
    <div class="type-feedback" id="type-fb"></div>
    <div class="card-actions" style="margin-top:14px">
      ${!typeAnswered
        ? `<button class="act-btn btn-repeat" onclick="skipType()">${t('btn_show_ans')}</button><button class="act-btn btn-know" onclick="checkType()">${t('btn_check_ans')}</button>`
        : `<button class="act-btn btn-next" onclick="nextCard()">${t('btn_next')}</button>`
      }
    </div>
  </div>`;
}

function render() {
  const d = mode==='review' ? [...repeat].map(r => WORDS.find(w => w[0] === r) || [r, '', '', '']) : deck;
  updateStats();
  const area = document.getElementById('main-area');
  area.className = 'fade-up';
  void area.offsetWidth;
  if(d.length===0) {
    area.innerHTML = mode==='review'
      ? `<div class="empty-state">${t('empty_review')}</div>`
      : `<div class="empty-state">${t('empty_level')}</div>`;
    return;
  }
  if(idx>=d.length) {
    area.innerHTML = `
    <div class="result-panel">
      <div class="result-score">${known.size}</div>
      <div class="result-title">${t('res_words_learned')}</div>
      <div class="result-sub">${t('res_repeat')} ${repeat.size} ${t('res_words')} · ${t('res_passed')} ${d.length} ${t('res_cards')}</div>
      <div class="card-actions" style="justify-content:center">
        <button class="act-btn btn-know" onclick="restart()">${t('btn_restart')}</button>
        ${repeat.size>0?`<button class="act-btn btn-repeat" onclick="setMode('review')">${t('btn_repeat_errs')}</button>`:''}
      </div>
    </div>`;
    return;
  }
  if(mode==='flash' || mode==='review') area.innerHTML = renderFlash();
  else if(mode==='quiz') area.innerHTML = renderQuiz();
  else area.innerHTML = renderType();
}

function flipCard() {
  flipped=!flipped;
  document.getElementById('fc').classList.toggle('flipped');
  const actions = document.getElementById('flash-actions');
  const hint = document.getElementById('flip-hint');
  if(actions) actions.style.display = flipped ? '' : 'none';
  if(hint) hint.style.display = flipped ? 'none' : '';
  if(flipped) {
    const w = getCard();
    if(w) speak(w[0]);
  }
}
function markKnown() {
  const w = getCard();
  if(w) {
    known.add(w[0]); repeat.delete(w[0]);
    correctStreak++;
    if(correctStreak > 0 && correctStreak % 10 === 0) launchConfetti();
  }
  nextCard();
}
function markRepeat() { if(getCard()) repeat.add(getCard()[0]); correctStreak=0; nextCard(); }
function skip() { nextCard(); }

function nextCard() {
  stopTimer();
  idx++; flipped=false; quizAnswered=false; typeAnswered=false;
  render();
}

function answerQuiz(btn, isCorrect, dir, word) {
  if(quizAnswered) return;
  quizAnswered=true;
  stopTimer();
  const w = getCard();
  document.querySelectorAll('.opt-btn').forEach(o => {
    o.disabled=true;
    const correctText = dir ? getTrans(w) : w[0];
    if(o.textContent===correctText) o.classList.add('correct');
    else if(o===btn && !isCorrect) o.classList.add('wrong');
  });
  if(isCorrect) {
    known.add(w[0]); repeat.delete(w[0]); correctStreak++;
    if(correctStreak > 0 && correctStreak % 10 === 0) launchConfetti();
    speak(w[0]);
  } else {
    repeat.add(w[0]); correctStreak=0;
  }
  document.getElementById('next-btn').style.display='';
  updateStats();
}

function checkType() {
  if(typeAnswered) return;
  const inp = document.getElementById('type-inp');
  const answer = inp.getAttribute('data-answer');
  const val = inp.value.trim().toLowerCase();
  const correct = answer.toLowerCase();
  const isCorrect = correct.split(',').some(a=>val===a.trim()) || val===correct || correct.includes(val) && val.length>3;
  typeAnswered=true;
  const w = getCard();
  const fb = document.getElementById('type-fb');
  if(isCorrect) {
    fb.innerHTML=`<span style="color:var(--green)">${t('fb_correct')}</span>`;
    known.add(w[0]);
  } else {
    fb.innerHTML=`<span style="color:var(--red)">${t('fb_wrong_pre')}${answer}${t('fb_wrong_post')}</span>`;
    repeat.add(w[0]);
  }
  inp.disabled=true;
  setTimeout(render, 1200);
  updateStats();
}

function skipType() {
  if(typeAnswered) return;
  typeAnswered=true;
  const inp = document.getElementById('type-inp');
  const answer = inp.getAttribute('data-answer');
  const w = getCard();
  repeat.add(w[0]);
  document.getElementById('type-fb').innerHTML=`<span style="color:var(--muted)">${t('fb_ans_pre')}${answer}${t('fb_ans_post')}</span>`;
  inp.disabled=true;
  render();
  updateStats();
}

function goBack() {
  if(idx > 0) { idx--; flipped=false; render(); }
}
function restart() { idx=0; flipped=false; quizAnswered=false; typeAnswered=false; render(); }
function scrollToApp() { document.getElementById('app').scrollIntoView({behavior:'smooth'}); return false; }

loadProgress();
updateStreak();
updateUI(); // Initial localization render
buildDeck();
shuffleDeck();