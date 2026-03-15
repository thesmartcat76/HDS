// ═══════════════════════════════════════════════════
//  HDS App UI  —  app.js
//  Depends on: hds-interpreter.js (loaded first)
//  Uses HDS.run() and HDS.SYNTAX — no interpreter
//  logic lives here.
// ═══════════════════════════════════════════════════

const editor    = document.getElementById('editor');
const outputEl  = document.getElementById('output');
const statusbar = document.getElementById('statusbar');
const lineNums  = document.getElementById('lineNumbers');

// ── Line numbers ──────────────────────────────────
function updateLineNumbers() {
  const count = editor.value.split('\n').length;
  lineNums.innerHTML = Array.from({ length: count }, (_, i) => i + 1).join('<br>');
  lineNums.scrollTop = editor.scrollTop;
}
editor.addEventListener('input',  updateLineNumbers);
editor.addEventListener('scroll', () => { lineNums.scrollTop = editor.scrollTop; });

// ── Keyboard shortcuts ────────────────────────────
editor.addEventListener('keydown', e => {
  // Tab → two spaces
  if (e.key === 'Tab') {
    e.preventDefault();
    const s = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, s) + '  ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = s + 2;
    updateLineNumbers();
  }
  // F5 → run
  if (e.key === 'F5') { e.preventDefault(); runCode(); }
});

// ── Status bar ────────────────────────────────────
function setStatus(msg, type = '') {
  statusbar.textContent  = msg;
  statusbar.className    = 'statusbar ' + type;
}

// ── Output helpers ────────────────────────────────
function clearOutput() {
  outputEl.innerHTML = '';
  setStatus('HDS v1.0 — Ready');
}

function appendLine(text, cls = 'out-print') {
  const span = document.createElement('span');
  span.className   = 'out-line ' + cls;
  span.textContent = text;
  outputEl.appendChild(span);
  outputEl.scrollTop = outputEl.scrollHeight;
}

function appendSep() {
  appendLine('─'.repeat(40), 'out-sep');
}

// ── Run ───────────────────────────────────────────
function runCode() {
  clearOutput();
  const src = editor.value;
  if (!src.trim()) { setStatus('Nothing to run.'); return; }

  appendSep();

  // HDS.run() is provided by hds-interpreter.js
  const { output, error } = HDS.run(src, line => appendLine(line, 'out-print'));

  appendSep();

  if (error) {
    appendLine('Error: ' + error, 'out-error');
    setStatus('✗ ' + error, 'error');
  } else {
    appendLine(`✓ Done — ${output.length} line(s) printed`, 'out-ok');
    setStatus(`✓ Ran successfully — ${output.length} output line(s)`, 'ok');
  }
}

// ── Docs panel ────────────────────────────────────
function toggleDocs() {
  document.getElementById('docsPanel').classList.toggle('open');
}

function buildDocs() {
  const S = HDS.SYNTAX;
  const c = S.comment;
  const esc = s => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const items = [
    [`${S.print} "text"`,                                      'Print text or a variable'],
    [`${S.set} x = 10`,                                        'Create / assign a variable'],
    [`${S.set} x = x + 1`,                                     'Math: + - * / % ^'],
    [`${S.if} x > 5 ${S.then} ... ${S.end}`,                  'If condition'],
    [`${S.if} x > 5 ${S.then} ... ${S.else} ... ${S.end}`,    'If / else'],
    [`${S.repeat} 5 ${S.times} ... ${S.end}`,                  'Loop N times'],
    [`${S.while} x < 10 ${S.do} ... ${S.end}`,                'While loop'],
    [`${S.function} greet() ... ${S.end}`,                     'Define a function'],
    [`${S.call} greet()`,                                       'Call a function'],
    [`${S.return} x + 1`,                                       'Return a value'],
    [`${c} comment`,                                            'Single line comment'],
    [`${S.true} / ${S.false}`,                                  'Boolean values'],
    [`${S.and} / ${S.or} / ${S.not}`,                         'Logical operators'],
    [`== != < > <= >=`,                                         'Comparison operators'],
  ];

  document.getElementById('docsPanel').innerHTML =
    `<h3>📖 Language Reference</h3>` +
    items.map(([code, desc]) =>
      `<div class="doc-item"><code>${esc(code)}</code><small>${desc}</small></div>`
    ).join('');
}

// ── Example program ───────────────────────────────
function loadExample() {
  const S = HDS.SYNTAX;
  const c = S.comment;

  editor.value = `${c} ── HDS Example Program ──────────────────

${c} Variables & Math
${S.set} name = "Alex"
${S.set} score = 0
${S.set} lives = 3

${S.print} "Welcome, " + name + "!"
${S.print} "Starting score: " + score
${S.print} ""

${c} If / Else
${S.if} lives > 0 ${S.then}
  ${S.print} "You are alive! Keep going!"
${S.else}
  ${S.print} "Game over!"
${S.end}

${c} Repeat loop
${S.print} ""
${S.print} "Counting to 5:"
${S.set} i = 1
${S.repeat} 5 ${S.times}
  ${S.print} i
  ${S.set} i = i + 1
${S.end}

${c} While loop
${S.print} ""
${S.print} "Powers of 2 less than 100:"
${S.set} n = 1
${S.while} n < 100 ${S.do}
  ${S.print} n
  ${S.set} n = n * 2
${S.end}

${c} Functions
${S.function} add(a, b)
  ${S.return} a + b
${S.end}

${S.function} greet(person)
  ${S.print} "Hello, " + person + "!"
${S.end}

${S.print} ""
${S.set} result = add(7, 13)
${S.print} "7 + 13 = " + result

${S.call} greet("World")
${S.call} greet(name)`;

  updateLineNumbers();
  clearOutput();
  setStatus('Example loaded — press ▶ Run to execute');
}

// ── Starter code ──────────────────────────────────
function loadStarter() {
  const S = HDS.SYNTAX;
  const c = S.comment;

  editor.value = `${c} Welcome to HDS!
${c} A simple programming language for kids.

${S.print} "Hello, World!"

${S.set} x = 10
${S.set} y = 5

${S.if} x > y ${S.then}
  ${S.print} x + " is bigger than " + y
${S.else}
  ${S.print} y + " is bigger!"
${S.end}

${S.function} sayHi(name)
  ${S.print} "Hi there, " + name + "!"
${S.end}

${S.call} sayHi("Coder")`;

  updateLineNumbers();
}

// ── PWA service worker ────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('HDS SW registered'))
      .catch(e => console.warn('SW failed', e));
  });
}

// ── Init ──────────────────────────────────────────
buildDocs();
loadStarter();
