# Design — Spec 005: Docker image e docker-compose

**Status:** em revisao  
**Autor:** @architect  
**Data:** 2026-04-03  

---

## Resumo da solucao

Esta spec entrega a containerizacao do StubLab com:

1. Dockerfile multi-stage otimizado para monorepo pnpm
2. `docker-compose.yml` para uso local com SQLite
3. `docker-compose.prod.yml` como placeholder para Postgres (requer implementacao futura)
4. GitHub Actions workflow para publicacao no Docker Hub
5. Modificacoes minimas no codigo para suportar producao containerizada

---

## Decisoes arquiteturais

### Decisao 1: Porta unica vs portas separadas (UI_PORT / MOCK_PORT)

**Contexto:** A spec pede UI na porta 3000 e mock na porta 4000. Atualmente, o Fastify serve tudo em uma unica porta.

**Alternativas avaliadas:**

| Opcao | Descricao | Pros | Contras |
|-------|-----------|------|---------|
| A | Porta unica para tudo | Simples, sem mudancas no server.ts | Nao atende spec literalmente |
| B | Dois processos Node.js | Isolamento total, independencia | Complexidade no entrypoint, duplicacao de memoria |
| C | Um processo com dois listeners | Elegante, economiza memoria | Fastify nao suporta nativamente, requer refatoracao significativa |

**Decisao: Opcao A — porta unica para MVP**

Justificativa:
- A separacao de portas e um requisito de conveniencia, nao funcional
- Implementar agora adicionaria complexidade desnecessaria
- Mock e API/UI podem coexistir na mesma porta sem conflito (prefixo `/mock/*` vs `/api/*`)
- A spec pode ser evoluida em versao futura com opcao B se houver demanda real

**Impacto:** 
- `docker-compose.yml` expoe apenas uma porta (configuravel via `PORT`)
- Variaveis `UI_PORT` e `MOCK_PORT` nao serao implementadas nesta versao
- Documentar limitacao no `.env.example`

---

### Decisao 2: Servir frontend estatico

**Contexto:** O build do frontend (`apps/web/dist/`) precisa ser servido em producao.

**Alternativas avaliadas:**

| Opcao | Descricao | Pros | Contras |
|-------|-----------|------|---------|
| A | Nginx como reverse proxy | Otimizado para estaticos | Container adicional, complexidade |
| B | `@fastify/static` no backend | Container unico, simples | Pequeno overhead |
| C | CDN externa | Performance maxima | Fora do escopo, requer infra |

**Decisao: Opcao B — @fastify/static**

Justificativa:
- Mantem container unico, alinhado com a filosofia "um comando sobe tudo"
- Performance adequada para o caso de uso (times de DEV, ambientes nao-prod)
- Fallback SPA simples de implementar

**Impacto:**
- Adicionar `@fastify/static` como dependencia de runtime em `apps/api`
- Modificar `app.ts` para registrar plugin de arquivos estaticos
- Copiar `apps/web/dist/` para dentro do container

---

### Decisao 3: Estrategia de migrations na inicializacao

**Contexto:** `migrate.ts` precisa rodar antes do servidor iniciar.

**Alternativas avaliadas:**

| Opcao | Descricao | Pros | Contras |
|-------|-----------|------|---------|
| A | Compilar migrate.ts e rodar via entrypoint shell | Simples, robusto | Requer shell script |
| B | Executar migration dentro do server.ts | Sem script extra | Acopla migration ao servidor |
| C | Init container separado (Kubernetes pattern) | Isolamento | Complexidade, fora do escopo |

**Decisao: Opcao A — entrypoint shell script**

Justificativa:
- Separacao clara de responsabilidades
- Falha na migration impede o servidor de iniciar (fail-fast)
- Compativel com futuro Kubernetes (init container)

**Impacto:**
- Criar `docker-entrypoint.sh` que executa migration e depois `node dist/server.js`
- `migrate.ts` ja compila com `tsc` (esta em `src/`)

---

### Decisao 4: docker-compose.prod.yml e Postgres

**Contexto:** A spec pede compose com Postgres, mas o codigo atual so suporta SQLite (better-sqlite3).

**Decisao: Placeholder documentado**

Justificativa:
- Implementar driver Postgres esta fora do escopo desta spec
- O compose pode ser criado com a estrutura correta, mas marcado como nao funcional
- Evita que a spec fique bloqueada esperando implementacao de banco

**Impacto:**
- `docker-compose.prod.yml` criado com comentario claro sobre dependencia
- Criar issue/spec futura para suporte a Postgres no Drizzle

---

### Decisao 5: Localizacao do banco SQLite no container

**Contexto:** SQLite precisa de um arquivo em disco. Onde coloca-lo?

**Decisao: `/app/data/stublab.db`**

Justificativa:
- Diretorio dedicado facilita montagem de volume
- Caminho absoluto evita ambiguidade
- Permissoes podem ser definidas no Dockerfile

**Impacto:**
- `DATABASE_URL` padrao no container: `/app/data/stublab.db`
- Volume montado em `/app/data`
- Criar diretorio no Dockerfile com permissoes corretas

---

## Mudancas no schema do banco

Nenhuma. Esta spec nao altera o modelo de dados.

---

## Contratos de API

### GET /health (modificado)

Adicionar campo `version` ao response existente.

**Request:** nenhum body

**Response 200:**
```json
{
  "status": "ok",
  "version": "0.0.1"
}
```

**Origem da versao:** Ler `version` do `package.json` do `@stublab/api`.

---

## Estrutura de arquivos Docker

```
stublab/
├── Dockerfile
├── docker-entrypoint.sh
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
├── .env.example
└── .github/
    └── workflows/
        └── publish-docker.yml
```

---

## Dockerfile — especificacao detalhada

```dockerfile
# ============================================
# Estagio 1: Dependencias base
# ============================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ============================================
# Estagio 2: Build completo
# ============================================
FROM base AS builder

# Copiar arquivos de dependencias primeiro (cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY tsconfig.base.json ./

# Instalar todas as dependencias (incluindo devDeps para build)
RUN pnpm install --frozen-lockfile

# Copiar codigo fonte
COPY apps/api ./apps/api
COPY apps/web ./apps/web

# Build de ambos os apps
RUN pnpm --filter @stublab/api build
RUN pnpm --filter @stublab/web build

# ============================================
# Estagio 3: Dependencias de producao
# ============================================
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile --prod

# ============================================
# Estagio 4: Runtime
# ============================================
FROM node:20-alpine AS runtime
WORKDIR /app

# Criar usuario nao-root
RUN addgroup -S stublab && adduser -S stublab -G stublab

# Criar diretorio de dados
RUN mkdir -p /app/data && chown stublab:stublab /app/data

# Copiar node_modules de producao
COPY --from=prod-deps --chown=stublab:stublab /app/node_modules ./node_modules
COPY --from=prod-deps --chown=stublab:stublab /app/apps/api/node_modules ./apps/api/node_modules

# Copiar build do backend
COPY --from=builder --chown=stublab:stublab /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=stublab:stublab /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=builder --chown=stublab:stublab /app/apps/api/package.json ./apps/api/

# Copiar build do frontend para ser servido pelo backend
COPY --from=builder --chown=stublab:stublab /app/apps/web/dist ./apps/api/public

# Copiar entrypoint
COPY --chown=stublab:stublab docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER stublab

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/app/data/stublab.db

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
```

**Notas:**
- Usa corepack para pnpm (built-in no Node 20)
- Multi-stage reduz imagem final significativamente
- `better-sqlite3` sera compilado no estagio `prod-deps` para Alpine
- Migrations copiadas de `apps/api/drizzle/`

---

## docker-entrypoint.sh

```bash
#!/bin/sh
set -e

cd /app/apps/api

echo "Running database migrations..."
node dist/db/migrate.js

echo "Starting StubLab server..."
exec node dist/server.js
```

---

## docker-compose.yml (SQLite)

```yaml
services:
  stublab:
    image: stublab:local
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    volumes:
      - stublab_data:/app/data
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=/app/data/stublab.db
      - LOG_LEVEL=${LOG_LEVEL:-info}
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 10s
    restart: unless-stopped

volumes:
  stublab_data:
```

---

## docker-compose.prod.yml (Postgres — placeholder)

```yaml
# =============================================================================
# ATENCAO: Este arquivo requer suporte a Postgres no codigo do StubLab.
# Atualmente, apenas SQLite e suportado. Consulte a spec de suporte a Postgres.
# =============================================================================

services:
  stublab:
    image: stublab:local
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "${PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgres://stublab:stublab@postgres:5432/stublab
      - LOG_LEVEL=${LOG_LEVEL:-info}
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-stublab}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-stublab}
      - POSTGRES_DB=${POSTGRES_DB:-stublab}
    volumes:
      - stublab_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U stublab"]
      interval: 5s
      timeout: 3s
      retries: 5
    restart: unless-stopped

volumes:
  stublab_pg_data:
```

---

## .env.example

```bash
# StubLab - Variaveis de Ambiente
# Copie para .env e ajuste conforme necessario

# Porta do servidor (UI + API + Mock no mesmo endereco)
PORT=3000

# Caminho do banco SQLite (dentro do container: /app/data/stublab.db)
# Para Postgres (quando implementado): postgres://user:pass@host:5432/db
DATABASE_URL=/app/data/stublab.db

# Nivel de log: debug, info, warn, error
LOG_LEVEL=info

# Ambiente Node.js
NODE_ENV=production

# --- Postgres (apenas para docker-compose.prod.yml) ---
# POSTGRES_USER=stublab
# POSTGRES_PASSWORD=stublab
# POSTGRES_DB=stublab

# --- Nota sobre portas separadas ---
# UI_PORT e MOCK_PORT nao estao implementados nesta versao.
# Todo o trafego (UI, API, Mock) e servido na porta PORT.
```

---

## .dockerignore

```
# Dependencias
node_modules
**/node_modules

# Build outputs (serao gerados no container)
dist
**/dist

# Desenvolvimento
*.log
.env
.env.local

# Git
.git
.gitignore

# Especificacoes e docs
.claude
docs
*.md
!README.md

# Testes
coverage
**/*.test.ts
**/*.spec.ts
**/tests

# IDE
.vscode
.idea

# OS
.DS_Store
Thumbs.db
```

---

## GitHub Actions — publish-docker.yml

```yaml
name: Publish Docker Image

on:
  push:
    tags:
      - 'v*'

env:
  REGISTRY: docker.io
  IMAGE_NAME: ${{ secrets.DOCKERHUB_USERNAME }}/stublab

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Extract version from tag
        id: version
        run: echo "VERSION=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.IMAGE_NAME }}
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Modificacoes no codigo existente

### 1. apps/api/package.json

Adicionar dependencia:
```json
{
  "dependencies": {
    "@fastify/static": "^8.0.0"
  }
}
```

### 2. apps/api/src/app.ts

Registrar plugin de arquivos estaticos:

```typescript
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'

// Dentro de buildApp():
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

// Servir frontend estatico (apenas em producao)
if (process.env.NODE_ENV === 'production') {
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: '/',
    decorateReply: false,
  })
  
  // Fallback SPA: qualquer rota nao-API retorna index.html
  app.setNotFoundHandler((request, reply) => {
    if (!request.url.startsWith('/api/') && !request.url.startsWith('/mock/') && !request.url.startsWith('/health')) {
      return reply.sendFile('index.html')
    }
    return reply.status(404).send({ error: 'Not found', code: 'NOT_FOUND' })
  })
}
```

### 3. apps/api/src/app.ts — health route

Modificar para incluir versao:

```typescript
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pkg = require('../package.json')

app.get('/health', async () => ({
  status: 'ok',
  version: pkg.version,
}))
```

### 4. apps/api/src/db/migrate.ts

Ajustar caminho das migrations para funcionar apos build:

```typescript
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = path.join(__dirname, '..', '..', 'drizzle')

migrate(db, { migrationsFolder })
```

### 5. apps/api/tsconfig.json

Garantir que `resolveJsonModule` esta habilitado (ja esta no `tsconfig.base.json`).

---

## Diagrama de fluxo — Inicializacao do container

```mermaid
flowchart TD
    A[Container inicia] --> B[docker-entrypoint.sh]
    B --> C[cd /app/apps/api]
    C --> D[node dist/db/migrate.js]
    D --> E{Migration OK?}
    E -->|Sim| F[node dist/server.js]
    E -->|Nao| G[Exit 1 - Container falha]
    F --> H[Servidor escutando na PORT]
    H --> I[Healthcheck: GET /health]
    I --> J{200 OK?}
    J -->|Sim| K[Container healthy]
    J -->|Nao| L[Retry ate max retries]
```

---

## Riscos e mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|---------------|---------|-----------|
| `better-sqlite3` falha ao compilar no Alpine | Media | Alto | Usar `--build-from-source` se necessario; testar build localmente |
| Imagem excede 300MB | Baixa | Baixo | Multi-stage ja otimiza; usar `pnpm prune` se necessario |
| Frontend nao carrega por path errado | Media | Medio | Testar localmente com `docker compose up`; verificar caminhos |
| Postgres compose falha por falta de driver | Certa | N/A | Documentado como placeholder; nao e bug |

---

## O que NAO muda

- Schema do banco de dados
- Rotas existentes da API
- Logica do mock handler
- Estrutura de pastas do monorepo
- Fluxo de desenvolvimento local (pnpm dev continua funcionando)

---

## Dependencias bloqueantes

- **Suporte a Postgres:** `docker-compose.prod.yml` so sera funcional apos implementacao do driver Postgres no Drizzle (spec futura)

---

## Checklist de validacao

Apos implementacao, verificar:

- [ ] `docker build -t stublab:local .` completa sem erros
- [ ] `docker compose up` sobe o container
- [ ] `curl http://localhost:3000/health` retorna `{"status":"ok","version":"..."}`
- [ ] UI acessivel em `http://localhost:3000`
- [ ] Mock funciona em `http://localhost:3000/mock/*`
- [ ] Dados persistem apos `docker compose down && docker compose up`
- [ ] Imagem final < 300MB (`docker images stublab:local`)
- [ ] Container roda como usuario `stublab` (nao root)
