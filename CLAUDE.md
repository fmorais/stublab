# StubLab — CLAUDE.md

Você é o agente principal do projeto **StubLab**, uma ferramenta open source de mock server com
interface web. Leia este arquivo inteiro antes de qualquer ação. Ele é a constituição do projeto.

---

## Identidade do projeto

- **Nome:** StubLab
- **Objetivo:** Mock server com UI web centralizada para times de desenvolvimento
- **Licença:** MIT
- **Público:** Times de DEV usando ambientes não-produtivos; também projeto pessoal open source
- **Repositório:** github.com/[seu-usuario]/stublab

---

## Stack

| Camada     | Tecnologia                          |
|------------|-------------------------------------|
| Backend    | Node.js 20+ com Fastify             |
| Frontend   | React 18 + Tailwind CSS + shadcn/ui |
| Banco      | SQLite (dev) → Postgres (prod)      |
| ORM        | Drizzle ORM                         |
| Testes     | Vitest + Supertest                  |
| Deploy     | Docker + docker-compose             |
| Linguagem  | TypeScript em tudo                  |

---

## Estrutura de pastas

```
stublab/
├── apps/
│   ├── api/              # Fastify backend
│   │   ├── src/
│   │   │   ├── routes/   # rotas da admin API
│   │   │   ├── mock/     # engine de interceptação
│   │   │   ├── db/       # schema Drizzle + migrations
│   │   │   └── lib/      # utilitários
│   │   └── tests/
│   └── web/              # React frontend
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   └── hooks/
│       └── tests/
├── .claude/
│   ├── agents/           # subagentes especializados
│   └── specs/            # specs de features (SDD)
├── docs/                 # documentação pública
├── docker-compose.yml
└── CLAUDE.md             # este arquivo
```

---

## Convenções de código

### Geral
- TypeScript strict mode em todos os arquivos
- Sem `any` — use tipos explícitos ou `unknown`
- Imports absolutos a partir de `@api/` e `@web/`
- Arquivos em kebab-case: `endpoint-service.ts`
- Classes e tipos em PascalCase: `EndpointService`
- Funções e variáveis em camelCase: `findByPath`

### Backend (Fastify)
- Cada rota em arquivo próprio dentro de `routes/`
- Validação de input com Zod em todo endpoint
- Erros retornam `{ error: string, code: string }`
- Logs via `fastify.log` — nunca `console.log`
- Testes de integração com Supertest sobre instância real do Fastify

### Frontend (React)
- Componentes funcionais com hooks — sem class components
- Estado local com `useState`, estado global com Zustand
- Chamadas à API centralizadas em `hooks/use-*.ts`
- Tailwind para estilos — sem CSS modules ou styled-components
- shadcn/ui para componentes base (button, input, table, dialog)

### Banco de dados
- Schema definido em `apps/api/src/db/schema.ts`
- Migrations geradas pelo Drizzle Kit — nunca editar SQL manualmente
- IDs: UUID v4 gerado no backend
- Timestamps: `createdAt` e `updatedAt` em toda tabela

---

## Modelo de domínio (núcleo)

```
Endpoint
  id: uuid
  name: string           # nome amigável ex: "Listar usuários"
  method: GET|POST|PUT|PATCH|DELETE
  path: string           # ex: /api/users/:id
  active: boolean
  responseStatus: number
  responseBody: string   # JSON como string
  responseHeaders: json
  delay: number          # ms, default 0
  createdAt: timestamp
  updatedAt: timestamp

RequestLog
  id: uuid
  endpointId: uuid | null
  method: string
  path: string
  requestHeaders: json
  requestBody: string
  matchedAt: timestamp
```

---

## Regras de qualidade

- Cobertura mínima de testes: **80%** nas camadas de serviço e rotas
- Todo PR deve ter testes para o caminho feliz e pelo menos um caso de erro
- Sem comentários explicando o que o código faz — o código deve ser autoexplicativo
- Comentários permitidos apenas para decisões de arquitetura não óbvias (`// Por que:`)
- Nenhum `TODO` sem issue associada

---

## Workflow SDD

Toda feature segue este ciclo antes de qualquer código:

```
.claude/specs/{NNN}-{nome}/
  requirements.md   # o que e por que (você escreve)
  design.md         # como — gerado pelo @architect, validado por você
  tasks.md          # lista de tarefas — gerado pelo @architect
```

**Nunca iniciar implementação sem `tasks.md` aprovado.**

---

## Agentes disponíveis

| Agente         | Quando usar                                      |
|----------------|--------------------------------------------------|
| @architect     | design, impacto arquitetural, tasks.md           |
| @backend-dev   | implementação de rotas, serviços, banco          |
| @frontend-dev  | implementação de componentes React, páginas      |
| @tester        | criação e execução de testes                     |
| @code-reviewer | revisão de qualidade antes do merge              |

---

## Comandos frequentes

```bash
# Dev
pnpm dev              # sobe api + web em modo watch
pnpm test             # roda todos os testes
pnpm test:watch       # testes em modo watch

# Banco
pnpm db:generate      # gera migration a partir do schema
pnpm db:migrate       # aplica migrations pendentes
pnpm db:studio        # abre Drizzle Studio

# Build e deploy
docker compose up     # sobe tudo com SQLite
docker compose -f docker-compose.prod.yml up  # com Postgres
```

---

## O que NÃO fazer

- Não instalar dependências sem justificativa no PR
- Não alterar o schema do banco sem migration
- Não usar `fetch` diretamente no frontend — usar hooks customizados
- Não commitar `.env` ou credenciais
- Não criar arquivos fora da estrutura definida acima sem discussão
