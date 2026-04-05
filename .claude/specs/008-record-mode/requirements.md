# Spec 008 — Record mode

**Status:** aguardando design (@architect)
**Depende de:** Spec 006 (workspaces) — record mode é configurado por workspace
**Depende de:** Spec 007 (proxy mode) — record mode só funciona com proxy ativo
**Criado em:** 2025-04

---

## Contexto

O proxy mode (Spec 007) permite encaminhar requests sem mock para o serviço real. O record mode
vai um passo além: enquanto o proxy está ativo, o StubLab grava todas as interações
(request + response real) em uma fila de revisão. O desenvolvedor então abre essa fila, revisa
cada interação, descarta o que não quer e confirma o que deve virar endpoint mockado.

Isso elimina o trabalho de cadastrar endpoints manualmente para sistemas já existentes — basta
fazer a aplicação navegar pelos fluxos desejados com record mode ativo e revisar o resultado.

---

## Pré-condição

Record mode só pode ser ativado se o workspace tiver proxy mode ativo e com URL base configurada.
Sem proxy, não há serviço real para gravar.

---

## User stories

**US-01 — Ativar record mode no workspace**
Como desenvolvedor,
quero ativar o record mode no workspace,
para que as requests proxiadas sejam gravadas para revisão posterior.

Critérios de aceitação:
- QUANDO acesso as configurações do workspace com proxy mode ativo
- ENTÃO vejo toggle "Record mode" (desativado por padrão)
- QUANDO ativo o record mode
- ENTÃO o workspace exibe badge "Gravando" em destaque (ex: vermelho) para indicar estado ativo
- SE proxy mode estiver inativo, o toggle de record mode está desabilitado com tooltip:
  "Ative o proxy mode primeiro"
- QUANDO desativo o record mode
- ENTÃO a gravação para — as interações já gravadas permanecem na fila para revisão

**US-02 — Gravar interações proxiadas automaticamente**
Como desenvolvedor,
quero que toda request encaminhada ao serviço real seja capturada automaticamente,
para não precisar me preocupar em instrumentar nada durante a navegação.

Critérios de aceitação:
- QUANDO record mode está ativo e uma request é proxiada
- ENTÃO a interação (request + response real) é salva na fila de gravações do workspace
- Interações duplicadas (mesmo method + path + response body) são agrupadas — não criar
  entradas redundantes na fila
- Requests que já possuem endpoint mockado correspondente NÃO são gravadas — mock tem
  prioridade e o proxy não é acionado nesses casos

**US-03 — Visualizar fila de gravações**
Como desenvolvedor,
quero ver todas as interações gravadas aguardando revisão,
para decidir o que virar mock.

Critérios de aceitação:
- QUANDO acesso a aba "Gravações" do workspace
- ENTÃO vejo lista de interações com: método (badge), path, status code da resposta real,
  timestamp da captura, tamanho do body
- Interações agrupadas (mesmo method + path) exibem badge com contagem: "3 capturas"
- Posso expandir uma interação para ver: request headers, request body, response headers,
  response body (com syntax highlight do JsonEditor da Spec 003)
- Posso filtrar por método, status code e path

**US-04 — Revisar e confirmar gravação como endpoint mockado**
Como desenvolvedor,
quero revisar uma interação gravada e salvá-la como endpoint mockado,
para ter controle sobre o que entra na minha base de mocks.

Critérios de aceitação:
- QUANDO clico em "Salvar como mock" em uma interação
- ENTÃO abro um formulário pré-preenchido com os dados da interação:
  - `name`: gerado automaticamente como `"{METHOD} {path}"` — editável
  - `method`: preenchido com o método da request gravada
  - `path`: preenchido com o path da request gravada
  - `responseStatus`: preenchido com o status da resposta real
  - `responseBody`: preenchido com o body da resposta real (via JsonEditor)
  - `responseHeaders`: preenchido com os headers da resposta real (filtrados — ver abaixo)
  - `delay`: preenchido com 0 — editável
- QUANDO confirmo
- ENTÃO o endpoint é criado no workspace e a interação some da fila
- SE já existe endpoint mockado para aquele method + path
- ENTÃO pergunto: "Já existe um mock para este endpoint. Deseja sobrescrever?"

**US-05 — Descartar gravações**
Como desenvolvedor,
quero descartar interações que não quero transformar em mock,
para manter a fila limpa e focada.

Critérios de aceitação:
- QUANDO clico em "Descartar" em uma interação individual
- ENTÃO a interação é removida da fila sem criar endpoint
- QUANDO seleciono múltiplas interações e clico em "Descartar selecionados"
- ENTÃO todas são removidas
- QUANDO clico em "Limpar tudo"
- ENTÃO confirmo antes de remover todas as interações da fila

**US-06 — Salvar múltiplas gravações de uma vez**
Como desenvolvedor,
quero selecionar várias interações e salvá-las como mocks de uma só vez,
para agilizar a criação em lote após uma sessão de navegação.

Critérios de aceitação:
- QUANDO seleciono múltiplas interações com checkbox
- ENTÃO o botão "Salvar selecionados como mocks (N)" fica disponível
- QUANDO confirmo
- ENTÃO todos são criados como endpoints com valores padrão (sem abrir formulário individual)
- Um resumo é exibido: "5 mocks criados, 1 ignorado (conflito)"
- Conflitos (method + path já mockado) são ignorados — não sobrescrevem sem confirmação explícita

**US-07 — Fila persiste entre sessões**
Como desenvolvedor,
quero que as gravações permaneçam disponíveis mesmo após fechar o browser,
para revisar com calma sem pressa.

Critérios de aceitação:
- As interações gravadas são persistidas no banco de dados
- QUANDO desativo o record mode e volto horas depois
- ENTÃO a fila ainda contém as interações capturadas anteriormente
- As interações só são removidas da fila por ação explícita do usuário (salvar ou descartar)

---

## Modelo de dados

```
RecordedInteraction
  id:               uuid
  workspaceId:      uuid (FK → Workspace)
  method:           string
  path:             string
  requestHeaders:   json
  requestBody:      string | null
  responseStatus:   number
  responseBody:     string | null
  responseHeaders:  json
  capturedAt:       timestamp
  groupKey:         string    — hash de (method + path + responseStatus + responseBody)
                               usado para agrupar interações duplicadas
  groupCount:       number    — quantas vezes essa interação foi capturada
```

```
Workspace (alteração)
  + recordEnabled: boolean   — default false
```

---

## Agrupamento de interações duplicadas

Interações com o mesmo `method + path + responseStatus + responseBody` são agrupadas:
- A primeira captura cria a entrada com `groupCount = 1`
- Capturas subsequentes incrementam `groupCount` e atualizam `capturedAt`
- A UI exibe o badge "N capturas" quando `groupCount > 1`

O agrupamento usa hash SHA-256 de `method + path + responseStatus + responseBody` como `groupKey`.

---

## Filtro de headers na gravação

Nem todos os headers da resposta real devem ser repassados para o mock. Headers que são
removidos automaticamente antes de salvar na fila:

| Header removido         | Motivo                                              |
|-------------------------|-----------------------------------------------------|
| `transfer-encoding`     | Específico do transporte HTTP                       |
| `connection`            | Específico da conexão TCP                           |
| `keep-alive`            | Específico da conexão                               |
| `x-stublab-proxied`     | Header interno do StubLab                           |
| `x-forwarded-*`         | Headers de proxy — não fazem sentido no mock        |

---

## Estados do workspace com record mode

```
proxy inativo
  └── record mode: indisponível (toggle desabilitado)

proxy ativo + record inativo
  └── requests proxiadas normalmente, sem gravação

proxy ativo + record ativo
  └── requests proxiadas + gravadas na fila
  └── badge "Gravando" visível no workspace
```

---

## O que está FORA do escopo desta spec

- Gravar automaticamente sem revisão (salvar direto como mock sem fila) — spec futura
- Editar interações na fila antes de salvar (ajustar body, status) — spec futura
  (por ora o formulário de confirmação da US-04 permite editar)
- Limite de interações na fila com limpeza automática — spec futura
- Exportar gravações (Spec 004 export se aplica aos mocks criados, não à fila)
- Replay de interações gravadas — spec futura
- Gravação de requests que já têm mock (atualmente ignoradas) — spec futura

---

## Impacto em features existentes

| Spec | Impacto |
|------|---------|
| Spec 003 — JSON editor | Usado no formulário de confirmação para exibir e editar o response body gravado |
| Spec 006 — Workspaces | Schema ganha `recordEnabled`; UI ganha toggle e aba "Gravações" |
| Spec 007 — Proxy mode | O hook de gravação é inserido no fluxo de proxy — após receber resposta do serviço real e antes de devolver ao cliente |
| Spec de histórico (futura) | Interações gravadas e o histórico são conceitos distintos — gravações são temporárias (fila de revisão), histórico é permanente (audit trail) |

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/008-record-mode/design.md` — ponto de inserção do hook de gravação no
   fluxo de proxy, estratégia de agrupamento (hash), schema da tabela, integração com a UI
   de workspaces
2. `.claude/specs/008-record-mode/tasks.md` — tarefas para @backend-dev, @frontend-dev e @tester
