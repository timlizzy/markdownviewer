(() => {
  // ── State ──────────────────────────────────────────────────────────────────
  let fileHandle = null;   // FileSystemFileHandle (File System Access API)
  let lastContent = null;
  let watchInterval = null;

  const WATCH_INTERVAL_MS = 1000;

  // ── DOM refs ───────────────────────────────────────────────────────────────
  const dropZone    = document.getElementById('drop-zone');
  const main        = document.getElementById('main');
  const preview     = document.getElementById('preview');
  const fileNameEl  = document.getElementById('file-name');
  const watchBadge  = document.getElementById('watch-badge');
  const themeToggle = document.getElementById('theme-toggle');
  const openBtn     = document.getElementById('open-btn');
  const dropOpenBtn = document.getElementById('drop-open-btn');

  // ── Theme ──────────────────────────────────────────────────────────────────
  const hljsThemeEl = document.getElementById('hljs-theme');
  const HLJS_LIGHT  = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
  const HLJS_DARK   = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  function applyTheme(dark) {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    hljsThemeEl.href = dark ? HLJS_DARK : HLJS_LIGHT;
    themeToggle.checked = dark;
  }
  applyTheme(prefersDark.matches);
  prefersDark.addEventListener('change', e => applyTheme(e.matches));
  themeToggle.addEventListener('change', () => applyTheme(themeToggle.checked));

  // ── Mermaid init ──────────────────────────────────────────────────────────
  mermaid.initialize({ startOnLoad: false, theme: 'default' });

  function mermaidTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'default';
  }

  // ── Marked renderer ───────────────────────────────────────────────────────
  const renderer = new marked.Renderer();

  renderer.code = function(token) {
    // token.lang is the fence language; token.text is the raw content
    const lang = (token.lang || '').trim().toLowerCase();
    const code = token.text;

    if (lang === 'mermaid') {
      // Wrap in a div that mermaid.run() will pick up
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }

    // Syntax highlight everything else
    const highlighted = lang && hljs.getLanguage(lang)
      ? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(code).value;

    const langLabel = lang ? `<span class="code-lang">${escapeHtml(lang)}</span>` : '';
    return `<div class="code-block">${langLabel}<pre><code class="hljs">${highlighted}</code></pre></div>`;
  };

  marked.setOptions({ renderer, breaks: false, gfm: true });

  // ── Render ─────────────────────────────────────────────────────────────────
  async function renderMarkdown(text) {
    if (text === lastContent) return;
    lastContent = text;

    // Re-init mermaid with current theme before each render
    mermaid.initialize({ startOnLoad: false, theme: mermaidTheme() });

    const html = marked.parse(text);
    preview.innerHTML = html;

    // Render mermaid diagrams
    try {
      await mermaid.run({ nodes: preview.querySelectorAll('.mermaid') });
    } catch (err) {
      console.warn('Mermaid render error:', err);
    }
  }

  // ── File reading ───────────────────────────────────────────────────────────
  async function readAndRender(file) {
    const text = await file.text();
    await renderMarkdown(text);
  }

  function showViewer(name) {
    fileNameEl.textContent = name;
    dropZone.classList.add('hidden');
    main.classList.remove('hidden');
  }

  // ── Auto-watch via FileSystemFileHandle polling ────────────────────────────
  function stopWatch() {
    if (watchInterval) {
      clearInterval(watchInterval);
      watchInterval = null;
    }
    watchBadge.classList.remove('active');
  }

  function startWatch() {
    stopWatch();
    if (!fileHandle) return;
    watchBadge.classList.add('active');
    watchInterval = setInterval(async () => {
      try {
        const file = await fileHandle.getFile();
        await readAndRender(file);
      } catch (e) {
        // File may have been deleted; keep trying silently
      }
    }, WATCH_INTERVAL_MS);
  }

  // ── Open via File System Access API (supports watching) ────────────────────
  async function openWithFSAAPI() {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Markdown files', accept: { 'text/markdown': ['.md', '.markdown'] } }],
        multiple: false,
      });
      fileHandle = handle;
      const file = await handle.getFile();
      showViewer(file.name);
      await readAndRender(file);
      startWatch();
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }

  // ── Fallback: plain <input type="file"> (no watching) ─────────────────────
  function openWithInputFallback() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      fileHandle = null;
      stopWatch();
      showViewer(file.name);
      await readAndRender(file);
      // No auto-watch available without FSA API
      watchBadge.classList.remove('active');
    });
    input.click();
  }

  async function openFile() {
    if ('showOpenFilePicker' in window) {
      await openWithFSAAPI();
    } else {
      openWithInputFallback();
    }
  }

  openBtn.addEventListener('click', openFile);
  dropOpenBtn.addEventListener('click', openFile);

  // ── Drag and drop ──────────────────────────────────────────────────────────
  document.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  document.addEventListener('dragleave', e => { if (!e.relatedTarget) dropZone.classList.remove('drag-over'); });
  document.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const item = e.dataTransfer.items && e.dataTransfer.items[0];

    // Try FSA API getAsFileSystemHandle for watching support
    if (item && item.getAsFileSystemHandle) {
      try {
        const handle = await item.getAsFileSystemHandle();
        if (handle.kind === 'file') {
          fileHandle = handle;
          const file = await handle.getFile();
          showViewer(file.name);
          await readAndRender(file);
          startWatch();
          return;
        }
      } catch (_) {}
    }

    // Fallback: plain File from dataTransfer
    const file = e.dataTransfer.files[0];
    if (file) {
      fileHandle = null;
      stopWatch();
      showViewer(file.name);
      await readAndRender(file);
      watchBadge.classList.remove('active');
    }
  });

  // ── Keyboard shortcut: Cmd/Ctrl+O ─────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'o') {
      e.preventDefault();
      openFile();
    }
  });

  // ── Utility ───────────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
