# Tasks — Spec 009: Import de Postman e Swagger/OpenAPI

**Design aprovado em:** 2026-04-05 (pendente aprovacao)  
**Estimativa total:** ~24h (12 tarefas backend, 8 tarefas frontend, 4 tarefas testes, 1 revisao)

---

## Pre-requisitos

- [ ] Design aprovado (design.md)
- [ ] Branch criada: `feat/009-import-external`
- [ ] Dependencias instaladas:
  - Backend: `pnpm add @apidevtools/swagger-parser`
  - Frontend: `pnpm add js-yaml && pnpm add -D @types/js-yaml`

---

## Backend

### Schemas

- [ ] **T01** [S] @backend-dev — Criar schemas Zod para import externo
  - Arquivo: `apps/api/src/schemas/import-external.ts`
  - Conteudo:
    - `importSourceSchema` (enum: stublab, postman, openapi)
    - `externalImportPreviewBodySchema` (source + data unknown)
    - `fetchOpenApiBodySchema` (url string)
    - `postmanCollectionSchema` (validacao minima de estrutura)
  - Criterio: schemas exportados, testes unitarios com fixtures validas/invalidas

---

### Parsers

- [ ] **T02** [M] @backend-dev — Criar interface e factory de parsers
  - Arquivo: `apps/api/src/services/parsers/index.ts`
  - Conteudo:
    - Interface `ExternalParser` com metodo `parse(content: unknown): ParseResult`
    - Interface `ParseResult` com `success`, `endpoints`, `errors`
    - Factory `getParser(source: ImportSource): ExternalParser`
  - Criterio: factory retorna parser correto por source, tipos exportados

- [ ] **T03** [M] @backend-dev — Implementar PostmanParser
  - Arquivo: `apps/api/src/services/parsers/postman-parser.ts`
  - Conteudo:
    - Extracao recursiva de items (folders e requests)
    - Normalizacao de path ({{var}} -> :var, {param} -> :param)
    - Validacao de versao v2/v2.1
  - Criterio: testes cobrindo:
    - Collection simples (5 requests)
    - Collection com folders aninhadas (3 niveis)
    - Requests com variaveis Postman no path
    - Collection vazia (retorna erro)
    - Collection v1 (retorna erro de versao)

- [ ] **T04** [L] @backend-dev — Implementar SchemaExampleGenerator
  - Arquivo: `apps/api/src/services/parsers/schema-example-generator.ts`
  - Conteudo:
    - Funcao `generateFromSchema(schema, depth)` recursiva
    - Suporte a tipos: string, integer, number, boolean, array, object
    - Suporte a formats: date, date-time, email, uuid
    - Suporte a enum (usar primeiro valor)
    - Suporte a allOf/oneOf/anyOf (usar primeiro schema)
    - Limite de profundidade: 3 niveis
  - Criterio: testes cobrindo:
    - Schema simples (objeto com primitivos)
    - Schema com array de objetos
    - Schema com enum
    - Schema com allOf
    - Schema aninhado (3 niveis)
    - Schema sem type (retorna null)

- [ ] **T05** [L] @backend-dev — Implementar OpenApiParser
  - Arquivo: `apps/api/src/services/parsers/openapi-parser.ts`
  - Conteudo:
    - Validacao com @apidevtools/swagger-parser
    - Suporte a Swagger 2.0, OpenAPI 3.0.x, 3.1.x
    - Extracao de paths e operacoes
    - Inferencia de responseStatus (primeiro 2xx)
    - Geracao de responseBody via SchemaExampleGenerator
    - Inferencia de responseHeaders (Content-Type)
  - Criterio: testes cobrindo:
    - Swagger 2.0 (Petstore)
    - OpenAPI 3.0.3 com $ref
    - OpenAPI 3.1.0 com examples
    - Spec com paths vazio (retorna erro)
    - Spec com versao invalida (retorna erro)

---

### Rotas

- [ ] **T06** [M] @backend-dev — Atualizar rota POST /import/preview para suportar source
  - Arquivo: `apps/api/src/routes/endpoints/import-preview.ts`
  - Conteudo:
    - Detectar formato do body (com ou sem source)
    - Se sem source, assumir stublab (retrocompatibilidade)
    - Se com source, chamar parser apropriado
    - Converter resultado do parser para formato de preview existente
  - Criterio: testes cobrindo:
    - Body sem source (formato antigo) continua funcionando
    - Body com source=stublab funciona
    - Body com source=postman chama PostmanParser
    - Body com source=openapi chama OpenApiParser
    - Erro de parser retorna 400 com mensagem clara

- [ ] **T07** [S] @backend-dev — Criar rota POST /import/from-url
  - Arquivo: `apps/api/src/routes/endpoints/import-from-url.ts`
  - Conteudo:
    - Validar URL com Zod
    - Fetch com timeout de 15s (usar undici)
    - Detectar Content-Type (JSON vs YAML)
    - Parsear conteudo com js-yaml se necessario
    - Validar com swagger-parser
    - Retornar { source, data, detectedVersion }
  - Criterio: testes cobrindo:
    - URL retornando JSON valido
    - URL retornando YAML valido
    - URL com timeout (mock de rede lenta)
    - URL retornando HTML (erro)
    - URL invalida (erro 400)

- [ ] **T08** [S] @backend-dev — Registrar nova rota no app.ts
  - Arquivo: `apps/api/src/app.ts`
  - Conteudo:
    - Import de `importFromUrlRoute`
    - Registro no escopo de workspace
  - Criterio: rota acessivel via curl

---

### Service

- [ ] **T09** [S] @backend-dev — Ajustar ImportExportService.previewImport para aceitar endpoints ja normalizados
  - Arquivo: `apps/api/src/services/import-export-service.ts`
  - Conteudo:
    - Novo overload ou funcao `previewFromParsedEndpoints(workspaceId, endpoints)`
    - Evitar revalidacao quando endpoints ja vem normalizados do parser
  - Criterio: testes existentes continuam passando, novo teste com endpoints pre-parseados

---

## Frontend

### Tipos

- [ ] **T10** [S] @frontend-dev — Criar tipos para import externo
  - Arquivo: `apps/web/src/types/import-external.ts`
  - Conteudo:
    - `ImportSource` type
    - `FetchUrlResponse` interface
    - `ParseError` interface
  - Criterio: tipos exportados e usados nos hooks

---

### Hooks

- [ ] **T11** [S] @frontend-dev — Criar hook useImportFromUrl
  - Arquivo: `apps/web/src/hooks/use-import-from-url.ts`
  - Conteudo:
    - useMutation para POST /import/from-url
    - Tipagem correta de request/response
  - Criterio: hook exportado, mutation funciona

- [ ] **T12** [S] @frontend-dev — Atualizar useImportPreview para suportar source
  - Arquivo: `apps/web/src/hooks/use-import-endpoints.ts`
  - Conteudo:
    - Adicionar parametro opcional `source` ao mutationFn
    - Ajustar payload para incluir source quando fornecido
  - Criterio: testes existentes passam, novo teste com source=postman

---

### Lib

- [ ] **T13** [S] @frontend-dev — Criar wrapper para js-yaml com lazy loading
  - Arquivo: `apps/web/src/lib/yaml-parser.ts`
  - Conteudo:
    - Funcao `parseYaml(content: string): unknown`
    - Tratamento de erro com mensagem amigavel
  - Criterio: YAML valido retorna objeto, YAML invalido lanca erro com linha

---

### Componentes

- [ ] **T14** [M] @frontend-dev — Criar componente ImportSourceSelector
  - Arquivo: `apps/web/src/components/import-source-selector.tsx`
  - Conteudo:
    - 3 opcoes: StubLab, Postman, Swagger/OpenAPI
    - Cada opcao com icone, titulo e descricao
    - Estilo radio button visual (card selecionavel)
  - Criterio: renderiza corretamente, onChange funciona, acessibilidade (aria)

- [ ] **T15** [L] @frontend-dev — Atualizar ImportModal para fluxo multi-source
  - Arquivo: `apps/web/src/components/import-modal.tsx`
  - Conteudo:
    - Novo estado inicial 'selecting-source'
    - Integracao com ImportSourceSelector
    - Para OpenAPI: tabs "Arquivo" e "URL"
    - Campo de URL com botao "Carregar"
    - Estado 'loading-url' com spinner
    - Tratamento de erros especificos por fonte
    - Validacao de tamanho de arquivo (10MB max)
  - Criterio: fluxo completo funciona para 3 fontes, erros mostrados corretamente

- [ ] **T16** [M] @frontend-dev — Adicionar preview expandivel com responseBody
  - Arquivo: `apps/web/src/components/import-preview-table.tsx`
  - Conteudo:
    - Botao de expandir em cada linha
    - Linha expandida mostra JsonEditor readonly com responseBody
    - Estado de linhas expandidas
  - Criterio: expandir/colapsar funciona, JsonEditor renderiza corretamente

- [ ] **T17** [S] @frontend-dev — Atualizar tipos de import-export
  - Arquivo: `apps/web/src/types/import-export.ts`
  - Conteudo:
    - Adicionar campo opcional `responseBody` no ImportPreviewItem (para exibicao)
    - Ajustar tipos para suportar source
  - Criterio: tipos alinhados com API

---

## Testes

- [ ] **T18** [M] @tester — Criar fixtures de teste para Postman e OpenAPI
  - Arquivos:
    - `apps/api/tests/fixtures/postman-simple.json`
    - `apps/api/tests/fixtures/postman-nested.json`
    - `apps/api/tests/fixtures/postman-variables.json`
    - `apps/api/tests/fixtures/swagger-2.0.json`
    - `apps/api/tests/fixtures/openapi-3.0.json`
    - `apps/api/tests/fixtures/openapi-3.1.yaml`
  - Criterio: fixtures representam casos reais, documentadas

- [ ] **T19** [M] @tester — Testes de integracao para parsers
  - Arquivo: `apps/api/tests/services/parsers/postman-parser.test.ts`
  - Arquivo: `apps/api/tests/services/parsers/openapi-parser.test.ts`
  - Arquivo: `apps/api/tests/services/parsers/schema-example-generator.test.ts`
  - Criterio: cobertura minima 80%, casos de sucesso e erro

- [ ] **T20** [M] @tester — Testes de integracao para rotas de import externo
  - Arquivo: `apps/api/tests/routes/endpoints/import-external.test.ts`
  - Conteudo:
    - POST /import/preview com source=postman
    - POST /import/preview com source=openapi
    - POST /import/from-url (mock de fetch)
    - Casos de erro: arquivo invalido, URL inacessivel
  - Criterio: cobertura minima 80%

- [ ] **T21** [M] @tester — Testes de componentes React
  - Arquivo: `apps/web/tests/components/import-source-selector.test.tsx`
  - Arquivo: `apps/web/tests/components/import-modal-external.test.tsx`
  - Conteudo:
    - ImportSourceSelector renderiza opcoes
    - ImportModal com Postman file upload
    - ImportModal com OpenAPI URL
    - Erros exibidos corretamente
  - Criterio: fluxos principais cobertos

---

## Revisao

- [ ] **T22** @code-reviewer — Revisao final antes do merge
  - Checklist:
    - [ ] Todos os testes passando
    - [ ] Sem `any` no codigo
    - [ ] Erros da API seguem formato `{ error, code }`
    - [ ] Parsers isolados e testaveis
    - [ ] Retrocompatibilidade da API mantida
    - [ ] Lazy loading de js-yaml no frontend
    - [ ] Limite de tamanho de arquivo validado
    - [ ] Mensagens de erro claras e em portugues
  - Criterio: PR aprovado

---

## Ordem de Execucao (dependencias)

```
Pre-requisitos
  |
  v
T01 (schemas) ────────────────────────────────────┐
  |                                               |
  v                                               v
T02 (interface parsers)                     T10 (tipos frontend)
  |                                               |
  +──────────┬──────────┐                         v
  |          |          |                   T11 (hook URL)
  v          v          v                         |
T04 (schema  T03 (postman T05 (openapi           v
 generator)   parser)     parser)           T12 (hook preview)
  |               |           |                   |
  +───────────────+───────────+                   v
                  |                         T13 (yaml parser)
                  v                               |
            T06 (rota preview)                    v
                  |                         T14 (source selector)
                  v                               |
            T07 (rota URL)                        v
                  |                         T15 (modal atualizado)
                  v                               |
            T08 (registrar)                       v
                  |                         T16 (preview expandivel)
                  v                               |
            T09 (service)                         v
                  |                         T17 (tipos)
                  +───────────────────────────────+
                                  |
                                  v
                            T18 (fixtures)
                                  |
                                  v
                            T19 (testes parsers)
                                  |
                                  v
                            T20 (testes rotas)
                                  |
                                  v
                            T21 (testes React)
                                  |
                                  v
                            T22 (revisao)
```

---

## Notas para implementacao

1. **swagger-parser e assincrono:** Usar `await SwaggerParser.validate(spec)` — nao bloqueia.

2. **Timeout no fetch:** Usar `AbortController` com `setTimeout` de 15s:
   ```typescript
   const controller = new AbortController()
   const timeout = setTimeout(() => controller.abort(), 15000)
   try {
     const res = await fetch(url, { signal: controller.signal })
     // ...
   } finally {
     clearTimeout(timeout)
   }
   ```

3. **Deteccao de YAML vs JSON:** Tentar `JSON.parse` primeiro. Se falhar, tentar YAML.

4. **Limite de tamanho:** Validar `file.size > 10 * 1024 * 1024` no onChange do input.

5. **Recursao em Postman:** Usar fila (queue) ao inves de recursao direta para evitar stack overflow em colecoes muito aninhadas.

6. **$ref em OpenAPI:** O swagger-parser dereferencia automaticamente. O schema resultante nao tem $ref.

7. **allOf/oneOf/anyOf:** Para geracao de exemplo, usar apenas o primeiro schema. Documentar que casos complexos podem gerar exemplos incompletos.

8. **Variaveis Postman nao resolvidas:** Alem de `{{var}}`, Postman pode ter `:pathParam`. Ambos devem virar `:param` no StubLab.

9. **Content-Type de resposta:** Para OpenAPI, se response tem `content['application/json']`, setar `Content-Type: application/json` nos headers.

10. **Versao OpenAPI no response:** Retornar `detectedVersion` (ex: "3.0.3") para o frontend exibir ao usuario.
