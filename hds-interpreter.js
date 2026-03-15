// ═══════════════════════════════════════════════════
//  HDS INTERPRETER  —  hds-interpreter.js
//  Pure JavaScript, no dependencies, no UI code.
//
//  USAGE:
//    const result = HDS.run(sourceCode);
//    result.output  → string[]  (each printed line)
//    result.error   → string | null
//
//  Or with a live print callback:
//    HDS.run(sourceCode, line => console.log(line));
// ═══════════════════════════════════════════════════

const HDS = (() => {

  // ─────────────────────────────────────────────────
  //  SYNTAX CONFIG
  //  Change any value here to rename a keyword.
  //  The rest of the interpreter uses these names
  //  automatically — you never need to touch anything
  //  below this block.
  // ─────────────────────────────────────────────────
  const SYNTAX = {
    // Output
    print:    'print',      // print "hello"

    // Variables
    set:      'set',        // set x = 10

    // If / else
    if:       'if',         // if x > 5 then
    then:     'then',
    else:     'else',

    // Block terminator
    end:      'end',        // end (closes if, while, repeat, function)

    // Count loop
    repeat:   'repeat',     // repeat 5 times
    times:    'times',

    // While loop
    while:    'while',      // while x < 10 do
    do:       'do',

    // Functions
    function: 'function',   // function greet(name)
    call:     'call',       // call greet("Alex")
    return:   'return',     // return x + 1

    // Logic operators
    and:      'and',        // x > 0 and x < 10
    or:       'or',         // x == 1 or x == 2
    not:      'not',        // not true

    // Booleans
    true:     'true',
    false:    'false',

    // Comment character (must be a single character)
    comment:  '#',          // # this is a comment
  };

  // ─────────────────────────────────────────────────
  //  INTERNAL — do not edit below this line
  // ─────────────────────────────────────────────────

  // Token types
  const TT = {
    NUM:'NUM', STR:'STR', BOOL:'BOOL', ID:'ID',
    PLUS:'+', MINUS:'-', STAR:'*', SLASH:'/', MOD:'%', CARET:'^',
    EQ:'==', NEQ:'!=', LT:'<', GT:'>', LTE:'<=', GTE:'>=',
    ASSIGN:'=', LPAREN:'(', RPAREN:')', COMMA:',',
    KW:'KW', EOF:'EOF',
  };

  // Build reverse map: user word → internal keyword name
  // e.g. if SYNTAX.print = 'say', WORD_TO_KW['say'] = 'print'
  const WORD_TO_KW = {};
  for (const [key, word] of Object.entries(SYNTAX)) {
    if (key !== 'comment') WORD_TO_KW[word] = key;
  }

  // ── TOKENIZER ──────────────────────────────────
  function tokenize(src) {
    const tokens = [];
    const chars  = [];
    let lineNum  = 1;

    for (const line of src.split('\n')) {
      for (const c of line) chars.push({ c, line: lineNum });
      chars.push({ c: '\n', line: lineNum });
      lineNum++;
    }

    let pos = 0;
    const peek    = (off = 0) => pos + off < chars.length ? chars[pos + off].c : '';
    const cur     = ()        => chars[pos];
    const advance = ()        => chars[pos++];

    while (pos < chars.length) {
      const { c, line } = cur();

      // whitespace
      if (' \t\n\r'.includes(c)) { advance(); continue; }

      // comment
      if (c === SYNTAX.comment) {
        while (pos < chars.length && cur().c !== '\n') advance();
        continue;
      }

      // string literal
      if (c === '"' || c === "'") {
        const q = c; advance();
        let s = '';
        while (pos < chars.length && cur().c !== q) { s += cur().c; advance(); }
        advance(); // closing quote
        tokens.push({ type: TT.STR, value: s, line });
        continue;
      }

      // number literal
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(peek(1)))) {
        let n = '';
        while (pos < chars.length && /[0-9.]/.test(cur().c)) { n += cur().c; advance(); }
        tokens.push({ type: TT.NUM, value: parseFloat(n), line });
        continue;
      }

      // identifier or keyword
      if (/[a-zA-Z_]/.test(c)) {
        let id = '';
        while (pos < chars.length && /[a-zA-Z0-9_]/.test(cur().c)) { id += cur().c; advance(); }
        const internal = WORD_TO_KW[id];
        if      (internal === 'true')  tokens.push({ type: TT.BOOL, value: true,  line });
        else if (internal === 'false') tokens.push({ type: TT.BOOL, value: false, line });
        else if (internal)             tokens.push({ type: TT.KW,   value: internal, line });
        else                           tokens.push({ type: TT.ID,   value: id, line });
        continue;
      }

      // two-char operators
      const two = c + peek(1);
      if (two === '==') { tokens.push({ type: TT.EQ,  value: '==', line }); advance(); advance(); continue; }
      if (two === '!=') { tokens.push({ type: TT.NEQ, value: '!=', line }); advance(); advance(); continue; }
      if (two === '<=') { tokens.push({ type: TT.LTE, value: '<=', line }); advance(); advance(); continue; }
      if (two === '>=') { tokens.push({ type: TT.GTE, value: '>=', line }); advance(); advance(); continue; }

      // single-char operators
      const ops = {
        '+': TT.PLUS, '-': TT.MINUS, '*': TT.STAR,  '/': TT.SLASH,
        '%': TT.MOD,  '^': TT.CARET, '<': TT.LT,    '>': TT.GT,
        '=': TT.ASSIGN, '(': TT.LPAREN, ')': TT.RPAREN, ',': TT.COMMA,
      };
      if (ops[c]) { tokens.push({ type: ops[c], value: c, line }); advance(); continue; }

      // unknown character — skip with a warning token
      tokens.push({ type: 'UNKNOWN', value: c, line });
      advance();
    }

    tokens.push({ type: TT.EOF, value: null, line: lineNum });
    return tokens;
  }

  // ── PARSER ─────────────────────────────────────
  function parse(tokens) {
    let pos = 0;

    const peek    = ()        => tokens[pos];
    const advance = ()        => tokens[pos++];
    const checkKW = (val)     => tokens[pos].type === TT.KW && tokens[pos].value === val;
    const check   = (type)    => tokens[pos].type === type;

    function expect(type, val) {
      const t = tokens[pos];
      if (val !== undefined) {
        if (t.value !== val) throw { msg: `Expected "${val}" but got "${t.value}"`, line: t.line };
      } else {
        if (t.type !== type) throw { msg: `Expected ${type} but got "${t.value}"`, line: t.line };
      }
      return advance();
    }

    // ── Statements ──

    function parseProgram() {
      const body = [];
      while (!check(TT.EOF)) body.push(parseStatement());
      return { type: 'Program', body };
    }

    function parseStatement() {
      const t = peek();
      if (t.type === TT.KW) {
        if (t.value === 'print')    return parsePrint();
        if (t.value === 'set')      return parseSet();
        if (t.value === 'if')       return parseIf();
        if (t.value === 'repeat')   return parseRepeat();
        if (t.value === 'while')    return parseWhile();
        if (t.value === 'function') return parseFunctionDef();
        if (t.value === 'call')     return parseCallStmt(false);
        if (t.value === 'return')   return parseReturn();
      }
      // bare call: greet() without "call"
      if (t.type === TT.ID && tokens[pos + 1]?.type === TT.LPAREN)
        return parseCallStmt(true);

      throw { msg: `Unexpected token: "${t.value}"`, line: t.line };
    }

    function parsePrint() {
      const line = peek().line;
      expect(TT.KW, 'print');
      return { type: 'Print', expr: parseExpr(), line };
    }

    function parseSet() {
      const line = peek().line;
      expect(TT.KW, 'set');
      const name = expect(TT.ID).value;
      expect(TT.ASSIGN);
      return { type: 'Set', name, expr: parseExpr(), line };
    }

    function parseIf() {
      const line = peek().line;
      expect(TT.KW, 'if');
      const cond = parseExpr();
      expect(TT.KW, 'then');
      const then = parseBlock(['else', 'end']);
      let elseBody = null;
      if (checkKW('else')) { advance(); elseBody = parseBlock(['end']); }
      expect(TT.KW, 'end');
      return { type: 'If', cond, then, elseBody, line };
    }

    function parseRepeat() {
      const line = peek().line;
      expect(TT.KW, 'repeat');
      const count = parseExpr();
      expect(TT.KW, 'times');
      const body = parseBlock(['end']);
      expect(TT.KW, 'end');
      return { type: 'Repeat', count, body, line };
    }

    function parseWhile() {
      const line = peek().line;
      expect(TT.KW, 'while');
      const cond = parseExpr();
      expect(TT.KW, 'do');
      const body = parseBlock(['end']);
      expect(TT.KW, 'end');
      return { type: 'While', cond, body, line };
    }

    function parseFunctionDef() {
      const line = peek().line;
      expect(TT.KW, 'function');
      const name   = expect(TT.ID).value;
      expect(TT.LPAREN);
      const params = [];
      while (!check(TT.RPAREN)) {
        params.push(expect(TT.ID).value);
        if (check(TT.COMMA)) advance();
      }
      expect(TT.RPAREN);
      const body = parseBlock(['end']);
      expect(TT.KW, 'end');
      return { type: 'FunctionDef', name, params, body, line };
    }

    function parseCallStmt(bare) {
      const line = peek().line;
      if (!bare) expect(TT.KW, 'call');
      const name = expect(TT.ID).value;
      expect(TT.LPAREN);
      const args = [];
      while (!check(TT.RPAREN)) {
        args.push(parseExpr());
        if (check(TT.COMMA)) advance();
      }
      expect(TT.RPAREN);
      return { type: 'CallStmt', name, args, line };
    }

    function parseReturn() {
      const line = peek().line;
      expect(TT.KW, 'return');
      const atEnd = check(TT.EOF) || checkKW('end') || checkKW('else');
      return { type: 'Return', expr: atEnd ? null : parseExpr(), line };
    }

    function parseBlock(stopKWs) {
      const stmts = [];
      while (!check(TT.EOF) && !stopKWs.some(k => checkKW(k)))
        stmts.push(parseStatement());
      return stmts;
    }

    // ── Expressions (precedence climbing) ──

    const parseExpr       = ()  => parseOr();

    function parseOr() {
      let l = parseAnd();
      while (checkKW('or'))  { advance(); l = { type:'BinOp', op:'or',  left:l, right:parseAnd() }; }
      return l;
    }
    function parseAnd() {
      let l = parseNot();
      while (checkKW('and')) { advance(); l = { type:'BinOp', op:'and', left:l, right:parseNot() }; }
      return l;
    }
    function parseNot() {
      if (checkKW('not')) { advance(); return { type:'UnaryOp', op:'not', operand:parseNot() }; }
      return parseComparison();
    }
    function parseComparison() {
      let l = parseAddSub();
      const cops = [TT.EQ, TT.NEQ, TT.LT, TT.GT, TT.LTE, TT.GTE];
      while (cops.includes(peek().type)) {
        const op = advance().value;
        l = { type:'BinOp', op, left:l, right:parseAddSub() };
      }
      return l;
    }
    function parseAddSub() {
      let l = parseMulDiv();
      while (peek().type === TT.PLUS || peek().type === TT.MINUS) {
        const op = advance().value;
        l = { type:'BinOp', op, left:l, right:parseMulDiv() };
      }
      return l;
    }
    function parseMulDiv() {
      let l = parsePower();
      while ([TT.STAR, TT.SLASH, TT.MOD].includes(peek().type)) {
        const op = advance().value;
        l = { type:'BinOp', op, left:l, right:parsePower() };
      }
      return l;
    }
    function parsePower() {
      let l = parseUnary();
      while (peek().type === TT.CARET) {
        advance();
        l = { type:'BinOp', op:'^', left:l, right:parseUnary() };
      }
      return l;
    }
    function parseUnary() {
      if (peek().type === TT.MINUS) { advance(); return { type:'UnaryOp', op:'-', operand:parsePrimary() }; }
      return parsePrimary();
    }
    function parsePrimary() {
      const t = peek();
      if (t.type === TT.NUM)  { advance(); return { type:'Literal', value: t.value }; }
      if (t.type === TT.STR)  { advance(); return { type:'Literal', value: t.value }; }
      if (t.type === TT.BOOL) { advance(); return { type:'Literal', value: t.value }; }
      if (t.type === TT.ID) {
        if (tokens[pos + 1]?.type === TT.LPAREN) {
          advance(); expect(TT.LPAREN);
          const args = [];
          while (!check(TT.RPAREN)) { args.push(parseExpr()); if (check(TT.COMMA)) advance(); }
          expect(TT.RPAREN);
          return { type:'CallExpr', name: t.value, args };
        }
        advance();
        return { type:'Var', name: t.value };
      }
      if (t.type === TT.LPAREN) {
        advance();
        const expr = parseExpr();
        expect(TT.RPAREN);
        return expr;
      }
      throw { msg: `Unexpected "${t.value}" in expression`, line: t.line };
    }

    return parseProgram();
  }

  // ── INTERPRETER (tree-walk evaluator) ──────────
  class ReturnSignal { constructor(v) { this.value = v; } }

  function interpret(ast, printFn) {
    const globalEnv = { vars: {}, fns: {} };

    function run(nodes, env) {
      for (const node of nodes) {
        const r = exec(node, env);
        if (r instanceof ReturnSignal) return r;
      }
    }

    function exec(node, env) {
      switch (node.type) {

        case 'Print': {
          printFn(String(evalExpr(node.expr, env)));
          break;
        }

        case 'Set': {
          env.vars[node.name] = evalExpr(node.expr, env);
          break;
        }

        case 'If': {
          const branch = evalExpr(node.cond, env)
            ? node.then
            : node.elseBody;
          if (branch) return run(branch, { vars: Object.create(env.vars), fns: env.fns });
          break;
        }

        case 'Repeat': {
          const count = evalExpr(node.count, env);
          if (typeof count !== 'number')
            throw { msg: 'repeat count must be a number', line: node.line };
          for (let i = 0; i < count; i++) {
            const r = run(node.body, { vars: Object.create(env.vars), fns: env.fns });
            if (r instanceof ReturnSignal) return r;
          }
          break;
        }

        case 'While': {
          let guard = 0;
          while (evalExpr(node.cond, env)) {
            if (++guard > 100_000)
              throw { msg: 'Infinite loop — stopped after 100,000 iterations', line: node.line };
            const r = run(node.body, { vars: Object.create(env.vars), fns: env.fns });
            if (r instanceof ReturnSignal) return r;
          }
          break;
        }

        case 'FunctionDef': {
          env.fns[node.name] = node;
          break;
        }

        case 'CallStmt': {
          callFn(node.name, node.args, env, node.line);
          break;
        }

        case 'Return': {
          return new ReturnSignal(node.expr ? evalExpr(node.expr, env) : null);
        }

        default:
          throw { msg: `Unknown node type: ${node.type}`, line: 0 };
      }
    }

    function callFn(name, argExprs, env, line) {
      const fn = env.fns[name] ?? globalEnv.fns[name];
      if (!fn) throw { msg: `Unknown function: "${name}"`, line };
      const args = argExprs.map(a => evalExpr(a, env));
      if (args.length !== fn.params.length)
        throw { msg: `"${name}" expects ${fn.params.length} arg(s), got ${args.length}`, line };
      const fnEnv = { vars: {}, fns: { ...globalEnv.fns, ...env.fns } };
      fn.params.forEach((p, i) => fnEnv.vars[p] = args[i]);
      const r = run(fn.body, fnEnv);
      return r instanceof ReturnSignal ? r.value : null;
    }

    function evalExpr(node, env) {
      switch (node.type) {

        case 'Literal': return node.value;

        case 'Var': {
          let scope = env.vars;
          while (scope) {
            if (Object.prototype.hasOwnProperty.call(scope, node.name)) return scope[node.name];
            scope = Object.getPrototypeOf(scope);
          }
          throw { msg: `Variable "${node.name}" is not defined`, line: 0 };
        }

        case 'UnaryOp': {
          const v = evalExpr(node.operand, env);
          if (node.op === '-')   return -v;
          if (node.op === 'not') return !v;
          break;
        }

        case 'BinOp': {
          const l = evalExpr(node.left,  env);
          const r = evalExpr(node.right, env);
          switch (node.op) {
            case '+':   return (typeof l === 'string' || typeof r === 'string')
                               ? String(l) + String(r) : l + r;
            case '-':   return l - r;
            case '*':   return l * r;
            case '/':   if (r === 0) throw { msg: 'Division by zero', line: 0 };
                        return l / r;
            case '%':   return l % r;
            case '^':   return Math.pow(l, r);
            case '==':  return l === r;
            case '!=':  return l !== r;
            case '<':   return l < r;
            case '>':   return l > r;
            case '<=':  return l <= r;
            case '>=':  return l >= r;
            case 'and': return l && r;
            case 'or':  return l || r;
          }
          break;
        }

        case 'CallExpr':
          return callFn(node.name, node.args, env, 0);
      }
    }

    run(ast.body, globalEnv);
  }

  // ── PUBLIC API ─────────────────────────────────
  /**
   * Run HDS source code.
   *
   * @param {string}   src      - HDS source code string
   * @param {function} [onPrint] - optional callback(line: string) called for each print
   * @returns {{ output: string[], error: string|null }}
   */
  function run(src, onPrint) {
    const output = [];
    const printFn = line => {
      output.push(line);
      if (typeof onPrint === 'function') onPrint(line);
    };
    try {
      const tokens = tokenize(src);
      const ast    = parse(tokens);
      interpret(ast, printFn);
      return { output, error: null };
    } catch (err) {
      const msg = err.msg
        ? (err.line ? `Line ${err.line}: ${err.msg}` : err.msg)
        : String(err);
      return { output, error: msg };
    }
  }

  // Expose SYNTAX so the UI can read keyword names for docs/examples
  return { run, SYNTAX };

})();

// Make available as ES module OR plain <script> tag
if (typeof module !== 'undefined') module.exports = HDS;
