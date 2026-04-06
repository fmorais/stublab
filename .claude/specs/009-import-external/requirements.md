# Spec 009 — Import de coleções Postman e specs Swagger/OpenAPI

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Depende de:** Spec 004 (import/export) — reutiliza fluxo de preview + estratégia de conflito
**Depende de:** Spec 006 (workspaces) — import opera dentro do workspace ativo
**Criado em:** 2025-04

---

## Contexto

A Spec 004 implementou import/export no formato nativo do StubLab. Esta spec adiciona suporte
a dois formatos externos amplamente usados no mercado:

- **Postman Collection v2.1** — times que já têm suas APIs documentadas no Postman podem
  importar a coleção e criar os endpoints mockados sem redigitar nada
- **Swagger/OpenAPI 2.0 e 3.x** — times que têm spec OpenAPI (seja gerada pelo backend ou
  mantida manualmente) podem importar os endpoints com responseBody gerado a partir dos
  schemas de exemplo definidos na spec

Ambos os formatos são tratados como fontes de importação e seguem o mesmo fluxo de preview e
estratégia de conflito da Spec 004 — o usuário sempre revisa antes de confirmar.

---

## User stories

**US-01 — Selecionar fonte de importação**
Como desenvolvedor,
quero escolher de qual formato estou importando,
para que o StubLab interprete o arquivo corretamente.

Critérios de aceitação:
- QUANDO acesso o fluxo de import no workspace
- ENTÃO vejo três opções: "StubLab (.json)", "Postman Collection (.json)", "Swagger/OpenAPI (.json/.yaml)"
- Cada opção tem ícone e descrição curta do formato aceito
- A seleção determina o parser usado e as opções disponíveis no passo seguinte

**US-02 — Importar coleção Postman**
Como desenvolvedor,
quero importar uma coleção Postman exportada,
para criar endpoints mockados a partir dos requests já documentados.

Critérios de aceitação:
- QUANDO seleciono "Postman Collection" e faço upload de um arquivo `.json`
- ENTÃO o StubLab aceita Postman Collection v2 e v2.1
- E exibe preview com a lista de endpoints extraídos:
  - Método + path (extraído da URL do request)
  - Nome (do campo `name` do request na coleção)
  - Status: "Novo" ou "Conflito" (mesmo method + path já existe no workspace)
- Requests dentro de pastas (folders) são extraídos normalmente — a estrutura de pastas
  é ignorada, apenas os requests importam
- Requests com URL dinâmica (variáveis Postman `{{baseUrl}}/users`) têm `{{baseUrl}}`
  removido — apenas o path é preservado: `/users`
- O `responseBody` é criado como `{}` — Postman não define responses canônicas por padrão
- O `responseStatus` é `200` por padrão
- QUANDO confirmo com a estratégia de conflito escolhida
- ENTÃO os endpoints são criados no workspace com `active: true`

**US-03 — Importar Swagger/OpenAPI via upload de arquivo**
Como desenvolvedor,
quero fazer upload de um arquivo Swagger/OpenAPI,
para criar endpoints mockados com responseBody gerado dos schemas de exemplo.

Critérios de aceitação:
- QUANDO seleciono "Swagger/OpenAPI" e faço upload de `.json` ou `.yaml`
- ENTÃO o StubLab aceita OpenAPI 2.0 (Swagger) e OpenAPI 3.0.x / 3.1.x
- E exibe preview com endpoints extraídos:
  - Método + path
  - Nome: `operationId` se disponível, senão `"{METHOD} {path}"`
  - Response status: primeiro status de sucesso definido (2xx) — senão `200`
  - ResponseBody: gerado a partir do schema de exemplo (ver US-05)
  - Status: "Novo" ou "Conflito"
- QUANDO confirmo
- ENTÃO os endpoints são criados no workspace

**US-04 — Importar Swagger/OpenAPI via URL pública**
Como desenvolvedor,
quero informar uma URL pública da spec OpenAPI,
para importar sem precisar baixar e fazer upload do arquivo manualmente.

Critérios de aceitação:
- QUANDO seleciono "Swagger/OpenAPI" e escolho a aba "URL"
- ENTÃO vejo campo de texto para digitar a URL
- QUANDO clico em "Carregar"
- ENTÃO o StubLab faz fetch da URL, valida o conteúdo e exibe o preview
- SE a URL retornar erro ou o conteúdo não for OpenAPI válido
- ENTÃO exibo mensagem de erro clara com o motivo
- URLs aceitas: HTTP e HTTPS; sem autenticação (spec futura para URLs protegidas)
- Timeout de fetch: 15 segundos

**US-05 — Geração de responseBody a partir de schema OpenAPI**
Como desenvolvedor,
quero que o responseBody dos endpoints importados seja um JSON de exemplo realista,
para já ter algo funcional sem precisar editar cada endpoint manualmente.

Critérios de aceitação:
- QUANDO o schema da response tem `example` definido explicitamente
- ENTÃO usa o `example` diretamente como responseBody
- QUANDO o schema tem `examples` (OpenAPI 3.x)
- ENTÃO usa o primeiro exemplo disponível
- QUANDO não há exemplo explícito mas há `properties` no schema
- ENTÃO gera um JSON de exemplo com os campos do schema usando valores padrão por tipo:
  - `string` → `"string"`
  - `integer` / `number` → `0`
  - `boolean` → `false`
  - `array` → `[]`
  - `object` aninhado → gerado recursivamente (máximo 3 níveis de profundidade)
- QUANDO não há schema de response definido
- ENTÃO responseBody é `{}`
- O responseBody gerado é sempre JSON válido e indentado

**US-06 — Preview unificado antes de confirmar**
Como desenvolvedor,
quero revisar todos os endpoints que serão importados antes de confirmar,
para ter controle sobre o que entra no workspace.

Critérios de aceitação:
- O preview segue o mesmo padrão da Spec 004:
  - Tabela com método, path, status (Novo / Conflito / Inválido)
  - Contagem: "X novos, Y conflitos"
  - Seletor de estratégia de conflito (Ignorar / Sobrescrever / Importar como novo)
- QUANDO expando uma linha do preview
- ENTÃO vejo o responseBody que será criado (com syntax highlight via JsonEditor da Spec 003)
- O botão "Confirmar importação" só fica ativo se houver pelo menos um endpoint válido selecionado

**US-07 — Validação e erros claros**
Como desenvolvedor,
quero receber mensagens de erro úteis quando o arquivo for inválido ou incompatível,
para entender o problema sem precisar inspecionar o JSON manualmente.

Critérios de aceitação:
- Arquivo não é JSON/YAML válido → "Arquivo inválido: erro de sintaxe na linha X"
- JSON válido mas não é Postman nem OpenAPI → "Formato não reconhecido. Verifique se o arquivo é uma Postman Collection v2.x ou uma spec OpenAPI 2.0/3.x"
- OpenAPI válido mas versão não suportada → "Versão OpenAPI X.X não suportada. Versões aceitas: 2.0, 3.0.x, 3.1.x"
- Nenhum endpoint extraído → "Nenhum endpoint encontrado no arquivo. Verifique se a coleção contém requests ou se a spec define paths."
- Arquivo maior que 10MB → "Arquivo muito grande. O tamanho máximo é 10MB."

---

## Mapeamento de campos por fonte

### Postman Collection → Endpoint StubLab

| Campo StubLab     | Origem Postman                                      | Fallback        |
|-------------------|-----------------------------------------------------|-----------------|
| `name`            | `item.name`                                         | `"{METHOD} {path}"` |
| `method`          | `item.request.method`                               | —               |
| `path`            | `item.request.url.path` (array joined com `/`)      | —               |
| `responseStatus`  | —                                                   | `200`           |
| `responseBody`    | —                                                   | `{}`            |
| `responseHeaders` | —                                                   | `{}`            |
| `delay`           | —                                                   | `0`             |
| `active`          | —                                                   | `true`          |

### OpenAPI → Endpoint StubLab

| Campo StubLab     | Origem OpenAPI                                               | Fallback        |
|-------------------|--------------------------------------------------------------|-----------------|
| `name`            | `paths.{path}.{method}.operationId`                          | `"{METHOD} {path}"` |
| `method`          | chave do objeto `paths.{path}`                               | —               |
| `path`            | chave do objeto `paths`                                      | —               |
| `responseStatus`  | primeiro status 2xx de `responses`                           | `200`           |
| `responseBody`    | gerado do schema (US-05)                                     | `{}`            |
| `responseHeaders` | `Content-Type: application/json` se response for JSON        | `{}`            |
| `delay`           | —                                                            | `0`             |
| `active`          | —                                                            | `true`          |

---

## Tratamento de paths com parâmetros

Postman e OpenAPI usam notações diferentes para path params — ambas devem ser normalizadas
para o formato do StubLab (`:param`):

| Fonte    | Notação original       | StubLab          |
|----------|------------------------|------------------|
| Postman  | `:id` ou `{{id}}`      | `:id`            |
| OpenAPI  | `{id}`                 | `:id`            |

Exemplos:
- `/users/{userId}/orders/{orderId}` → `/users/:userId/orders/:orderId`
- `/users/:id` → `/users/:id` (já no formato correto)
- `/users/{{id}}` → `/users/:id`

---

## O que está FORA do escopo desta spec

- Importar testes/scripts do Postman como regras de matching (spec futura)
- Importar ambientes do Postman (variáveis) (spec futura)
- Importar coleções Postman v1 (formato descontinuado)
- URLs Swagger/OpenAPI protegidas com autenticação (spec futura)
- Sincronização automática com URL da spec (spec futura — reimportar ao detectar mudanças)
- Importar AsyncAPI, RAML ou outros formatos (spec futura)
- Exportar no formato Postman ou OpenAPI (spec futura)

---

## Impacto em features existentes

| Spec | Impacto |
|------|---------|
| Spec 003 — JSON editor | Usado no preview para exibir o responseBody gerado |
| Spec 004 — Import/Export | Fluxo de preview e estratégia de conflito reutilizados; adicionar seletor de fonte no início do fluxo |
| Spec 006 — Workspaces | Import opera dentro do workspace ativo — sem alteração de comportamento |

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/009-import-external/design.md` — bibliotecas de parsing recomendadas
   (ex: `swagger-parser` para OpenAPI, parsing manual para Postman), arquitetura do
   parser com strategy pattern por fonte, geração de exemplo a partir de schema JSON,
   normalização de path params
2. `.claude/specs/009-import-external/tasks.md` — tarefas para @backend-dev,
   @frontend-dev e @tester
