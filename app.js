/* 韩语 40 音 · 交互逻辑 */
(function () {
  'use strict';

  var D = window.K40_DATA;
  var SEQ_GAP_MS = 800;
  var SETTINGS_KEY = 'k40-settings';
  var FLIP_OPTIONS = [2, 3, 5];

  // 两套发音来源；缺文件时自动换另一套，再不行才用系统语音
  var SOURCES = {
    el: { label: 'AI 音', dir: 'audio/' },
    ms: { label: '标准音', dir: 'audio/ms/' }
  };

  /* ---------- 设置（localStorage 只存设置） ---------- */

  var settings = loadSettings();

  function loadSettings() {
    var s = { flipBack: 3, source: 'el' };
    try {
      var saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
      if (saved && FLIP_OPTIONS.indexOf(saved.flipBack) !== -1) s.flipBack = saved.flipBack;
      if (saved && SOURCES[saved.source]) s.source = saved.source;
    } catch (e) { /* 隐私模式等情况下忽略 */ }
    return s;
  }

  function saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 工具 ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    (children || []).forEach(function (c) {
      if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function audioUrl(text, source) {
    return SOURCES[source].dir + encodeURIComponent(text) + '.mp3';
  }

  function otherSource(source) {
    return source === 'el' ? 'ms' : 'el';
  }

  function sleep(ms) {
    return new Promise(function (r) { setTimeout(r, ms); });
  }

  var PLAY_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"/></svg>';

  function playIcon() {
    var s = el('span', { class: 'play-icon' });
    s.innerHTML = PLAY_SVG;
    return s;
  }

  /* ---------- 音频播放 ---------- */

  // 整个页面共用一个 <audio>：iOS 上它在第一次点击时被“解锁”，
  // 之后「依次播放」里不在点击回调中的 play() 也能正常发声。
  var player = new Audio();
  player.preload = 'auto';

  var missing = {};          // '来源:文字' → 已知缺失或加载失败
  var preloaded = {};        // '来源:文字' → 已预加载过
  var current = null;        // 正在播放的那一次 { finish }

  function stopAudio() {
    if (current) current.finish();
    try { player.pause(); } catch (e) { /* 忽略 */ }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* 忽略 */ }
    }
  }

  // 播放一个音节/单词；source 省略时用设置里的来源。
  // 返回 Promise，播完（或被打断）时 resolve。
  function playText(text, source) {
    source = source || settings.source;
    stopAudio();
    return new Promise(function (resolve) {
      var done = false;
      var detach = null;
      var safety = setTimeout(finish, 10000);
      var chain = [source, otherSource(source)].filter(function (s) {
        return !missing[s + ':' + text];
      });

      function finish() {
        if (done) return;
        done = true;
        clearTimeout(safety);
        if (detach) detach();
        if (current === me) current = null;
        resolve();
      }

      function tryNext() {
        if (done) return;
        var src = chain.shift();
        if (!src) {
          speak(text).then(finish);
          return;
        }
        if (src !== source) {
          showNotice('「' + text + '」' + SOURCES[source].label + '缺失，已改用' + SOURCES[src].label);
        }
        attempt(src);
      }

      function attempt(src) {
        var failed = false;
        function onEnded() { finish(); }
        function onError() {
          // 404 时 error 事件和 play() 的 reject 都会触发，只处理一次
          if (done || failed) return;
          failed = true;
          detach();
          missing[src + ':' + text] = true;
          tryNext();
        }
        detach = function () {
          player.removeEventListener('ended', onEnded);
          player.removeEventListener('error', onError);
        };
        player.addEventListener('ended', onEnded);
        player.addEventListener('error', onError);
        player.src = audioUrl(text, src);
        var p;
        try { p = player.play(); } catch (e) { onError(); return; }
        if (p && p.catch) {
          p.catch(function (err) {
            if (done || failed) return;
            // 被新的播放打断（AbortError）属于正常情况
            if (err && err.name === 'AbortError') return;
            if (err && err.name === 'NotAllowedError') { finish(); return; }
            onError();
          });
        }
      }

      var me = { finish: finish };
      current = me;
      tryNext();
    });
  }

  /* ---------- speechSynthesis 回退 ---------- */

  var koVoice = null;

  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    var voices = window.speechSynthesis.getVoices() || [];
    koVoice = voices.filter(function (v) { return /^ko/i.test(v.lang); })[0] || null;
  }

  if ('speechSynthesis' in window) {
    pickVoice();
    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
    }
  }

  function speak(text) {
    showNotice('「' + text + '」音频不可用，已改用系统语音');
    return new Promise(function (resolve) {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      var u = new SpeechSynthesisUtterance(text);
      u.lang = 'ko-KR';
      u.rate = 0.8;
      if (koVoice) u.voice = koVoice;
      var t = setTimeout(resolve, 5000);
      u.onend = u.onerror = function () { clearTimeout(t); resolve(); };
      window.speechSynthesis.speak(u);
    });
  }

  var noticeEl = document.getElementById('notice');
  var noticeTimer = null;

  function showNotice(msg) {
    noticeEl.textContent = msg;
    noticeEl.hidden = false;
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(function () { noticeEl.hidden = true; }, 5000);
  }

  /* ---------- 预加载：只拉取当前分区、当前来源的音频，顺便发现缺失文件 ---------- */

  function preload(texts) {
    if (!window.fetch || location.protocol === 'file:') return;
    var source = settings.source;
    var queue = texts.filter(function (t) { return !preloaded[source + ':' + t]; });
    queue.forEach(function (t) { preloaded[source + ':' + t] = true; });
    function next() {
      var t = queue.shift();
      if (!t) return Promise.resolve();
      return fetch(audioUrl(t, source)).then(function (res) {
        if (res.status === 404) missing[source + ':' + t] = true;
        return res.ok ? res.blob() : null;
      }).catch(function () { /* 网络问题时等到播放再判断 */ }).then(next);
    }
    for (var i = 0; i < 4; i++) next();
  }

  /* ---------- 依次播放 ---------- */

  var seqToken = 0;

  function cancelSequence() {
    seqToken++;
    var active = document.querySelectorAll('.playing, .active');
    for (var i = 0; i < active.length; i++) active[i].classList.remove('playing', 'active');
  }

  // items: [{ text, node, source? }]；trigger: 被点击的按钮；onStep(item): 每段开始时回调。
  // 返回 Promise，播完或被打断时 resolve。
  function playSequence(items, trigger, onStep) {
    cancelSequence();
    var my = seqToken;
    if (trigger) trigger.classList.add('active');
    var i = 0;
    return new Promise(function (resolve) {
      function step() {
        if (my !== seqToken) { resolve(); return; }
        if (i >= items.length) {
          if (trigger) trigger.classList.remove('active');
          resolve();
          return;
        }
        var item = items[i++];
        item.node.classList.add('playing');
        if (onStep) onStep(item);
        // 第一个 playText 在点击回调里同步调用，满足 iOS 的手势要求
        playText(item.text, item.source).then(function () {
          item.node.classList.remove('playing');
          if (my !== seqToken) { resolve(); return; }
          if (i < items.length) sleep(SEQ_GAP_MS).then(step);
          else step();
        });
      }
      step();
    });
  }

  /* ---------- 卡片 ---------- */

  function setFlipped(card, on) {
    card.classList.toggle('flipped', on);
    var cmp = card.querySelector('.cmp-btn');
    if (cmp) cmp.tabIndex = on ? 0 : -1;
  }

  function scheduleFlipBack(card) {
    clearTimeout(card._flipTimer);
    card._flipTimer = setTimeout(function () {
      setFlipped(card, false);
    }, settings.flipBack * 1000);
  }

  function flipCard(card) {
    cancelSequence();
    setFlipped(card, true);
    scheduleFlipBack(card);
    playText(card.getAttribute('data-text'));
  }

  // 「对比」：先 AI 音，停 0.8 秒，再标准音
  function compareCard(card, btn) {
    var text = card.getAttribute('data-text');
    var pill = btn.querySelector('.cmp-pill');
    var my = card._cmpRun = (card._cmpRun || 0) + 1;
    clearTimeout(card._flipTimer);
    var items = ['el', 'ms'].map(function (s) {
      return { text: text, node: card, source: s };
    });
    playSequence(items, btn, function (item) {
      pill.textContent = SOURCES[item.source].label;
    }).then(function () {
      // 对比途中又点了一次「对比」时，由新的那次负责收尾
      if (card._cmpRun !== my) return;
      pill.textContent = '对比';
      scheduleFlipBack(card);
    });
  }

  function makeCard(ch, info, opts) {
    opts = opts || {};
    var front = el('div', { class: 'face front' }, [
      el('span', { class: 'glyph', text: ch }),
      opts.combo ? el('span', { class: 'combo', text: opts.combo }) : null
    ]);
    var back = el('div', { class: 'face back' }, [
      el('div', { class: 'roman', text: info.roman }),
      el('dl', { class: 'info' }, [
        el('dt', { text: '例字' }), el('dd', { text: info.example }),
        el('dt', { text: '字母名' }), el('dd', { text: info.name })
      ]),
      el('button', {
        type: 'button',
        class: 'cmp-btn',
        tabindex: '-1',
        'aria-label': '对比：先播 AI 音，再播标准音'
      }, [el('span', { class: 'cmp-pill', text: '对比' })])
    ]);
    // 卡片里要放「对比」按钮，所以卡片本身用 div[role=button]（button 不能嵌套 button）
    return el('div', {
      role: 'button',
      tabindex: '0',
      class: 'card' + (opts.tone ? ' tone-' + opts.tone : ''),
      'data-text': info.example,
      'aria-label': ch + '，罗马音 ' + info.roman + '，例字 ' + info.example + '，字母名 ' + info.name
    }, [el('div', { class: 'card-inner' }, [front, back])]);
  }

  /* ---------- 渲染：辅音 ---------- */

  var sectionTexts = { consonants: [], vowels: [], pairs: [] };

  function renderConsonants() {
    var table = document.getElementById('consonant-table');
    table.appendChild(el('div', { class: 'corner' }));
    D.consonantColumns.forEach(function (c) {
      table.appendChild(el('div', { class: 'col-head ' + c.key, text: c.label }));
    });

    D.consonantRows.forEach(function (row) {
      var cards = row.letters.map(function (ch, i) {
        var info = D.consonants[ch];
        sectionTexts.consonants.push(info.example);
        return makeCard(ch, info, { tone: D.consonantColumns[i].key });
      });
      var title = el('button', {
        type: 'button',
        class: 'row-title',
        'aria-label': '依次播放' + row.label + '：' + row.letters.join(' ')
      }, [el('span', { text: row.label }), playIcon()]);
      title.addEventListener('click', function () {
        playSequence(cards.map(function (c) {
          return { text: c.getAttribute('data-text'), node: c };
        }), title);
      });
      table.appendChild(title);
      cards.forEach(function (c) { table.appendChild(c); });
    });

    var other = document.getElementById('other-consonants');
    D.otherConsonants.forEach(function (ch) {
      var info = D.consonants[ch];
      sectionTexts.consonants.push(info.example);
      other.appendChild(makeCard(ch, info));
    });
  }

  /* ---------- 渲染：元音 ---------- */

  function renderVowels() {
    var root = document.getElementById('vowel-groups');
    D.vowelGroups.forEach(function (g) {
      var grid = el('div', { class: 'grid' });
      g.items.forEach(function (item) {
        var info = D.vowels[item.ch];
        sectionTexts.vowels.push(info.example);
        grid.appendChild(makeCard(item.ch, info, { combo: item.combo }));
      });
      root.appendChild(el('div', { class: 'vgroup' }, [
        el('h2', { class: 'sec-title', text: g.title }),
        el('p', { class: 'sec-rule', text: g.rule }),
        grid
      ]));
    });
  }

  /* ---------- 渲染：对比练习 ---------- */

  function renderPairs() {
    var root = document.getElementById('pair-groups');
    D.pairs.forEach(function (g) {
      var words = el('div', { class: 'words' });
      words.style.setProperty('--n', g.items.length);
      var nodes = g.items.map(function (w) {
        sectionTexts.pairs.push(w.word);
        var b = el('button', {
          type: 'button',
          class: 'word tone-' + w.type,
          'data-text': w.word,
          'aria-label': w.word + '，' + w.meaning
        }, [
          el('span', { class: 'word-ko', text: w.word }),
          el('span', { class: 'word-zh', text: w.meaning })
        ]);
        b.addEventListener('click', function () {
          cancelSequence();
          b.classList.add('playing');
          playText(w.word).then(function () { b.classList.remove('playing'); });
        });
        words.appendChild(b);
        return b;
      });
      var btn = el('button', { type: 'button', class: 'play-btn' }, [playIcon(), '依次播放']);
      btn.addEventListener('click', function () {
        playSequence(nodes.map(function (n) {
          return { text: n.getAttribute('data-text'), node: n };
        }), btn);
      });
      root.appendChild(el('div', { class: 'pair' }, [
        el('div', { class: 'pair-head' }, [el('h3', { class: 'pair-title', text: g.title }), btn]),
        words
      ]));
    });
  }

  /* ---------- 标签页 ---------- */

  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tab'));
  var currentTab = 'consonants';

  function selectTab(name) {
    cancelSequence();
    stopAudio();
    currentTab = name;
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === name;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      document.getElementById('panel-' + t.getAttribute('data-tab')).hidden = !on;
    });
    preload(sectionTexts[name]);
  }

  tabs.forEach(function (t) {
    t.addEventListener('click', function () {
      selectTab(t.getAttribute('data-tab'));
      window.scrollTo(0, 0);
    });
  });

  /* ---------- 设置面板 ---------- */

  var setBtn = document.getElementById('settings-btn');
  var setPop = document.getElementById('settings-pop');
  var setVal = document.getElementById('settings-value');
  var secBtns = Array.prototype.slice.call(setPop.querySelectorAll('[data-sec]'));
  var srcBtns = Array.prototype.slice.call(setPop.querySelectorAll('[data-source]'));

  function syncSettingsUI() {
    setVal.textContent = SOURCES[settings.source].label + ' · ' + settings.flipBack + ' 秒';
    secBtns.forEach(function (b) {
      b.setAttribute('aria-checked', Number(b.getAttribute('data-sec')) === settings.flipBack ? 'true' : 'false');
    });
    srcBtns.forEach(function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-source') === settings.source ? 'true' : 'false');
    });
  }

  function togglePop(open) {
    setPop.hidden = !open;
    setBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  setBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    togglePop(setPop.hidden);
  });
  setPop.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', function () { togglePop(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') togglePop(false); });

  secBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      settings.flipBack = Number(b.getAttribute('data-sec'));
      saveSettings();
      syncSettingsUI();
    });
  });

  srcBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      settings.source = b.getAttribute('data-source');
      saveSettings();
      syncSettingsUI();
      preload(sectionTexts[currentTab]);
    });
  });

  /* ---------- 卡片点击 / 键盘（事件委托） ---------- */

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var card = e.target.closest('.card');
    if (!card) return;
    var cmp = e.target.closest('.cmp-btn');
    if (cmp && card.classList.contains('flipped')) compareCard(card, cmp);
    else flipCard(card);
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && t.classList && t.classList.contains('card')) {
      e.preventDefault();
      flipCard(t);
    }
  });

  /* ---------- 启动 ---------- */

  renderConsonants();
  renderVowels();
  renderPairs();
  syncSettingsUI();
  selectTab('consonants');
})();
