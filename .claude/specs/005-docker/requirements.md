# Spec 005 — Docker image e docker-compose

**Status:** aguardando design (@architect)
**Depende de:** Spec 001 (endpoints CRUD) — concluída
**Criado em:** 2025-04

---

## Contexto

O StubLab precisa ser trivial de rodar em qualquer ambiente — máquina de desenvolvedor, servidor
de DEV da empresa, pipeline de CI. O objetivo desta spec é que qualquer pessoa consiga subir o
StubLab com um único comando, sem precisar instalar Node.js, configurar banco ou entender a
estrutura interna do projeto.

O entregável é uma imagem Docker publicada no Docker Hub e um `docker-compose.yml` pronto para
uso, tanto para desenvolvimento local (SQLite) quanto para ambientes compartilhados (Postgres).

---

## User stories

**US-01 — Subir o StubLab com um único comando**
Como desenvolvedor,
quero subir o StubLab sem instalar nada além do Docker,
para começar a usar em minutos sem fricção.

Critérios de aceitação:
- QUANDO executo `docker compose up` na raiz do projeto
- ENTÃO a UI está acessível em `http://localhost:3000`
- E o mock server está acessível em `http://localhost:4000`
- E os dados são persistidos em volume Docker — não se perdem ao reiniciar o container
- QUANDO executo `docker compose down` e depois `docker compose up` novamente
- ENTÃO todos os endpoints cadastrados anteriormente ainda estão lá

**US-02 — Configuração via variáveis de ambiente**
Como administrador,
quero configurar o StubLab via variáveis de ambiente,
para adaptar o comportamento sem precisar modificar arquivos internos.

Critérios de aceitação:
- QUANDO defino `DATABASE_URL` com uma connection string Postgres
- ENTÃO o StubLab usa Postgres em vez de SQLite
- QUANDO defino `UI_PORT` e `MOCK_PORT`
- ENTÃO os serviços sobem nas portas configuradas em vez das padrão
- QUANDO defino `LOG_LEVEL` como `debug`, `info` ou `error`
- ENTÃO os logs respeitam o nível configurado
- Todas as variáveis têm valores padrão sensatos — nenhuma é obrigatória para uso básico

**US-03 — Imagem leve e segura**
Como time de infraestrutura,
quero que a imagem Docker seja enxuta e siga boas práticas de segurança,
para reduzir superfície de ataque e tempo de pull.

Critérios de aceitação:
- A imagem base é `node:20-alpine` — não usar imagens full Debian/Ubuntu
- O processo não roda como `root` — usar usuário não-privilegiado `node`
- A imagem final contém apenas artefatos de produção — sem devDependencies, sem código-fonte TypeScript
- Tamanho da imagem final: menor que 300MB
- Build multi-stage: estágio de build separado do estágio de runtime

**US-04 — docker-compose para desenvolvimento local (SQLite)**
Como desenvolvedor,
quero um `docker-compose.yml` pronto para uso local sem configuração adicional,
para subir o StubLab em desenvolvimento sem precisar de banco externo.

Critérios de aceitação:
- O `docker-compose.yml` na raiz do projeto usa SQLite por padrão
- Os dados SQLite são persistidos em volume nomeado `stublab_data`
- Não há dependência de serviços externos (sem container de banco separado)
- Um arquivo `.env.example` documenta todas as variáveis disponíveis

**US-05 — docker-compose para ambiente compartilhado (Postgres)**
Como time de DEV,
quero um compose alternativo que sobe o StubLab com Postgres,
para uso em servidor compartilhado onde múltiplos desenvolvedores acessam a mesma instância.

Critérios de aceitação:
- O arquivo `docker-compose.prod.yml` sobe StubLab + Postgres juntos
- O Postgres usa volume nomeado `stublab_pg_data` para persistência
- As credenciais do Postgres são configuráveis via `.env`
- O StubLab aguarda o Postgres estar pronto antes de iniciar (healthcheck)
- Comando: `docker compose -f docker-compose.prod.yml up`

**US-06 — Imagem publicada no Docker Hub**
Como desenvolvedor externo,
quero usar o StubLab sem clonar o repositório,
para rodar com um único `docker run` ou referenciando a imagem no compose.

Critérios de aceitação:
- A imagem está publicada em `docker.io/[usuario]/stublab`
- Tags disponíveis: `latest` (última versão estável) e versão semântica (`1.0.0`, `1.1.0`)
- O README do Docker Hub documenta as variáveis de ambiente e exemplos de uso
- A publicação é feita via GitHub Actions a cada push de tag `v*`

**US-07 — Health check do container**
Como time de infraestrutura,
quero que o container exponha um endpoint de health check,
para que orquestradores (Docker, Kubernetes) saibam se o serviço está saudável.

Critérios de aceitação:
- `GET /health` na porta da API retorna `200 { "status": "ok", "version": "x.y.z" }`
- O `docker-compose.yml` configura `healthcheck` apontando para esse endpoint
- O container só é marcado como `healthy` após o banco estar conectado e as migrations aplicadas

---

## Variáveis de ambiente

| Variável        | Padrão                        | Descrição                                     |
|-----------------|-------------------------------|-----------------------------------------------|
| `DATABASE_URL`  | `file:./data/stublab.db`      | SQLite (padrão) ou Postgres connection string |
| `UI_PORT`       | `3000`                        | Porta da interface web                        |
| `MOCK_PORT`     | `4000`                        | Porta do mock server                          |
| `LOG_LEVEL`     | `info`                        | Nível de log: `debug`, `info`, `error`        |
| `NODE_ENV`      | `production`                  | Ambiente Node.js                              |

---

## Estrutura de arquivos entregues

```
stublab/
├── Dockerfile                  # build multi-stage
├── docker-compose.yml          # SQLite, uso local
├── docker-compose.prod.yml     # Postgres, uso compartilhado
├── .env.example                # documentação das variáveis
└── .github/
    └── workflows/
        └── publish-docker.yml  # publica imagem ao tagear versão
```

---

## Dockerfile — estrutura esperada

```dockerfile
# Estágio 1: build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Estágio 2: runtime
FROM node:20-alpine AS runtime
WORKDIR /app
RUN addgroup -S stublab && adduser -S stublab -G stublab
COPY --from=builder --chown=stublab:stublab /app/dist ./dist
COPY --from=builder --chown=stublab:stublab /app/node_modules ./node_modules
USER stublab
EXPOSE 3000 4000
CMD ["node", "dist/server.js"]
```

---

## docker-compose.yml esperado (SQLite)

```yaml
services:
  stublab:
    image: stublab
    build: .
    ports:
      - "${UI_PORT:-3000}:3000"
      - "${MOCK_PORT:-4000}:4000"
    volumes:
      - stublab_data:/app/data
    environment:
      - DATABASE_URL=${DATABASE_URL:-file:/app/data/stublab.db}
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - NODE_ENV=production
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

volumes:
  stublab_data:
```

---

## GitHub Actions — publicação de imagem

O workflow `publish-docker.yml` deve:
1. Disparar em push de tag com padrão `v*` (ex: `v1.0.0`)
2. Fazer build da imagem
3. Publicar no Docker Hub com tags `latest` e a versão semântica
4. Usar secrets `DOCKERHUB_USERNAME` e `DOCKERHUB_TOKEN` configurados no repositório

---

## O que está FORA do escopo desta spec

- Helm chart para Kubernetes (spec futura)
- Suporte a ARM64 / Apple Silicon via multi-arch build (spec futura — mas desejável)
- TLS / HTTPS dentro do container (responsabilidade do reverse proxy externo)
- Autenticação na UI (spec futura)

---

## Impacto em features existentes

- **Todas as specs anteriores:** nenhuma mudança de comportamento — apenas empacotamento
- É necessário que o build de produção (`pnpm build`) esteja funcional antes desta spec
- As migrations do Drizzle precisam rodar automaticamente na inicialização do container

---

## Próximo passo

@architect deve ler esta spec e produzir:
1. `.claude/specs/005-docker/design.md` — decisões de build, estratégia de migrations no
   startup, estrutura do monorepo no contexto do Docker, pipeline de CI/CD
2. `.claude/specs/005-docker/tasks.md` — tarefas para @backend-dev e revisão de @code-reviewer
