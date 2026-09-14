/* =========================================================
   Memory Match — game.js
   Vanilla JavaScript. IIFE pattern — global scope ifloslanmaydi.
   ========================================================= */

(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. KONSTANTALAR
     --------------------------------------------------------- */

  /* Karta yuzlarida ishlatiladigan belgilar to'plami.
     Eng qiyin daraja uchun 12 juft kerak — bu yerda 18 ta bor. */
  const SYMBOLS = [
    '🍎', '🍌', '🍇', '🍓', '🍒', '🍑',
    '🥝', '🍍', '🥥', '🍉', '🍊', '🍋',
    '🥑', '🌽', '🍄', '🌻', '⭐', '🎈'
  ];

  /* Daraja sozlamalari: juftlar soni, ustunlar soni, par time (sekund). */
  const LEVELS = {
    easy:   { pairs: 6,  cols: 4, parTime: 60  },
    medium: { pairs: 8,  cols: 4, parTime: 90  },
    hard:   { pairs: 12, cols: 6, parTime: 150 }
  };

  const WRONG_DELAY   = 800;  /* ms — noto'g'ri juftni yopish kechikishi */
  const MATCH_POINTS  = 100;  /* to'g'ri juft uchun ochko */
  const WRONG_PENALTY = 20;   /* noto'g'ri juft uchun jarima */
  const BONUS_PER_SEC = 5;    /* vaqt bonusi koeffitsienti */

  /* ---------------------------------------------------------
     2. DOM ELEMENTLAR
     --------------------------------------------------------- */

  const boardEl        = document.getElementById('boardEl');
  const timerEl        = document.getElementById('timerEl');
  const movesEl        = document.getElementById('movesEl');
  const scoreEl        = document.getElementById('scoreEl');

  const overlayEl      = document.getElementById('overlayEl');
  const ovTimeEl       = document.getElementById('ovTime');
  const ovMovesEl      = document.getElementById('ovMoves');
  const ovBonusEl      = document.getElementById('ovBonus');
  const ovScoreEl      = document.getElementById('ovScore');

  const restartBtn     = document.getElementById('restartBtn');
  const playAgainBtn   = document.getElementById('playAgainBtn');
  const chooseLevelBtn = document.getElementById('chooseLevelBtn');

  const levelBtns = Array.prototype.slice.call(
    document.querySelectorAll('.level-btn')
  );

  /* ---------------------------------------------------------
     3. HOLAT (state) — bitta obyektda saqlanadi
     --------------------------------------------------------- */

  const state = {
    level:   'easy',
    cards:   [],   /* [{ symbol, matched, el }] */
    flipped: [],   /* hozir ochiq turgan karta indekslari (maks. 2) */
    matched: [],   /* topilgan karta indekslari */
    moves:   0,
    score:   0,
    locked:  false, /* taxta bloklanganmi (ikki karta tekshirilmoqda) */
    wrongTimeoutId: null, /* navbatdagi "noto'g'ri juft" setTimeout ID'si */
    roundId: 0,           /* har o'yinga beriladigan noyob raqam */
    timer: {
      running:    false,
      startTime:  0,
      intervalId: null,
      seconds:    0
    }
  };

  /* =========================================================
     4. YORDAMCHI FUNKSIYALAR
     ========================================================= */

  /**
   * Fisher-Yates algoritmi bilan massivni joyida aralashtiradi.
   * @param {Array} array
   * @returns {Array} aralashtirilgan massiv
   */
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  /**
   * Sekundlarni mm:ss formatiga o'giradi.
   * @param {number} totalSeconds
   * @returns {string}
   */
  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    const mm = minutes < 10 ? '0' + minutes : String(minutes);
    const ss = seconds < 10 ? '0' + seconds : String(seconds);
    return mm + ':' + ss;
  }

  /**
   * Berilgan juftlar soni uchun aralashtirilgan karta dastasini yaratadi.
   * @param {number} pairCount
   * @returns {Array<{symbol:string, matched:boolean, el:null}>}
   */
  function createDeck(pairCount) {
    const pool = shuffle(SYMBOLS.slice()).slice(0, pairCount);
    const deck = [];

    for (let i = 0; i < pairCount; i++) {
      deck.push({ symbol: pool[i], matched: false, el: null });
      deck.push({ symbol: pool[i], matched: false, el: null });
    }

    return shuffle(deck);
  }

  /* =========================================================
     5. RENDER FUNKSIYALARI
     ========================================================= */

  /**
   * Taxtani to'liq qayta chizadi: har bir karta uchun <button> yaratadi.
   */
  function renderBoard() {
    boardEl.innerHTML = '';
    boardEl.dataset.level = state.level;

    const fragment = document.createDocumentFragment();

    state.cards.forEach(function (card, index) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'card';
      btn.dataset.index = String(index);
      btn.setAttribute('aria-label', 'Karta ' + (index + 1) + ', yopiq');

      const inner = document.createElement('span');
      inner.className = 'card-inner';

      const back = document.createElement('span');
      back.className = 'card-face card-back';
      back.setAttribute('aria-hidden', 'true');
      back.textContent = '?';

      const front = document.createElement('span');
      front.className = 'card-face card-front';
      front.setAttribute('aria-hidden', 'true');
      front.textContent = card.symbol;

      inner.appendChild(back);
      inner.appendChild(front);
      btn.appendChild(inner);

      card.el = btn;
      fragment.appendChild(btn);
    });

    boardEl.appendChild(fragment);
  }

  /**
   * Kartaning aria-label'ini joriy holatiga mos ravishda yangilaydi.
   * @param {number} index
   */
  function updateCardLabel(index) {
    const card = state.cards[index];
    if (!card || !card.el) return;

    const num = index + 1;
    let label = 'Karta ' + num;

    if (card.matched) {
      label += ', topilgan: ' + card.symbol;
    } else if (card.el.classList.contains('is-flipped')) {
      label += ', ochiq: ' + card.symbol;
    } else {
      label += ', yopiq';
    }

    card.el.setAttribute('aria-label', label);
  }

  /**
   * Statistika panelini (harakat, ochko) yangilaydi.
   */
  function updateStats() {
    movesEl.textContent = String(state.moves);
    scoreEl.textContent = String(state.score);
  }

  /**
   * Faol daraja tugmasini vizual va ARIA jihatdan belgilaydi.
   */
  function updateLevelButtons() {
    levelBtns.forEach(function (btn) {
      const isActive = btn.dataset.level === state.level;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  /* =========================================================
     6. TAYMER
     ========================================================= */

  /**
   * Taymerni ishga tushiradi (birinchi karta bosilganda chaqiriladi).
   */
  function startTimer() {
    state.timer.running   = true;
    state.timer.startTime = Date.now();
    state.timer.intervalId = window.setInterval(tickTimer, 250);
  }

  /**
   * Har 250 ms da o'tgan vaqtni hisoblab, ekranga chiqaradi.
   */
  function tickTimer() {
    state.timer.seconds = Math.floor((Date.now() - state.timer.startTime) / 1000);
    timerEl.textContent = formatTime(state.timer.seconds);
  }

  /**
   * Taymerni to'xtatadi va oxirgi qiymatni muzlatadi.
   */
  function stopTimer() {
    if (!state.timer.running) return;

    state.timer.seconds = Math.floor((Date.now() - state.timer.startTime) / 1000);
    state.timer.running = false;

    if (state.timer.intervalId !== null) {
      window.clearInterval(state.timer.intervalId);
      state.timer.intervalId = null;
    }

    timerEl.textContent = formatTime(state.timer.seconds);
  }

  /* =========================================================
     7. O'YIN MANTIQI
     ========================================================= */

  /**
   * Karta bosilganda ishlaydigan asosiy handler.
   * @param {number} index
   */
  function handleCardClick(index) {
    /* Taxta bloklangan bo'lsa — hech nima qilmaymiz */
    if (state.locked) return;

    const card = state.cards[index];
    if (!card) return;

    /* Allaqachon topilgan karta */
    if (card.matched) return;

    /* Allaqachon ochiq turgan karta */
    if (state.flipped.indexOf(index) !== -1) return;

    /* Bir vaqtda 2 tadan ortiq karta ochilmaydi */
    if (state.flipped.length >= 2) return;

    /* Taymer faqat BIRINCHI karta bosilganda ishga tushadi */
    if (!state.timer.running) {
      startTimer();
    }

    card.el.classList.add('is-flipped');
    updateCardLabel(index);
    state.flipped.push(index);

    /* Ikkinchi karta ochildi — harakatni sanaymiz va tekshiramiz */
    if (state.flipped.length === 2) {
      state.moves += 1;
      updateStats();
      checkMatch();
    }
  }

  /**
   * Ochiq turgan ikki kartani solishtiradi:
   * juft bo'lsa — bloklaydi, aks holda — 800 ms dan keyin yopadi.
   */
  function checkMatch() {
    const a = state.flipped[0];
    const b = state.flipped[1];
    const cardA = state.cards[a];
    const cardB = state.cards[b];

    if (cardA.symbol === cardB.symbol) {
      /* --- JUFT TOPILDI --- */
      cardA.matched = true;
      cardB.matched = true;
      state.matched.push(a, b);
      state.score += MATCH_POINTS;
      state.flipped = [];

      [a, b].forEach(function (i) {
        const el = state.cards[i].el;
        el.classList.add('is-matched');
        el.setAttribute('aria-disabled', 'true');
        updateCardLabel(i);
      });

      updateStats();

      /* Barcha juftlar topildimi? */
      if (state.matched.length === state.cards.length) {
        handleWin();
      }
    } else {
      /* --- NOTO'G'RI JUFT --- */
      state.locked = true;
      state.score = Math.max(0, state.score - WRONG_PENALTY);
      updateStats();

      [a, b].forEach(function (i) {
        state.cards[i].el.classList.add('is-wrong');
      });

      /* Oldingi "noto'g'ri juft" taymeri hali tugamagan bo'lsa — bekor qilamiz.
         Nazariy jihatdan bu yerga yetib kelganda u null bo'lishi kerak,
         lekin himoya uchun baribir tozalaymiz. */
      if (state.wrongTimeoutId !== null) {
        window.clearTimeout(state.wrongTimeoutId);
        state.wrongTimeoutId = null;
      }

      /* Joriy raundni eslab qolamiz — callback ichida tekshiramiz.
         Agar shu oraliqda resetGame() chaqirilib, yangi raund boshlangan
         bo'lsa, bu callback endi eskirgan hisoblanadi va hech nima qilmaydi. */
      const scheduledRound = state.roundId;

      state.wrongTimeoutId = window.setTimeout(function () {
        /* Raund o'zgargan bo'lsa — bu callback eskirgan, chiqib ketamiz. */
        if (scheduledRound !== state.roundId) {
          return;
        }

        [a, b].forEach(function (i) {
          const el = state.cards[i].el;
          el.classList.remove('is-wrong');
          el.classList.remove('is-flipped');
          updateCardLabel(i);
        });

        state.flipped = [];
        state.locked = false;
        state.wrongTimeoutId = null;
      }, WRONG_DELAY);
    }
  }

  /**
   * O'yin yakunlanganda: taymerni to'xtatadi, vaqt bonusini hisoblaydi
   * va g'alaba overlay ekranini ko'rsatadi.
   */
  function handleWin() {
    stopTimer();
    state.locked = true;

    const elapsed = state.timer.seconds;
    const parTime = LEVELS[state.level].parTime;
    const bonus   = Math.max(0, parTime - elapsed) * BONUS_PER_SEC;

    state.score += bonus;
    updateStats();
    showOverlay(elapsed, bonus);
  }

  /* =========================================================
     8. OVERLAY EKRANI
     ========================================================= */

  /**
   * G'alaba oynasini natijalar bilan to'ldirib ko'rsatadi.
   * @param {number} elapsed
   * @param {number} bonus
   */
  function showOverlay(elapsed, bonus) {
    ovTimeEl.textContent  = formatTime(elapsed);
    ovMovesEl.textContent = String(state.moves);
    ovBonusEl.textContent = '+' + bonus;
    ovScoreEl.textContent = String(state.score);

    overlayEl.hidden = false;
    playAgainBtn.focus();
  }

  /**
   * Overlay oynasini yashiradi.
   */
  function hideOverlay() {
    overlayEl.hidden = true;
  }

  /* =========================================================
     9. O'YINNI BOSHLASH / QAYTA BOSHLASH
     ========================================================= */

  /**
   * O'yinni to'liq nolga qaytaradi: taymer, harakat, ochko,
   * kartalar qayta aralashtiriladi, overlay yopiladi.
   * @param {string} [levelKey] — ixtiyoriy yangi daraja kaliti
   */
  function resetGame(levelKey) {
    stopTimer();

    /* Navbatda turgan "noto'g'ri juft" taymerini bekor qilamiz —
       aks holda u yangi o'yinda eski indekslar bo'yicha kartalarni
       noto'g'ri yopib, holatni DOM bilan mos kelmaydigan qilib qo'yadi. */
    if (state.wrongTimeoutId !== null) {
      window.clearTimeout(state.wrongTimeoutId);
      state.wrongTimeoutId = null;
    }

    /* Har yangi o'yin uchun noyob raund raqami — eski setTimeout
       callback'lari o'zini "eskirgan" deb bilib, hech nima qilmaydi. */
    state.roundId += 1;

    if (levelKey && LEVELS[levelKey]) {
      state.level = levelKey;
    }

    state.cards   = createDeck(LEVELS[state.level].pairs);
    state.flipped = [];
    state.matched = [];
    state.moves   = 0;
    state.score   = 0;
    state.locked  = false;
    state.timer   = {
      running:    false,
      startTime:  0,
      intervalId: null,
      seconds:    0
    };

    timerEl.textContent = '00:00';
    updateStats();
    updateLevelButtons();
    renderBoard();
    hideOverlay();
  }

  /* =========================================================
     10. HODISALARNI BOG'LASH
     ========================================================= */

  /**
   * Barcha click handler'larni bir marta ro'yxatdan o'tkazadi.
   */
  function bindEvents() {
    /* Taxtada event delegation — har bir karta uchun alohida listener kerak emas */
    boardEl.addEventListener('click', function (event) {
      const btn = event.target.closest('.card');
      if (!btn || !boardEl.contains(btn)) return;

      const index = Number(btn.dataset.index);
      if (Number.isNaN(index)) return;

      handleCardClick(index);
    });

    /* Daraja tugmalari */
    levelBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        resetGame(btn.dataset.level);
      });
    });

    /* Header'dagi "Qayta boshlash" tugmasi */
    restartBtn.addEventListener('click', function () {
      resetGame();
    });

    /* Overlay: "Qayta o'ynash" */
    playAgainBtn.addEventListener('click', function () {
      resetGame();
    });

    /* Overlay: "Daraja tanlash" */
    chooseLevelBtn.addEventListener('click', function () {
      hideOverlay();
      const active = levelBtns.filter(function (b) {
        return b.classList.contains('is-active');
      })[0];
      if (active) active.focus();
    });
  }

  /* =========================================================
     11. ISHGA TUSHIRISH
     ========================================================= */

  /**
   * Ilovani ishga tushiradi.
   */
  function init() {
    bindEvents();
    resetGame('easy');
  }

  init();

})();
