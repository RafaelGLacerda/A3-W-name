# Calculadora de Números Complexos com Parser e AST

Este projeto implementa uma **calculadora de números complexos** em JavaScript que:

- Faz parsing de expressões matemáticas contendo números complexos.
- Constrói a **árvore sintática abstrata (AST)**.
- Avalia a expressão para obter o resultado final.
- Permite comparar duas expressões complexas numericamente.
- Mostra a AST em **notação LISP**, facilitando a visualização da estrutura da expressão.

---

## Funcionalidades

1. **Parsing avançado**:
   - Suporta números complexos no formato: `3+4i`, `-2-5i`, `4i`, `3`, `-i`, `i`.
   - Suporta operadores: `+`, `-`, `*`, `/`, `**` ou `^` (exponenciação).
   - Funções integradas: `conj()` (conjugado), `sqrt()` ou `raiz()` (raiz quadrada).

2. **Avaliação de expressões**:
   - Permite variáveis simbólicas que podem ser definidas pelo usuário no momento da execução.
   - Detecta divisões por zero complexas.
   - Suporta operações aritméticas completas para números complexos.

3. **Visualização da AST**:
   - Mostra a árvore sintática em **notação LISP**.
   - Facilita entender a ordem das operações e chamadas de funções.

4. **Comparação de expressões**:
   - Testa se duas expressões são equivalentes numericamente.
   - Gera contra-exemplos se as expressões forem diferentes.

5. **Interface web simples**:
   - Campos para digitar expressões.
   - Botões para **parse**, **executar**, **comparar** e **limpar**.
   - Log de execução exibido na página.

---

## Estrutura do Código

- `Complex` — Classe que implementa números complexos com operações básicas (`add`, `sub`, `mul`, `div`, `conj`, `abs`, `neg`, `pow`, `sqrt`) e comparação aproximada.
- **Lexer & Parser** — Funções para tokenização (`tokenize`) e parsing (`parseExpression`) para gerar AST.
- `astToLisp` — Converte a AST em notação LISP.
- `evalAst` — Avalia a AST com valores fornecidos para variáveis.
- `expressionsEquivalent` — Compara duas ASTs numericamente.
- **UI wiring** — Conecta os botões HTML às funções de parsing, execução e comparação.

---

## Exemplos de Uso

### Números complexos

```javascript
Complex.fromString("3+4i");  // 3 + 4i
Complex.fromString("-i");    // 0 - i
Complex.fromString("5");     // 5 + 0i
