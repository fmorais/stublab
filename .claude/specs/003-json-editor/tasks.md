# Tasks — Spec 003: Editor de Codigo para Campos JSON

**Design aprovado em:** 2026-04-03  
**Estimativa total:** ~8h (4 tarefas M, 3 tarefas S)

---

## Pre-requisitos

- [x] Design aprovado (design.md)
- [ ] Dependencias instaladas (`pnpm add @uiw/react-codemirror @codemirror/lang-json` em apps/web)

---

## Setup

- [ ] **T01** [S] @frontend-dev — Instalar dependencias CodeMirror
  - Executar: `cd apps/web && pnpm add @uiw/react-codemirror @codemirror/lang-json`
  - Criterio: `pnpm install` sem erros, pacotes aparecem em package.json

---

## Componente JsonEditor

- [ ] **T02** [M] @frontend-dev — Criar componente JsonEditor base
  - Arquivo: `apps/web/src/components/json-editor.tsx`
  - Implementar props: value, onChange, minHeight, maxHeight, readOnly, hasError, placeholder
  - Configurar extensoes: lang-json, bracket matching, line wrapping
  - Aplicar tema usando CSS variables do projeto
  - Criterio: componente renderiza, aceita input, emite onChange

- [ ] **T03** [S] @frontend-dev — Adicionar botao Formatar JSON
  - Adicionar botao com icone (lucide-react Code2 ou similar) no canto superior direito
  - Implementar formatacao com JSON.stringify(JSON.parse(value), null, 2)
  - Botao desabilitado visualmente quando JSON invalido (try/catch interno)
  - Criterio: clicar em Formatar reformata JSON valido, nada acontece se invalido

- [ ] **T04** [S] @frontend-dev — Criar helper isValidJson
  - Arquivo: `apps/web/src/lib/json-utils.ts`
  - Exportar funcao `isValidJson(str: string): boolean`
  - String vazia ou whitespace retorna false
  - Criterio: helper exportado, testavel isoladamente

---

## Integracao endpoint-form

- [ ] **T05** [M] @frontend-dev — Integrar JsonEditor no campo responseBody
  - Arquivo: `apps/web/src/components/endpoint-form.tsx`
  - Substituir `<textarea>` por `<Controller>` + `<JsonEditor>`
  - Atualizar formSchema: responseBody com `.refine(isValidJson, ...)`
  - Valor default: `'{}'` em vez de `''`
  - Criterio: formulario renderiza com editor, validacao funciona, submit envia JSON

- [ ] **T06** [S] @frontend-dev — Adicionar estilos CSS para JsonEditor
  - Arquivo: `apps/web/src/index.css`
  - Adicionar classes: .json-editor-wrapper, borda de erro, focus ring
  - Criterio: editor tem borda arredondada, borda vermelha quando hasError=true, focus visivel

---

## Integracao matching-rule-row

- [ ] **T07** [M] @frontend-dev — Usar JsonEditor no campo value quando source=body
  - Arquivo: `apps/web/src/components/matching-rule-row.tsx`
  - Renderizar JsonEditor quando `value.source === 'body'`
  - Manter Input para query e header
  - Props: minHeight=80, maxHeight=200
  - Criterio: ao selecionar source=body, campo value vira editor; ao trocar para query, volta a Input

---

## Testes

- [ ] **T08** [M] @tester — Testes unitarios do componente JsonEditor
  - Arquivo: `apps/web/src/components/__tests__/json-editor.test.tsx`
  - Casos:
    1. Renderiza com valor inicial
    2. Chama onChange ao digitar
    3. Aplica classe de erro quando hasError=true
    4. Botao Formatar reformata JSON valido
    5. Botao Formatar nao altera JSON invalido
    6. Respeita minHeight e maxHeight
  - Criterio: 6 testes passando

- [ ] **T09** [S] @tester — Testes do helper isValidJson
  - Arquivo: `apps/web/src/lib/__tests__/json-utils.test.ts`
  - Casos:
    1. `"{}"` retorna true
    2. `"[]"` retorna true
    3. `'{"key": "value"}'` retorna true
    4. `""` retorna false
    5. `"   "` retorna false
    6. `"{invalid}"` retorna false
    7. `"null"` retorna true (JSON valido)
  - Criterio: 7 testes passando

- [ ] **T10** [S] @tester — Teste de integracao do endpoint-form com JsonEditor
  - Arquivo: `apps/web/src/components/__tests__/endpoint-form.test.tsx` (adicionar casos)
  - Casos:
    1. Formulario inicia com responseBody = "{}"
    2. Submit desabilitado quando JSON invalido
    3. Erro exibido abaixo do editor quando JSON invalido
    4. Submit habilitado apos corrigir JSON
  - Criterio: 4 testes passando, sem regressao nos testes existentes

---

## Revisao

- [ ] **T11** @code-reviewer — Revisao final antes do merge
  - Verificar: tipos corretos, sem any, imports absolutos @web/
  - Verificar: testes cobrem caminho feliz + erros
  - Verificar: sem console.log, sem TODO sem issue
  - Criterio: PR aprovado

---

## Ordem de Execucao (dependencias)

```
T01 (setup)
  |
  v
T04 (helper) --> T02 (componente base) --> T03 (botao formatar)
                        |
                        v
                 T05 (endpoint-form) + T06 (CSS)
                        |
                        v
                 T07 (matching-rule-row)
                        |
                        v
                 T08, T09, T10 (testes) --> T11 (revisao)
```

---

## Notas para Implementacao

1. **Importar Controller**: `import { Controller } from 'react-hook-form'`

2. **Tema CodeMirror**: usar `EditorView.theme()` com CSS variables, nao importar temas prontos

3. **Altura dinamica**: CodeMirror precisa de height explicito; usar wrapper div com min/max-height

4. **Testing Library + CodeMirror**: CodeMirror renderiza canvas/divs complexos; testar via value/onChange props em vez de simular keystrokes

5. **Placeholder**: CodeMirror suporta placeholder via extensao `placeholder()` de `@codemirror/view`
