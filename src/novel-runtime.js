// novel-runtime.js — 視覺小說 client-side engine
//
// 由 novel-template.html 內嵌 SCENES + START + SLUG 後執行。
// state 存進 localStorage、key 為 `novel:<slug>`。

(function () {
  const slug = window.NOVEL_SLUG;
  const scenes = window.NOVEL_SCENES;
  const start = window.NOVEL_START;
  const storageKey = `novel:${slug}`;

  const textEl = document.getElementById('novel-text');
  const choicesEl = document.getElementById('novel-choices');
  const restartEl = document.getElementById('novel-restart');

  let current = start;
  let state = {};

  function load() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.scene && scenes[saved.scene]) {
          current = saved.scene;
          state = saved.state || {};
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ scene: current, state }));
    } catch (e) {}
  }

  function clear() {
    try { localStorage.removeItem(storageKey); } catch (e) {}
  }

  function resolveScene(id) {
    const s = scenes[id];
    if (!s) return null;
    if (s.if) {
      for (const [key, val] of Object.entries(s.if)) {
        if (state[key] !== val) {
          if (s.fallback) return resolveScene(s.fallback);
          return null;
        }
      }
    }
    return s;
  }

  function renderText(text) {
    // 支援 \n\n 分段
    const parts = String(text).split(/\n\n+/);
    return parts.map(p => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`).join('');
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function render() {
    const scene = resolveScene(current);
    if (!scene) {
      textEl.innerHTML = '<p>（找不到場景）</p>';
      choicesEl.innerHTML = '';
      return;
    }
    textEl.innerHTML = renderText(scene.text || '');
    choicesEl.innerHTML = '';

    const choices = scene.choices || [];
    if (choices.length === 0) {
      // ending
      const btn = document.createElement('button');
      btn.className = 'novel-restart-inline';
      btn.textContent = '再讀一次';
      btn.addEventListener('click', restart);
      choicesEl.appendChild(btn);
      clear(); // ending 後清存檔
      return;
    }

    for (const ch of choices) {
      const btn = document.createElement('button');
      btn.className = 'novel-choice';
      btn.textContent = ch.label || '...';
      btn.addEventListener('click', () => pick(ch));
      choicesEl.appendChild(btn);
    }
  }

  function pick(ch) {
    if (ch.set) Object.assign(state, ch.set);
    if (ch.next) current = ch.next;
    save();
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function restart() {
    current = start;
    state = {};
    clear();
    render();
  }

  if (restartEl) {
    restartEl.addEventListener('click', () => {
      if (confirm('重新開始？目前進度會清除。')) restart();
    });
  }

  load();
  render();
})();
