#!/usr/bin/env node
/**
 * Одноразовый скрипт чистки data.js:
 *  1. Удаляет мусорные записи (сокращения частей речи вместо слов).
 *  2. Убирает уровни (A1/B2...) из поля части речи — артефакт парсинга Oxford-списка.
 *  3. Дедуплицирует повторы в переводах («кітап; кітап» → «кітап»).
 *  4. Применяет таблицу ручных исправлений переводов (артефакты машинного
 *     перевода: «prep.» → «подготовка», «det.» → «детей» → «бала» и т.п.).
 *  5. Понижает уровни C1 до B2 (приложение поддерживает A1–B2).
 * Запуск: node tools/fix-data.js
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data.js');
const src = fs.readFileSync(DATA, 'utf8');
const WORDS = eval(src + '; WORDS');

// Записи-мусор: сокращения частей речи, попавшие в список как слова
const DELETE = new Set(['adj', 'n', 'v']);

// Ручные исправления: word → [pos, level, kz, ru, cat]; null = оставить как есть
const FIX = {
  'a an':        ['a / an', 'art.', null, 'белгісіз артикль', 'неопределённый артикль', null],
  'one numberdet': ['one', 'number, det., pron.', null, 'бір; біреу', 'один; некий', null],
  // Артефакты МП: «prep.» переведён как «подготовка» / «дайындық»
  'about':       [null, null, null, 'туралы, шамамен', 'о, около, примерно', null],
  'across':      [null, null, null, 'арқылы, көлденең', 'через, поперёк, на другой стороне', null],
  'along':       [null, null, null, 'бойымен, бойлай', 'вдоль, по', null],
  'around':      [null, null, null, 'айналасында, шамамен', 'вокруг, около, примерно', null],
  'behind':      [null, null, null, 'артында, артта', 'позади, сзади, за', null],
  'beyond':      [null, null, null, 'арғы жағында, тыс', 'за пределами, вне, сверх', null],
  'in':          [null, null, null, 'ішінде, -да/-де', 'в, внутри, через (о времени)', null],
  'inside':      [null, null, null, 'ішінде; ішкі жағы', 'внутри, внутрь; внутренняя сторона', null],
  'near':        [null, null, null, 'жанында, жақын', 'рядом, около, вблизи', null],
  'over':        [null, null, null, 'үстінде, аса; аяқталған', 'над, через, более; окончен', null],
  'since':       [null, null, null, 'бері, содан бері; өйткені', 'с (какого-то времени), с тех пор; поскольку', null],
  'through':     [null, null, null, 'арқылы, өтіп', 'через, сквозь', null],
  'under':       [null, null, null, 'астында, төмен', 'под, ниже, меньше', null],
  // Артефакты МП: «det.» → «детей» → «бала»
  'all':         [null, null, null, 'барлық, бәрі', 'все, всё, весь', null],
  'any':         [null, null, null, 'кез келген, әлдеқандай', 'любой, какой-нибудь', null],
  'either':      [null, null, null, 'екеуінің бірі; де (болымсыз сөйлемде)', 'любой (из двух); тоже (в отрицании)', null],
  'enough':      [null, null, null, 'жеткілікті', 'достаточно', null],
  'few':         [null, null, null, 'аз, бірнеше', 'мало, несколько', null],
  'first':       [null, null, null, 'бірінші, алғашқы', 'первый, сначала', null],
  'least':       [null, null, null, 'ең аз', 'наименьший, меньше всего', null],
  'less':        [null, null, null, 'азырақ, кем', 'меньше, менее', null],
  'more':        [null, null, null, 'көбірек, артық', 'больше, более', null],
  'most':        [null, null, null, 'ең көп; көпшілігі', 'наибольший; большинство', null],
  'much':        [null, null, null, 'көп', 'много, гораздо', null],
  'some':        [null, null, null, 'кейбір, бірнеше, біраз', 'некоторые, несколько, какой-то', null],
  // Неверные/слишком бедные переводы
  'I':           [null, null, null, 'мен', 'я', null],
  'me':          [null, null, null, 'мені, маған', 'меня, мне', null],
  'at':          [null, null, null, '-да/-де (орын, уақыт)', 'в, у, на (о месте и времени)', null],
  'ah':          [null, null, null, 'аһ, ә', 'ах', null],
  'oh':          [null, null, null, 'о, ой', 'ох, о', null],
  'CD':          [null, null, null, 'компакт-диск', 'компакт-диск', null],
  'DVD':         [null, null, null, 'DVD-диск', 'DVD-диск', null],
  'underground': [null, null, null, 'жер асты; метро', 'подземный; метро', null],
  'toward':      [null, null, null, 'қарай, бағытында', 'к, по направлению к', null],
  'fellow':      [null, null, null, 'әріптес, жолдас', 'товарищ, коллега; парень', null],
  'guy':         [null, null, null, 'жігіт', 'парень', null],
  'percent':     [null, 'n., adj., adv.', null, 'пайыз', 'процент', null],
  'cook':        [null, null, null, 'тамақ пісіру; аспаз', 'готовить; повар', null],
  'account':     [null, 'n., v.', null, 'шот, есепшот; есеп', 'счёт, аккаунт; отчёт', 'cat_business'],
  'alternative': [null, null, null, 'балама; баламалы', 'альтернатива; альтернативный', null],
  'abuse':       [null, null, null, 'теріс пайдалану; қиянат', 'злоупотребление; злоупотреблять', null],
  'aim':         [null, null, null, 'көздеу; мақсат', 'целиться; цель', null],
  'attack':      [null, null, null, 'шабуыл; шабуылдау', 'нападение; нападать, атаковать', null],
  'average':     [null, null, null, 'орташа; орташа мән', 'средний; среднее значение', null],
  'award':       [null, null, null, 'сыйлық, марапат; марапаттау', 'награда; награждать', null],
  'ban':         [null, null, null, 'тыйым салу; тыйым', 'запрещать; запрет', null],
  'bend':        [null, null, null, 'ию, бүгу; иілу, бұрылыс', 'гнуть, сгибать; изгиб, поворот', null],
  'border':      [null, null, null, 'шекара; шектесу', 'граница; граничить', null],
  'broadcast':   [null, null, null, 'таратылым жасау; хабар тарату', 'транслировать; трансляция', null],
  'campaign':    [null, null, null, 'науқан; науқан жүргізу', 'кампания; вести кампанию', null],
  'balance':     [null, null, null, 'тепе-теңдік; теңгеру', 'равновесие, баланс; балансировать', null],
  'lie':         [null, null, null, 'жату; өтірік айту; өтірік', 'лежать; лгать; ложь', null],
  // A1-слова с потерянным вторым значением в казахском
  'answer':      [null, null, null, 'жауап; жауап беру', 'ответ; отвечать', null],
  'back':        [null, null, null, 'арқа; артқа, артқы', 'спина; назад, задний', null],
  'book':        [null, null, null, 'кітап; брондау', 'книга; бронировать', null],
  'break':       [null, null, null, 'сындыру; үзіліс', 'ломать; перерыв, пауза', null],
  'change':      [null, null, null, 'өзгерту; өзгеріс', 'изменять; изменение', null],
  'check':       [null, null, null, 'тексеру; чек, тексеріс', 'проверять; чек, проверка', null],
  'clean':       [null, null, null, 'таза; тазалау', 'чистый; чистить', null],
  'cold':        [null, null, null, 'суық; суық тию', 'холодный; простуда, холод', null],
  'complete':    [null, null, null, 'толық; аяқтау', 'полный; завершать', null],
  'correct':     [null, null, null, 'дұрыс; түзету', 'правильный; исправлять', null],
  'cut':         [null, null, null, 'кесу; кесік, қысқарту', 'резать; порез, сокращение', null],
  'dance':       [null, null, null, 'би; билеу', 'танец; танцевать', null],
  'design':      [null, null, null, 'дизайн; жобалау', 'дизайн; проектировать', null],
  'dress':       [null, null, null, 'көйлек; киіну', 'платье; одеваться', null],
  'drink':       [null, null, null, 'сусын; ішу', 'напиток; пить', null],
  'early':       [null, null, null, 'ерте', 'ранний; рано', null],
  'exercise':    [null, null, null, 'жаттығу; жаттығу жасау', 'упражнение; упражняться', null],
  'fast':        [null, null, null, 'жылдам', 'быстрый; быстро', null],
  'form':        [null, null, null, 'пішін, форма; құру', 'форма; образовывать', null],
  'future':      [null, null, null, 'болашақ', 'будущее; будущий', null],
  'good':        [null, null, null, 'жақсы; жақсылық', 'хороший; добро', null],
  'help':        [null, null, null, 'көмектесу; көмек', 'помогать; помощь', null],
  'high':        [null, null, null, 'биік, жоғары', 'высокий; высоко', null],
  'home':        [null, null, null, 'үй; үйге, үйде', 'дом; домой, домашний', null],
  'hope':        [null, null, null, 'үміттену; үміт', 'надеяться; надежда', null],
  'interest':    [null, null, null, 'қызығушылық; қызықтыру', 'интерес; интересовать', null],
  'interview':   [null, null, null, 'сұхбат; сұхбат алу', 'интервью; брать интервью', null],
  'last':        [null, null, null, 'соңғы, өткен; созылу', 'последний, прошлый; длиться', null],
  'late':        [null, null, null, 'кеш', 'поздний; поздно', null],
  'left':        [null, null, null, 'сол жақ; солға', 'левый; слева, налево', null],
  'letter':      [null, null, null, 'хат; әріп', 'письмо; буква', null],
  'light':       [null, null, null, 'жарық; ашық түсті; жеңіл', 'свет; светлый; лёгкий', null],
  'list':        [null, null, null, 'тізім; тізімдеу', 'список; перечислять', null],
  'love':        [null, null, null, 'махаббат; жақсы көру', 'любовь; любить', null],
  'open':        [null, null, null, 'ашық; ашу', 'открытый; открывать', null],
  'orange':      [null, null, null, 'апельсин; қызғылт сары', 'апельсин; оранжевый', null],
  'order':       [null, null, null, 'тәртіп; тапсырыс; бұйыру', 'порядок; заказ; приказывать, заказывать', null],
  'outside':     [null, null, null, 'сыртында, сыртқа', 'снаружи; вне', null],
  'park':        [null, null, null, 'саябақ; көлік қою', 'парк; парковать(ся)', null],
  'plan':        [null, null, null, 'жоспар; жоспарлау', 'план; планировать', null],
  'plant':       [null, null, null, 'өсімдік; отырғызу', 'растение; сажать', null],
  'present':     [null, null, null, 'қазіргі; сыйлық; таныстыру', 'настоящий; подарок; представлять', null],
  'share':       [null, null, null, 'бөлісу; үлес, акция', 'делиться; доля, акция', null],
  'show':        [null, null, null, 'көрсету; шоу, көрсетілім', 'показывать; показ, шоу', null],
  'shower':      [null, null, null, 'душ; жаңбыр', 'душ; ливень', null],
  'south':       [null, null, null, 'оңтүстік', 'юг; южный', null],
  'space':       [null, null, null, 'кеңістік; ғарыш', 'пространство; космос', null],
  'start':       [null, null, null, 'бастау; басы', 'начинать; начало', null],
  'study':       [null, null, null, 'оқу; зерттеу', 'учёба; изучать', null],
  'train':       [null, null, null, 'пойыз; жаттықтыру', 'поезд; тренировать', null],
  'travel':      [null, null, null, 'саяхаттау; саяхат', 'путешествовать; путешествие', null],
  'use':         [null, null, null, 'пайдалану; қолданыс', 'использовать; использование', null],
  'visit':       [null, null, null, 'бару, келу; сапар', 'посещать; визит', null],
  'walk':        [null, null, null, 'жаяу жүру; серуен', 'ходить пешком; прогулка', null],
  'wash':        [null, null, null, 'жуу', 'мыть; стирать', null],
  'west':        [null, null, null, 'батыс', 'запад; западный', null],
  'work':        [null, null, null, 'жұмыс істеу; жұмыс', 'работать; работа', null],
  'wrong':       [null, null, null, 'қате; дұрыс емес', 'неправильный; неверно', null],
  // Императивы вместо словарной формы в казахском (артефакт МП)
  'appreciate':  [null, null, null, 'бағалау, риза болу', 'ценить, быть благодарным', null],
  'attach':      [null, null, null, 'тіркеу, бекіту', 'прикреплять', null],
  'beg':         [null, null, null, 'жалыну, өтіну', 'умолять, просить', null],
  'boil':        [null, null, null, 'қайнату, пісіру', 'кипеть, варить', null],
  'bye':         [null, null, null, 'сау бол', 'пока, до свидания', null],
  'call':        [null, null, null, 'шақыру, атау; қоңырау шалу', 'звонить, называть; звонок', null],
  'click':       [null, null, null, 'басу, шерту', 'щёлкать, нажимать; клик', null],
  'download':    [null, null, null, 'жүктеп алу', 'скачивать; загрузка', null],
  'drag':        [null, null, null, 'сүйреу', 'тащить, перетаскивать', null],
  'excuse':      [null, null, null, 'сылтау; кешіру', 'оправдание, предлог; извинять', null],
  'fold':        [null, null, null, 'бүктеу', 'складывать, сгибать', null],
  'greet':       [null, null, null, 'сәлемдесу, қарсы алу', 'приветствовать', null],
  'guess':       [null, null, null, 'болжау', 'угадывать, догадываться', null],
  'hold':        [null, null, null, 'ұстау', 'держать', null],
  'hurry':       [null, null, null, 'асығыс; асығу', 'спешка; спешить', null],
  'mean':        [null, null, null, 'білдіру; ниет ету', 'означать; иметь в виду', null],
  'mix':         [null, null, null, 'араластыру; қоспа', 'смешивать; смесь', null],
  'notice':      [null, null, null, 'байқау; хабарландыру', 'замечать; объявление', null],
  'pour':        [null, null, null, 'құю', 'лить, наливать', null],
  'press':       [null, null, null, 'басу; баспасөз', 'нажимать; пресса', null],
  'push':        [null, null, null, 'итеру', 'толкать', null],
  'remember':    [null, null, null, 'есте сақтау, еске алу', 'помнить, вспоминать', null],
  'repeat':      [null, null, null, 'қайталау', 'повторять', null],
  'replace':     [null, null, null, 'ауыстыру', 'заменять', null],
  'score':       [null, null, null, 'ұпай; ұпай жинау', 'счёт, очки; набирать очки', null],
  'smile':       [null, null, null, 'күлімсіреу; күлкі', 'улыбаться; улыбка', null],
  'sorry':       [null, null, null, 'кешіріңіз; өкінішті', 'извини(те); сожалеющий', null],
  'stop':        [null, null, null, 'тоқтату; аялдама', 'останавливать(ся); остановка', null],
  'text':        [null, null, null, 'мәтін; хабарлама жазу', 'текст; писать СМС', null],
  'try':         [null, null, null, 'тырысу, байқап көру', 'пробовать, стараться', null],
  'while':       [null, null, null, 'кезінде, уақытында; әзірше', 'пока, в то время как', null],
  'whisper':     [null, null, null, 'сыбырлау; сыбыр', 'шептать; шёпот', null],
  // Оторванные буквы-хвосты («щетка c», «кел п») и непереведённые сокращения
  'advance':     [null, null, null, 'ілгерілеу; алға жылжу; алдын ала', 'продвижение; продвигаться; заранее', null],
  'approach':    [null, null, null, 'жақындау; тәсіл', 'подход; подходить, приближаться', null],
  'bet':         [null, null, null, 'бәс тігу; бәс', 'держать пари; ставка', null],
  'brush':       [null, null, null, 'щетка, қылшақ; тазалау', 'щётка, кисть; чистить', null],
  'cause':       [null, null, null, 'себеп; тудыру', 'причина; вызывать', null],
  'claim':       [null, null, null, 'мәлімдеу; талап', 'утверждать; утверждение, претензия', null],
  'contest':     [null, null, null, 'байқау, жарыс', 'конкурс, состязание', null],
  'cost':        [null, null, null, 'құн, баға; тұру', 'стоимость; стоить', null],
  'cross':       [null, null, null, 'кесіп өту; крест', 'переходить, пересекать; крест', null],
  'debate':      [null, null, null, 'пікірталас; талқылау', 'дебаты; дискутировать', null],
  'delay':       [null, null, null, 'кідіріс; кешіктіру', 'задержка; задерживать', null],
  'demand':      [null, null, null, 'талап, сұраныс; талап ету', 'требование, спрос; требовать', null],
  'desire':      [null, null, null, 'тілек, құштарлық; қалау', 'желание; желать', null],
  'dislike':     [null, null, null, 'ұнатпау, жек көру', 'неприязнь; не любить', null],
  'display':     [null, null, null, 'көрсету; дисплей', 'показывать; дисплей, показ', null],
  'flash':       [null, null, null, 'жарқыл; жарқырау', 'вспышка; сверкать', null],
  'flying':      [null, null, null, 'ұшу; ұшатын', 'полёт; летающий', null],
  'focus':       [null, null, null, 'назар аудару; фокус', 'сосредотачиваться; фокус', null],
  'force':       [null, null, null, 'күш; мәжбүрлеу', 'сила; заставлять', null],
  'guarantee':   [null, null, null, 'кепілдік; кепілдік беру', 'гарантия; гарантировать', null],
  'half':        [null, null, null, 'жарты, жартысы', 'половина', null],
  'her':         [null, null, null, 'оның (әйел)', 'её, ей', null],
  'highlight':   [null, null, null, 'ерекшелеу; басты сәт', 'выделять; главное событие', null],
  'increase':    [null, null, null, 'арттыру; өсім', 'увеличивать; увеличение, рост', null],
  'individual':  [null, null, null, 'жеке; жеке тұлға', 'индивидуальный; личность', null],
  'lack':        [null, null, null, 'жетіспеушілік; жетіспеу', 'нехватка; не хватать', null],
  'lot':         [null, null, null, 'көп', 'много', null],
  'mind':        [null, null, null, 'ақыл, сана; қарсы болу', 'ум, разум; возражать', null],
  'offer':       [null, null, null, 'ұсыну; ұсыныс', 'предлагать; предложение', null],
  'practice':    [null, null, null, 'тәжірибе, жаттығу; жаттығу жасау', 'практика; практиковать(ся)', null],
  'promise':     [null, null, null, 'уәде беру; уәде', 'обещать; обещание', null],
  'quote':       [null, null, null, 'дәйексөз; дәйексөз келтіру', 'цитата; цитировать', null],
  'reply':       [null, null, null, 'жауап беру; жауап', 'отвечать; ответ', null],
  'rescue':      [null, null, null, 'құтқару', 'спасать; спасение', null],
  'slice':       [null, null, null, 'тілім; тілу', 'ломтик; нарезать', null],
  'slide':       [null, null, null, 'сырғанау; слайд', 'скользить; слайд', null],
  'sound':       [null, null, null, 'дыбыс; естілу', 'звук; звучать, казаться', null],
  'sponsor':     [null, null, null, 'демеуші; демеу', 'спонсор; спонсировать', null],
  'struggle':    [null, null, null, 'күресу; күрес', 'бороться; борьба', null],
  'support':     [null, null, null, 'қолдау; қолдау көрсету', 'поддерживать; поддержка', null],
  'that':        [null, null, null, 'ол, сол, анау', 'тот, та, то; что', null],
  'transfer':    [null, null, null, 'аудару; ауысу', 'переводить; перевод, передача', null],
  'trust':       [null, null, null, 'сенім; сену', 'доверие; доверять', null],
  'twin':        [null, null, null, 'егіз', 'близнец', null],
  'wish':        [null, null, null, 'қалау, тілеу; тілек', 'желать; желание', null],
  'record':      [null, null, null, 'жазба, рекорд; жазу', 'запись, рекорд; записывать', null],
};

// Убирает уровни из поля части речи: "n. B1, v." → "n., v."
function cleanPos(pos) {
  if (!pos) return pos;
  let p = pos.replace(/\s*\b[AB][12]\b/g, '');
  p = p.replace(/\bnoun\./g, 'n.');
  const seen = new Set();
  const tokens = p.split(',').map(s => s.trim()).filter(Boolean)
    .filter(tok => (seen.has(tok) ? false : (seen.add(tok), true)));
  return tokens.join(', ');
}

// «мақсат; мақсат, мақсат» → «мақсат»: дедуп сегментов внутри ; и ,
function dedupeTrans(s) {
  if (!s) return s;
  const seenAll = new Set();
  const groups = s.split(';').map(g => {
    const parts = g.split(',').map(x => x.trim().replace(/\.$/, '')).filter(Boolean)
      .filter(p => {
        const key = p.toLowerCase();
        if (seenAll.has(key)) return false;
        seenAll.add(key);
        return true;
      });
    return parts.join(', ');
  }).filter(Boolean);
  return groups.join('; ');
}

const out = [];
let deleted = 0, fixed = 0, posCleaned = 0, deduped = 0, levelFixed = 0;
for (const w of WORDS) {
  let [word, pos, level, kz, ru, cat = 'cat_core'] = w;
  if (DELETE.has(word)) { deleted++; continue; }

  const f = FIX[word];
  if (f) {
    fixed++;
    if (f[0] !== null) word = f[0];
    if (f[1] !== null) pos = f[1];
    if (f[2] !== null) level = f[2];
    if (f[3] !== null) kz = f[3];
    if (f[4] !== null) ru = f[4];
    if (f[5] !== null) cat = f[5];
  }

  const cleanedPos = cleanPos(pos);
  if (cleanedPos !== pos) { posCleaned++; pos = cleanedPos; }

  if (!f) {
    const dKz = dedupeTrans(kz), dRu = dedupeTrans(ru);
    if (dKz !== kz || dRu !== ru) deduped++;
    kz = dKz; ru = dRu;
  }

  if (level === 'C1') { level = 'B2'; levelFixed++; }

  out.push([word, pos, level, kz, ru, cat]);
}

const body = out.map(w => '  ' + JSON.stringify(w)).join(',\n');
fs.writeFileSync(DATA, 'const WORDS = [\n' + body + '\n];\n');
console.log(`Записей: ${out.length} (удалено ${deleted}) | ручных исправлений: ${fixed} | почищено полей POS: ${posCleaned} | дедуплицировано переводов: ${deduped} | уровней C1→B2: ${levelFixed}`);
