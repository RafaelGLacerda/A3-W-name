// app.js - Calculadora de números complexos com parser, AST, execução e comparação.

class Complex {
  constructor(re, im) {
    this.re = Number(re) || 0;
    this.im = Number(im) || 0;
  }
  static fromString(s) {
    // accepts forms: "3+4i", "3-4i", "4i", "3", "-2-5i"
    s = s.trim();
    if (!s) throw new Error("String vazia para número complexo");
    // handle trailing i
    // replace unary + with explicit
    s = s.replace(/\s+/g, '');
    // If it's just like "i" or "-i"
    if (s === 'i') return new Complex(0,1);
    if (s === '-i') return new Complex(0,-1);
    // If contains 'i'
    if (s.includes('i')) {
      // split into re and im parts by finding last '+' or '-' before the 'i' (but not at start)
      // Example: -3+4i, 2-5i, 4i
      // If only '4i' or '-4i'
      let idxI = s.indexOf('i');
      let core = s.slice(0, idxI);
      if (core === '' ) return new Complex(0,1);
      if (core === '+' ) return new Complex(0,1);
      if (core === '-' ) return new Complex(0,-1);
      // find separator between real and imag (search from end for + or - that isn't the first char)
      let sep = -1;
      for (let i = core.length-1; i>=1; --i) {
        if (core[i] === '+' || core[i] === '-') { sep = i; break; }
      }
      if (sep === -1) {
        // no real part
        return new Complex(0, Number(core));
      } else {
        let re = Number(core.slice(0,sep));
        let im = Number(core.slice(sep));
        return new Complex(re, im);
      }
    } else {
      // pure real
      return new Complex(Number(s), 0);
    }
  }
  toString() {
    const re = this.re, im = this.im;
    const reStr = Number.isFinite(re) ? String(re) : String(re);
    const imAbs = Math.abs(im);
    if (im === 0) return reStr;
    if (re === 0) return (im===1? "i" : im===-1? "-i" : `${im}i`);
    const sign = im>=0 ? '+' : '-';
    const imPart = (imAbs===1? "i" : `${imAbs}i`);
    return `${reStr}${sign}${imPart}`;
  }
  add(b){ return new Complex(this.re + b.re, this.im + b.im); }
  sub(b){ return new Complex(this.re - b.re, this.im - b.im); }
  mul(b){
    return new Complex(this.re*b.re - this.im*b.im, this.re*b.im + this.im*b.re);
  }
  div(b){
    const denom = b.re*b.re + b.im*b.im;
    if (denom === 0) throw new Error("Divisão por zero (complexo zero).");
    return new Complex((this.re*b.re + this.im*b.im)/denom, (this.im*b.re - this.re*b.im)/denom);
  }
  conj(){ return new Complex(this.re, -this.im); }
  abs(){ return Math.hypot(this.re, this.im); }
  neg(){ return new Complex(-this.re, -this.im); }
  pow(n){
    // n can be integer or real. implement via polar form
    const r = this.abs();
    const theta = Math.atan2(this.im, this.re);
    const rn = Math.pow(r, n);
    const thn = theta * n;
    return new Complex(rn * Math.cos(thn), rn * Math.sin(thn));
  }
  approxEquals(b, eps=1e-8){
    return Math.abs(this.re - b.re) < eps && Math.abs(this.im - b.im) < eps;
  }
  static sqrt(z){
    // principal sqrt
    const r = z.abs();
    const re = Math.sqrt((r + z.re)/2);
    const im = Math.sign(z.im || 1) * Math.sqrt((r - z.re)/2);
    return new Complex(re, im);
  }
}

// ----- Lexer & Parser (recursive descent) -----
function tokenize(input){
  const tokens = [];
  const re = /\s*([A-Za-z_][A-Za-z0-9_]*|\d*\.\d+|\d+|[()+\-*/^,]|(\*\*)|i)\s*/g;
  let m;
  let idx = 0;
  while (idx < input.length){
    re.lastIndex = idx;
    m = re.exec(input);
    if (!m || m.index !== idx) {
      // try to capture 'i' following a number like 3i or -2.5i; or other invalid token
      // allow cases like '3+4i' -> lex numbers and 'i' token already handled
      throw new Error("Token inválido perto de: " + input.slice(idx, idx+20));
    }
    const tok = m[1];
    tokens.push(tok);
    idx = re.lastIndex;
  }
  // merge '**' tokens: our regex handles '**' as one token
  return tokens;
}

// Parser produces AST nodes: {type:'num'|'var'|'op'|'call', value:..., args: [...]}
function parseExpression(tokens){
  let pos = 0;

  function peek(){ return tokens[pos]; }
  function consume(expected){
    const t = tokens[pos];
    if (expected && t !== expected) throw new Error(`Esperado '${expected}' mas encontrado '${t}'`);
    pos++;
    return t;
  }

  // Primary: numbers, variables, parenthesis, function calls, imaginary 'i' or '3i'
  function parsePrimary(){
    const t = peek();
    if (t === '('){
      consume('(');
      const node = parseAddSub();
      if (peek() !== ')') throw new Error("Parêntese não fechado.");
      consume(')');
      return node;
    }
    // Number possibly followed by 'i' e.g. 3 i -> 3i; or token 'i' or '-i'
    if (/^\d/.test(t) || /^\d*\.\d+$/.test(t)){
      const num = consume();
      // if next token is 'i'
      if (peek() === 'i'){
        consume('i');
        return { type: 'num', value: new Complex(Number(num), 0) .mul ? Complex.fromString(num+'i') : Complex.fromString(num+'i') };
      } else {
        return { type: 'num', value: new Complex(Number(num), 0) };
      }
    }
    if (t === 'i'){
      consume('i');
      return { type: 'num', value: new Complex(0,1) };
    }
    // identifier: variable or function
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)){
      const id = consume();
      if (peek() === '('){
        // function call
        consume('(');
        const args = [];
        if (peek() !== ')'){
          while (true){
            args.push(parseAddSub());
            if (peek() === ',') { consume(','); continue; }
            break;
          }
        }
        if (peek() !== ')') throw new Error("Parêntese da função não fechado.");
        consume(')');
        return { type: 'call', name: id, args };
      } else {
        return { type: 'var', name: id };
      }
    }
    // unary + or -
    if (t === '+' || t === '-'){
      const op = consume();
      const prim = parsePrimary();
      if (op === '-') return { type: 'op', op: 'neg', args: [prim] };
      return prim;
    }
    throw new Error("Primário inválido: " + t);
  }

  // Exponentiation (right-assoc) using '**' token
  function parsePower(){
    let left = parsePrimary();
    while (peek() === '**' || peek() === '^'){
      const op = consume();
      const right = parsePower(); // right-associative
      left = { type: 'op', op: '**', args: [left, right] };
    }
    return left;
  }

  function parseMulDiv(){
    let node = parsePower();
    while (peek() === '*' || peek() === '/'){
      const op = consume();
      const right = parsePower();
      node = { type: 'op', op: op, args: [node, right] };
    }
    return node;
  }

  function parseAddSub(){
    let node = parseMulDiv();
    while (peek() === '+' || peek() === '-'){
      const op = consume();
      const right = parseMulDiv();
      node = { type: 'op', op: op, args: [node, right] };
    }
    return node;
  }

  const ast = parseAddSub();
  if (pos < tokens.length) throw new Error("Tokens não consumidos: " + tokens.slice(pos).join(' '));
  return ast;
}

// AST -> LISP notation
function astToLisp(ast){
  if (!ast) return '';
  if (ast.type === 'num') return ast.value.toString();
  if (ast.type === 'var') return ast.name;
  if (ast.type === 'call') {
    return '(' + ast.name + (ast.args.length ? ' ' + ast.args.map(astToLisp).join(' ') : '') + ')';
  }
  if (ast.type === 'op') {
    if (ast.op === 'neg') return '(- ' + astToLisp(ast.args[0]) + ')';
    if (ast.op === '**') return '(** ' + astToLisp(ast.args[0]) + ' ' + astToLisp(ast.args[1]) + ')';
    return '(' + ast.op + ' ' + ast.args.map(astToLisp).join(' ') + ')';
  }
  return JSON.stringify(ast);
}

// Evaluate AST with variables map
function evalAst(ast, vars){
  if (ast.type === 'num') return ast.value;
  if (ast.type === 'var') {
    if (!(ast.name in vars)) throw new Error("Variável '" + ast.name + "' sem valor fornecido.");
    // parse the provided value as complex (allow forms like '3+4i' or real numbers)
    return Complex.fromString(String(vars[ast.name]));
  }
  if (ast.type === 'call'){
    const fn = ast.name.toLowerCase();
    const args = ast.args.map(a => evalAst(a, vars));
    if (fn === 'conj' || fn === 'conjugate') {
      if (args.length !== 1) throw new Error("conj() precisa de 1 argumento.");
      return args[0].conj();
    }
    if (fn === 'sqrt' || fn === 'raiz') {
      if (args.length !== 1) throw new Error("sqrt() precisa de 1 argumento.");
      return Complex.sqrt(args[0]);
    }
    throw new Error("Função desconhecida: " + ast.name);
  }
  if (ast.type === 'op'){
    const op = ast.op;
    if (op === 'neg') {
      const v = evalAst(ast.args[0], vars);
      return v.neg();
    }
    if (op === '+') return evalAst(ast.args[0], vars).add(evalAst(ast.args[1], vars));
    if (op === '-') return evalAst(ast.args[0], vars).sub(evalAst(ast.args[1], vars));
    if (op === '*') return evalAst(ast.args[0], vars).mul(evalAst(ast.args[1], vars));
    if (op === '/') {
      const denom = evalAst(ast.args[1], vars);
      if (denom.re === 0 && denom.im === 0) throw new Error("Divisão por zero detectada durante execução.");
      return evalAst(ast.args[0], vars).div(denom);
    }
    if (op === '**') {
      const base = evalAst(ast.args[0], vars);
      const ex = evalAst(ast.args[1], vars);
      // Allow exponent to be real number only (take re part)
      if (ex.im !== 0) throw new Error("Expoente complexo não suportado.");
      return base.pow(ex.re);
    }
  }
  throw new Error("AST desconhecido ao avaliar.");
}

// utility: find variable names in AST
function collectVars(ast, set){
  if (!ast) return;
  if (ast.type === 'var') set.add(ast.name);
  if (ast.type === 'call' || ast.type === 'op'){
    const arr = ast.args || ast.args || [];
    if (ast.type === 'call') {
      (ast.args || []).forEach(a => collectVars(a, set));
    } else {
      (ast.args || []).forEach(a => collectVars(a, set));
    }
  }
  if (ast.type === 'call') (ast.args || []).forEach(a => collectVars(a, set));
}

// Compare two AST expressions for equivalence by numeric testing at multiple random points
function expressionsEquivalent(ast1, ast2, trials=8){
  // collect variables from both
  const vars = new Set();
  collectVars(ast1, vars); collectVars(ast2, vars);
  const names = Array.from(vars);
  for (let t=0;t<trials;t++){
    const assignment = {};
    for (const n of names){
      // pick random real and imag values to avoid degenerate cases
      const re = (Math.random()-0.5)*10;
      const im = (Math.random()-0.5)*10;
      assignment[n] = `${re}${im>=0?'+':''}${im}i`;
    }
    try {
      const v1 = evalAst(ast1, assignment);
      const v2 = evalAst(ast2, assignment);
      if (!v1.approxEquals(v2, 1e-6)) return { equal:false, counterexample: assignment, v1:v1.toString(), v2:v2.toString() };
    } catch (e){
      // if evaluation failed (e.g., division by zero) try another trial
      continue;
    }
  }
  return { equal:true };
}

// UI wiring
const exprInput = document.getElementById('expr');
const astOut = document.getElementById('astOut');
const logOut = document.getElementById('logOut');
const resultOut = document.getElementById('resultOut');
const parseBtn = document.getElementById('parseBtn');
const runBtn = document.getElementById('runBtn');
const compareBtn = document.getElementById('compareBtn');
const clearBtn = document.getElementById('clearBtn');
const compareBox = document.querySelector('.compareBox');
const expr2Input = document.getElementById('expr2');
const doCompareBtn = document.getElementById('doCompareBtn');

function log(msg){
  logOut.textContent = String(msg) + "\n" + logOut.textContent;
}

function clearAll(){
  astOut.textContent = '(nenhuma)';
  logOut.textContent = '(vazio)';
  resultOut.textContent = '(nenhum)';
}

parseBtn.addEventListener('click', ()=>{
  clearAll();
  const src = exprInput.value;
  try {
    const toks = tokenize(src);
    const ast = parseExpression(toks);
    astOut.textContent = astToLisp(ast);
    log("Expressão parseada com sucesso.");
  } catch (e){
    log("Erro ao parsear: " + e.message);
    resultOut.textContent = '';
  }
});

runBtn.addEventListener('click', async ()=>{
  resultOut.textContent = '';
  logOut.textContent = '';
  try {
    const toks = tokenize(exprInput.value);
    const ast = parseExpression(toks);
    astOut.textContent = astToLisp(ast);
    // collect variables and prompt user
    const vars = new Set();
    collectVars(ast, vars);
    const values = {};
    for (const v of Array.from(vars)){
      let val = prompt(`Valor para a variável '${v}' (aceita formas como 3+4i, -2, 5i):`);
      if (val === null) throw new Error("Execução cancelada pelo usuário.");
      // validate by trying to parse
      try {
        Complex.fromString(val.trim());
      } catch (e){
        throw new Error("Valor inválido para variável " + v + ": " + e.message);
      }
      values[v] = val.trim();
    }
    const res = evalAst(ast, values);
    resultOut.textContent = res.toString();
    log("Execução concluída com sucesso.");
  } catch (e){
    log("Erro na execução: " + e.message);
  }
});

compareBtn.addEventListener('click', ()=>{
  compareBox.hidden = !compareBox.hidden;
});

doCompareBtn.addEventListener('click', ()=>{
  logOut.textContent = '';
  resultOut.textContent = '';
  try {
    const toks1 = tokenize(exprInput.value);
    const ast1 = parseExpression(toks1);
    const toks2 = tokenize(expr2Input.value);
    const ast2 = parseExpression(toks2);
    astOut.textContent = "(expr1) " + astToLisp(ast1) + "\n(expr2) " + astToLisp(ast2);
    const cmp = expressionsEquivalent(ast1, ast2, 12);
    if (cmp.equal) {
      log("As expressões parecem equivalentes (testadas numericamente).");
      resultOut.textContent = "Equivalentes";
    } else {
      log("As expressões NÃO são equivalentes. Contra-exemplo: " + JSON.stringify(cmp.counterexample));
      resultOut.textContent = `Não equivalentes — exemplo: expr1=${cmp.v1}, expr2=${cmp.v2}`;
    }
  } catch (e){
    log("Erro na comparação: " + e.message);
  }
});

clearBtn.addEventListener('click', ()=>{ exprInput.value=''; expr2Input.value=''; clearAll(); });

/* Note:
 - O parser é liberal; admite funções conj(), sqrt() (ou 'raiz' por alias).
 - Erros de representação (tokens inválidos, parênteses não fechados) são interceptados e exibidos.
 - Divisão por zero é checada durante avaliação.
 - A árvore sintática é mostrada em notação LISP.
 - Comparação de equivalência é numérica (teste em pontos aleatórios).
*/
