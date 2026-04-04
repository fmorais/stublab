# Spec 004 — Import e Export de endpoints

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Depende de:** Spec 002 (matching avançado) — o formato exportado inclui regras de matching
**Criado em:** 2025-04

---

## Contexto

Times que usam o StubLab em múltiplos ambientes (DEV, QA, staging) precisam replicar as
configurações de endpoints sem recadastrá-las manualmente. Além disso, um desenvolvedor pode
querer compartilhar um conjunto de stubs com um colega ou versioná-los no repositório do projeto.

O Import/Export resolve isso ao permitir que toda a configuração de endpoints (incluindo regras
de matching da Spec 002) seja serializada em um arquivo JSON portável, e depois restaurada em
qualquer instância do StubLab.

---

## User stories

**US-01 — Exportar todos os endpoints**
Como desenvolvedor,
quero exportar todos os endpoints cadastrados para um arquivo JSON,
para fazer backup ou replicar a configuração em outro ambiente.

Critérios de aceitação:
- QUANDO clico em "Exportar tudo"
- ENTÃO o browser faz download de um arquivo `stublab-export-{YYYY-MM-DD}.json`
- E o arquivo contém todos os endpoints com suas regras de matching
- E o arquivo é um JSON válido e legível por humanos (indentado)
- Endpoints ativos e inativos são exportados — o estado `active` é preservado

**US-02 — Exportar endpoints selecionados**
Como desenvolvedor,
quero selecionar quais endpoints exportar,
para compartilhar apenas um subconjunto relevante com um colega.

Critérios de aceitação:
- QUANDO marco um ou mais endpoints na listagem com checkbox
- ENTÃO o botão "Exportar selecionados (N)" fica disponível
- E ao clicar, apenas os endpoints marcados são exportados
- O arquivo exportado segue o mesmo formato do export total

**US-03 — Importar endpoints de um arquivo**
Como desenvolvedor,
quero importar endpoints de um arquivo JSON previamente exportado,
para restaurar configurações ou aplicar stubs de um colega.

Critérios de aceitação:
- QUANDO seleciono um arquivo `.json` válido no formato StubLab
- ENTÃO vejo um preview com a lista de endpoints que serão importados
- E vejo quantos são novos e quantos já existem (por `method + path`)
- E escolho a estratégia de conflito antes de confirmar (ver US-04)
- QUANDO confirmo a importação
- ENTÃO os endpoints são criados/atualizados conforme a estratégia escolhida
- E recebo feedback: "X criados, Y atualizados, Z ignorados"

**US-04 — Estratégia de conflito na importação**
Como desenvolvedor,
quero controlar o que acontece quando um endpoint importado já existe,
para não sobrescrever configurações por acidente.

Critérios de aceitação:
- QUANDO o preview detecta conflitos (mesmo `method + path` já cadastrado)
- ENTÃO apresenta as três opções de estratégia:
  - **Ignorar existentes** — importa apenas os novos, pula os que já existem
  - **Sobrescrever existentes** — atualiza os que já existem com os dados do arquivo
  - **Importar como novos** — cria todos como novos endpoints, mesmo que resulte em duplicatas
- A estratégia escolhida se aplica a todos os conflitos — não há resolução individual por endpoint
- A opção padrão é **Ignorar existentes**

**US-05 — Validação do arquivo antes de importar**
Como desenvolvedor,
quero receber feedback claro quando o arquivo importado for inválido,
para entender o problema sem ter que inspecionar o JSON manualmente.

Critérios de aceitação:
- QUANDO o arquivo não é JSON válido
- ENTÃO exibo: "Arquivo inválido: não é um JSON válido"
- QUANDO o arquivo é JSON mas não segue o formato StubLab
- ENTÃO exibo: "Arquivo inválido: formato não reconhecido. Certifique-se de usar um arquivo exportado pelo StubLab"
- QUANDO o arquivo tem formato correto mas alguns endpoints têm campos inválidos
- ENTÃO exibo lista dos endpoints com problema e o motivo, e permito importar apenas os válidos

**US-06 — Compatibilidade com versões anteriores do formato**
Como desenvolvedor,
quero que arquivos exportados em versões antigas do StubLab sejam importados corretamente,
para não perder configurações ao atualizar a ferramenta.

Critérios de aceitação:
- O arquivo exportado sempre contém um campo `"version"` com a versão do formato
- QUANDO importo um arquivo de versão anterior
- ENTÃO os campos são migrados automaticamente para o formato atual
- QUANDO importo um arquivo de versão futura (mais nova que a instalação atual)
- ENTÃO exibo aviso: "Este arquivo foi exportado por uma versão mais recente do StubLab.
  Alguns campos podem ser ignorados." e prossigo com o que for compatível

---

## Formato do arquivo de export

```json
{
  "version": "1",
  "exportedAt": "2025-04-04T14:30:00Z",
  "exportedBy": "StubLab",
  "count": 2,
  "endpoints": [
    {
      "name": "Listar usuários",
      "method": "GET",
      "path": "/api/usuarios",
      "active": true,
      "responseStatus": 200,
      "responseBody": "{ \"usuarios\": [] }",
      "responseHeaders": {
        "Content-Type": "application/json"
      },
      "delay": 0,
      "matchingRules": [
        {
          "source": "query",
          "field": "status",
          "operator": "eq",
          "value": "ativo"
        }
      ]
    },
    {
      "name": "Criar usuário",
      "method": "POST",
      "path": "/api/usuarios",
      "active": true,
      "responseStatus": 201,
      "responseBody": "{ \"id\": \"uuid-gerado\" }",
      "responseHeaders": {},
      "delay": 200,
      "matchingRules": []
    }
  ]
}
```

### Campos omitidos intencionalmente no export

| Campo        | Motivo                                                       |
|--------------|--------------------------------------------------------------|
| `id`         | UUID é gerado novo na importação — IDs não são portáveis     |
| `createdAt`  | Não relevante para replicação de configuração                |
| `updatedAt`  | Idem                                                         |

---

## Regras de negócio

- IDs são sempre regenerados na importação — nunca reutilizar UUIDs do arquivo
- A detecção de conflito é por `method + path` — não por `name`
- Um endpoint sem `matchingRules` no arquivo é importado sem regras (campo opcional, default `[]`)
- Um endpoint sem `responseHeaders` no arquivo é importado com headers vazios (campo opcional, default `{}`)
- O campo `delay` é opcional no arquivo — default `0` se ausente
- O campo `active` é opcional no arquivo — default `true` se ausente
- Importação é atômica por estratégia: ou todos os válidos são criados/atualizados, ou nenhum
  (rollback em caso de erro no banco)

---

## UI — fluxo de importação

```
[botão "Importar"] → [seletor de arquivo] → [preview + escolha de estratégia] → [confirmar] → [resultado]
```

O preview deve mostrar uma tabela com:
- Método (badge colorido)
- Path
- Status: "Novo" (verde) | "Conflito" (amarelo) | "Inválido" (vermelho)
- Número de regras de matching

O resultado final mostra um toast ou banner:
- "Importação concluída: 5 criados, 2 atualizados, 1 ignorado"

---

## O que está FORA do escopo desta spec

- Import de coleções do Postman (spec futura — requer parser próprio)
- Import de specs OpenAPI/Swagger (spec futura)
- Export em formato CSV ou YAML (spec futura)
- Sincronização automática entre instâncias (spec futura)
- Histórico de importações realizadas (depende da Spec 005 — histórico)

---

## Impacto em features existentes

- **Spec 001:** listagem de endpoints ganha coluna de checkbox para seleção e botões de export
- **Spec 002:** o formato de export inclui `matchingRules` — o import precisa recriar as regras
- Nenhuma mudança no algoritmo de resolução de requests

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/004-import-export/design.md` — endpoints da API de import/export, lógica de
   detecção de conflito, estratégia de rollback, impacto na UI existente
2. `.claude/specs/004-import-export/tasks.md` — tarefas para @backend-dev, @frontend-dev e @tester
