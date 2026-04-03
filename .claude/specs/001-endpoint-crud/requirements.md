# Spec 001 — Cadastro e gerenciamento de endpoints

**Status:** aguardando design (@architect)
**Agente responsável pelo design:** @architect
**Criado em:** 2025-04

---

## Contexto

Esta é a feature central do MVP. Sem ela, o StubLab não tem utilidade.
Um "endpoint" é uma regra que diz: "quando chegar uma request com este método e path,
devolva este response."

O usuário precisa conseguir cadastrar, listar, editar, ativar/desativar e deletar endpoints
através de uma interface web.

---

## User stories

**US-01 — Cadastrar endpoint**
Como desenvolvedor,
quero cadastrar um endpoint mock com método, path e response configurados,
para que o servidor devolva esse response quando a request chegar.

Critérios de aceitação:
- QUANDO preencho método, path, status code e response body E clico em salvar
- ENTÃO o endpoint é criado e aparece na listagem
- E o servidor mock já responde àquele path imediatamente
- SE o path + método já existe e está ativo, ENTÃO recebo erro de conflito

**US-02 — Listar endpoints**
Como desenvolvedor,
quero ver todos os endpoints cadastrados em uma tabela,
para ter visão geral do que está mockado.

Critérios de aceitação:
- QUANDO acesso a página principal
- ENTÃO vejo tabela com: nome, método (badge colorido), path, status, ativo/inativo
- E posso buscar por nome ou path
- E posso filtrar por método HTTP

**US-03 — Ativar e desativar**
Como desenvolvedor,
quero ativar ou desativar um endpoint sem deletá-lo,
para simular serviços fora do ar sem perder a configuração.

Critérios de aceitação:
- QUANDO clico no toggle de ativo/inativo
- ENTÃO o estado muda imediatamente na UI (optimistic update)
- E o servidor mock para de responder àquele path se desativado
- E volta a responder se reativado

**US-04 — Editar endpoint**
Como desenvolvedor,
quero editar um endpoint existente,
para ajustar o response sem precisar deletar e recriar.

Critérios de aceitação:
- QUANDO acesso a edição e altero algum campo E salvo
- ENTÃO as mudanças entram em vigor imediatamente no servidor mock

**US-05 — Deletar endpoint**
Como desenvolvedor,
quero deletar endpoints que não preciso mais,
para manter a listagem limpa.

Critérios de aceitação:
- QUANDO clico em deletar
- ENTÃO vejo confirmação antes de executar
- E após confirmar, o endpoint some da lista e do servidor mock

---

## Campos do endpoint

| Campo           | Tipo            | Obrigatório | Validação                              |
|-----------------|-----------------|-------------|----------------------------------------|
| name            | string          | sim         | 1–100 caracteres                       |
| method          | enum            | sim         | GET, POST, PUT, PATCH, DELETE          |
| path            | string          | sim         | começa com `/`, ex: `/api/users/:id`   |
| responseStatus  | number          | sim         | 100–599                                |
| responseBody    | string (JSON)   | não         | default `{}`                           |
| responseHeaders | object          | não         | default `{}`                           |
| delay           | number (ms)     | não         | 0–30000, default 0                     |
| active          | boolean         | —           | default true ao criar                  |

---

## Regras de negócio

- Combinação `method + path` deve ser única entre endpoints **ativos**
- Dois endpoints inativos podem ter o mesmo `method + path`
- Um endpoint inativo com mesmo `method + path` de um ativo pode existir
- Path suporta parâmetros dinâmicos: `/users/:id`, `/orgs/:orgId/repos/:repo`
- Delay de 0ms significa resposta imediata (sem espera artificial)

---

## O que está FORA do escopo desta spec

- Matching por query params, headers ou body (spec futura)
- Cenários sequenciais / stateful mocking (spec futura)
- Histórico de requests recebidos (spec futura)
- Import/export de endpoints (spec futura)
- Autenticação de usuários (spec futura)

---

## Dependências

- Nenhuma feature anterior — esta é a primeira
- Requer estrutura base do projeto criada (package.json, Fastify, React, Drizzle configurados)

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `design.md` — arquitetura, schema, contratos de API
2. `tasks.md` — lista de tarefas atômicas para implementação
