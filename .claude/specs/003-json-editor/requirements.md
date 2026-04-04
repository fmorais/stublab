# Spec 003 — Editor de código para campos JSON

**Status:** concluída — design aprovado em 2026-04-03, implementação e testes entregues
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Relacionada com:** Spec 002 (matching avançado) — campo de valor de regra se beneficia
**Criado em:** 2025-04

---

## Contexto

O campo `responseBody` na tela de criação e edição de endpoints é atualmente um `<textarea>`
simples. Isso causa problemas reais de usabilidade:

- Pressionar `Tab` sai do campo em vez de indentar
- Nenhuma validação visual de JSON (erro só aparece no servidor)
- Sem highlight de sintaxe — difícil ler JSON longo
- Sem formatação automática — JSON minificado colado fica ilegível
- Sem autocomplete de chaves/colchetes

O objetivo desta spec é substituir esse campo por um editor de código leve com experiência
adequada para edição de JSON.

---

## User stories

**US-01 — Tab indenta em vez de sair do campo**
Como desenvolvedor,
quero que ao pressionar Tab dentro do editor o texto seja indentado,
para poder formatar o JSON sem usar o mouse.

Critérios de aceitação:
- QUANDO pressiono Tab dentro do editor
- ENTÃO dois espaços são inseridos na posição do cursor
- E o foco permanece no editor
- QUANDO pressiono Shift+Tab
- ENTÃO a indentação do início da linha é removida (se houver)

**US-02 — Validação visual de JSON em tempo real**
Como desenvolvedor,
quero ver imediatamente se o JSON que digitei é inválido,
para corrigir antes de salvar.

Critérios de aceitação:
- QUANDO o conteúdo do editor não é JSON válido
- ENTÃO uma indicação visual de erro aparece (borda vermelha + mensagem abaixo)
- E o botão de salvar é desabilitado enquanto o JSON for inválido
- QUANDO o JSON se tornar válido
- ENTÃO o erro desaparece imediatamente
- JSON vazio (`""`) é considerado inválido
- Qualquer JSON válido é aceito, incluindo objeto (`{}`), array (`[]`) e literais como `null`, `true`, números e strings JSON

**US-03 — Highlight de sintaxe**
Como desenvolvedor,
quero que o JSON tenha colorização de sintaxe,
para ler e editar payloads complexos com mais facilidade.

Critérios de aceitação:
- Chaves e colchetes: cor neutra
- Strings (valores): cor destacada (ex: verde ou azul)
- Números e booleanos: cor diferente de strings
- Chaves de objeto (keys): cor diferente de valores
- O tema de cores respeita dark mode / light mode do sistema

**US-04 — Formatar JSON com um clique**
Como desenvolvedor,
quero formatar o JSON colado ou digitado de forma compacta,
para deixá-lo legível sem fazer isso manualmente.

Critérios de aceitação:
- QUANDO clico no botão "Formatar" (ou atalho Shift+Alt+F)
- E o conteúdo é JSON válido
- ENTÃO o JSON é reformatado com indentação de 2 espaços
- SE o JSON for inválido, o botão não faz nada (e o erro já está visível)

**US-05 — Altura adaptável ao conteúdo**
Como desenvolvedor,
quero que o editor cresça verticalmente conforme o conteúdo,
para não precisar rolar dentro do campo ao editar JSONs longos.

Critérios de aceitação:
- QUANDO o conteúdo ultrapassa a altura mínima do editor
- ENTÃO o editor cresce automaticamente
- Altura mínima: 120px (equivalente a ~5 linhas)
- Altura máxima: 480px — acima disso o editor tem scroll interno

**US-06 — Valor padrão ao criar endpoint**
Como desenvolvedor,
quero que o campo de response body já venha preenchido com `{}` formatado,
para não começar com campo vazio.

Critérios de aceitação:
- QUANDO abro o formulário de criação de endpoint
- ENTÃO o editor já exibe `{}` como valor inicial
- E o cursor está posicionado dentro das chaves

---

## Componente — JsonEditor

O editor deve ser encapsulado em um componente React reutilizável `<JsonEditor>` com a seguinte
interface:

```typescript
interface JsonEditorProps {
  value: string                    // JSON como string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: number               // px, default 120
  maxHeight?: number               // px, default 480
  readOnly?: boolean               // default false
}
```

O componente é responsável por:
- Renderizar o editor com highlight de sintaxe
- Expor o valor atual como string (mesmo que inválido — validação é responsabilidade do form)
- Emitir `onChange` a cada keystroke

A validação de JSON (mostrar erro, desabilitar botão) é feita pelo form que usa o componente,
usando `zodResolver` com `z.string().refine(isValidJson)`.

---

## Biblioteca recomendada

Usar **CodeMirror 6** (`@codemirror/lang-json` + `@codemirror/theme-one-dark`).

Justificativas:
- Leve (~50kb gzipped com extensões JSON)
- Suporte nativo a JSON: highlight, validação, folding
- API React bem documentada via `@uiw/react-codemirror`
- Ativa e mantida (2024+)
- Suporte nativo a dark/light mode

Alternativas descartadas:
- Monaco Editor (VS Code): muito pesado (~2MB) para este caso
- Ace Editor: API mais antiga, menos manutenção recente
- `<textarea>` com PrismJS: sem suporte a Tab, indentação manual demais

---

## Onde o componente é usado

| Tela                        | Campo                  | Observação                          |
|-----------------------------|------------------------|--------------------------------------|
| Criação de endpoint         | `responseBody`         | valor inicial `{}`                  |
| Edição de endpoint          | `responseBody`         | carrega valor salvo                 |
| Spec 002 — regra de matching| `value` (tipo `body`)  | apenas quando `source == "body"`    |

O campo `responseHeaders` também é JSON, mas tem estrutura mais simples (objeto flat de
key-value) — pode usar o editor ou um componente de pares chave-valor. Deixar para o
`@architect` decidir no design.

---

## O que está FORA do escopo desta spec

- Autocomplete de campos baseado em schema (spec futura)
- Diff side-by-side entre request e response (spec futura)
- Editor para outros formatos além de JSON (XML, YAML) — spec futura
- Salvar snippets de JSON reutilizáveis — spec futura

---

## Impacto em features existentes

- **Spec 001:** substituir `<textarea>` do `responseBody` pelo `<JsonEditor>`
- **Spec 002:** usar `<JsonEditor>` no campo de valor quando `source == "body"`
- Nenhuma mudança no backend ou banco de dados — puramente frontend

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/003-json-editor/design.md` — decisão final de biblioteca, estrutura do
   componente, integração com react-hook-form e impacto nas telas existentes
2. `.claude/specs/003-json-editor/tasks.md` — tarefas para @frontend-dev e @tester
