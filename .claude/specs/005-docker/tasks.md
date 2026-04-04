# Tasks — Spec 005: Docker image e docker-compose

**Spec:** 005-docker  
**Design:** aprovado  
**Data:** 2026-04-03  

---

## Pre-requisitos

- [ ] Node.js 20+ instalado localmente para testes
- [ ] Docker Desktop instalado e funcionando
- [ ] pnpm 9+ instalado

---

## Fase 1: Preparacao do codigo

### Backend — Dependencias e configuracao

- [ ] **T01** [S] @backend-dev — Adicionar `@fastify/static` como dependencia
  - Arquivo: `apps/api/package.json`
  - Adicionar: `"@fastify/static": "^8.0.0"` em dependencies
  - Executar: `pnpm install`
  - Criterio: `pnpm ls @fastify/static` mostra a dependencia instalada

- [ ] **T02** [M] @backend-dev — Modificar `app.ts` para servir frontend estatico em producao
  - Arquivo: `apps/api/src/app.ts`
  - Importar `@fastify/static`, `path`, `fileURLToPath`
  - Registrar plugin apontando para `../public` quando `NODE_ENV=production`
  - Implementar `setNotFoundHandler` com fallback SPA para rotas que nao sao `/api/*`, `/mock/*`, `/health`
  - Criterio: build completa sem erros; em producao, arquivos de `public/` sao servidos na raiz

- [ ] **T03** [S] @backend-dev — Atualizar rota `/health` para incluir versao
  - Arquivo: `apps/api/src/app.ts`
  - Importar `package.json` via `createRequire`
  - Retornar `{ status: 'ok', version: pkg.version }`
  - Criterio: `GET /health` retorna JSON com campo `version` igual ao do package.json

- [ ] **T04** [S] @backend-dev — Ajustar `migrate.ts` para usar caminhos absolutos
  - Arquivo: `apps/api/src/db/migrate.ts`
  - Usar `fileURLToPath` e `path.join` para resolver `migrationsFolder` relativo ao arquivo compilado
  - Criterio: `node dist/db/migrate.js` executa migrations corretamente a partir de `apps/api/`

- [ ] **T05** [S] @backend-dev — Verificar build do backend
  - Executar: `cd apps/api && pnpm build`
  - Verificar que `dist/` contem `server.js`, `app.js`, `db/migrate.js`
  - Criterio: build completa sem erros TypeScript

---

## Fase 2: Arquivos Docker

- [ ] **T06** [M] @backend-dev — Criar `Dockerfile` multi-stage
  - Arquivo: `Dockerfile` (raiz do projeto)
  - Seguir especificacao do design.md:
    - Estagio `base`: node:20-alpine com corepack/pnpm
    - Estagio `builder`: instala deps, copia fonte, executa build
    - Estagio `prod-deps`: instala apenas deps de producao
    - Estagio `runtime`: copia artefatos, cria usuario `stublab`, configura entrypoint
  - Criterio: `docker build -t stublab:local .` completa sem erros

- [ ] **T07** [S] @backend-dev — Criar `docker-entrypoint.sh`
  - Arquivo: `docker-entrypoint.sh` (raiz do projeto)
  - Conteudo: executa migrations e depois `node dist/server.js`
  - Usar `set -e` para falhar em qualquer erro
  - Criterio: arquivo executavel (linha `#!/bin/sh`), script funciona isoladamente

- [ ] **T08** [S] @backend-dev — Criar `.dockerignore`
  - Arquivo: `.dockerignore` (raiz do projeto)
  - Ignorar: `node_modules`, `dist`, `.git`, `.env`, `*.md` (exceto README), testes, IDEs
  - Criterio: arquivo existe e build nao copia arquivos desnecessarios

---

## Fase 3: Docker Compose

- [ ] **T09** [S] @backend-dev — Criar `docker-compose.yml` para SQLite
  - Arquivo: `docker-compose.yml` (raiz do projeto)
  - Servico `stublab` com build local, porta configuravel, volume `stublab_data`
  - Healthcheck apontando para `/health`
  - Variaveis de ambiente com defaults
  - Criterio: `docker compose up` sobe container; dados persistem apos restart

- [ ] **T10** [S] @backend-dev — Criar `docker-compose.prod.yml` placeholder para Postgres
  - Arquivo: `docker-compose.prod.yml` (raiz do projeto)
  - Comentario no topo explicando que requer suporte a Postgres (nao implementado)
  - Servicos `stublab` e `postgres` com depends_on/healthcheck
  - Volume `stublab_pg_data` para Postgres
  - Criterio: arquivo existe com estrutura valida YAML; comentario de aviso presente

- [ ] **T11** [S] @backend-dev — Criar `.env.example`
  - Arquivo: `.env.example` (raiz do projeto)
  - Documentar todas as variaveis: `PORT`, `DATABASE_URL`, `LOG_LEVEL`, `NODE_ENV`
  - Incluir nota sobre `UI_PORT`/`MOCK_PORT` nao implementados
  - Variaveis Postgres comentadas
  - Criterio: arquivo existe e e auto-explicativo

---

## Fase 4: CI/CD

- [ ] **T12** [M] @backend-dev — Criar workflow GitHub Actions para publicacao
  - Arquivo: `.github/workflows/publish-docker.yml`
  - Trigger: push de tags `v*`
  - Steps: checkout, setup buildx, login Docker Hub, build+push
  - Tags: semver + latest
  - Usar secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN`
  - Criterio: workflow valido (verificar com `act` ou push de tag de teste)

- [ ] **T13** [S] @backend-dev — Criar diretorio `.github/workflows` se nao existir
  - Verificar/criar estrutura de diretorios
  - Criterio: diretorio existe

---

## Fase 5: Validacao

- [ ] **T14** [M] @backend-dev — Teste de build completo
  - Executar: `docker build -t stublab:local .`
  - Verificar: build completa em < 5 minutos
  - Verificar: imagem final < 300MB (`docker images stublab:local`)
  - Criterio: build bem-sucedido, tamanho adequado

- [ ] **T15** [M] @backend-dev — Teste de docker-compose up
  - Executar: `docker compose up -d`
  - Verificar: `curl http://localhost:3000/health` retorna 200
  - Verificar: UI carrega em `http://localhost:3000`
  - Verificar: criar endpoint via UI, reiniciar container, endpoint ainda existe
  - Criterio: todos os checks passam

- [ ] **T16** [S] @backend-dev — Verificar que container nao roda como root
  - Executar: `docker compose exec stublab whoami`
  - Criterio: output e `stublab`, nao `root`

---

## Fase 6: Documentacao

- [ ] **T17** [S] @backend-dev — Atualizar README.md com instrucoes Docker
  - Adicionar secao "Quick Start with Docker"
  - Comandos: `docker compose up`, variaveis de ambiente
  - Mencionar que `docker-compose.prod.yml` requer Postgres (futuro)
  - Criterio: README contem instrucoes claras para uso via Docker

---

## Fase 7: Revisao

- [ ] **T18** [M] @code-reviewer — Revisao de todos os arquivos Docker
  - Verificar: Dockerfile segue boas praticas (nao root, multi-stage, .dockerignore)
  - Verificar: docker-compose.yml funcional
  - Verificar: variaveis de ambiente documentadas
  - Verificar: modificacoes em app.ts nao quebram testes existentes
  - Criterio: aprovacao do reviewer

---

## Resumo de estimativas

| Tamanho | Contagem | Tempo total estimado |
|---------|----------|----------------------|
| S (~1h) | 11 | ~11h |
| M (~2h) | 6 | ~12h |
| L (~4h) | 0 | 0h |
| **Total** | **17** | **~23h** |

---

## Ordem de execucao sugerida

```
T01 -> T02 -> T03 -> T04 -> T05 (deps e codigo)
         |
         v
T13 -> T06 -> T07 -> T08 (Dockerfile)
         |
         v
T09 -> T10 -> T11 (Compose)
         |
         v
T12 (CI/CD)
         |
         v
T14 -> T15 -> T16 (Validacao)
         |
         v
T17 (Docs)
         |
         v
T18 (Revisao)
```

---

## Dependencias entre tarefas

- T02 depende de T01 (@fastify/static deve estar instalado)
- T06 depende de T05 (build deve funcionar antes de dockerizar)
- T07 deve existir antes de T06 (Dockerfile copia o entrypoint)
- T09, T10 dependem de T06 (Dockerfile deve existir para build)
- T14, T15, T16 dependem de T09 (compose deve existir)
- T18 depende de todas as outras (revisao final)

---

## Notas importantes

1. **Postgres nao funcional:** T10 cria um placeholder. O compose com Postgres so funcionara apos spec de suporte a Postgres.

2. **UI_PORT/MOCK_PORT:** Conforme decisao arquitetural, estas variaveis nao serao implementadas nesta versao. Documentar em `.env.example`.

3. **Testes automatizados:** Esta spec nao inclui testes automatizados para Docker. Validacao e manual via T14-T16.

4. **Secrets do GitHub:** Antes de T12 funcionar, sera necessario configurar `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` nos secrets do repositorio.
