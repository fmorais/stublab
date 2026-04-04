# StubLab

A self-hosted mock server with a web UI. Create and manage HTTP stubs without touching config files or restarting services.

![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)
![Node](https://img.shields.io/badge/Node.js-20%2B-green)
![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## What it does

StubLab lets your team define fake HTTP endpoints through a browser interface. Any request hitting `/mock/*` is matched against your active stubs and returns the configured response — including status code, headers, body, and optional delay.

No YAML files. No restarts. Changes take effect immediately.

---

## Features

### Endpoint management
- Create, edit, and delete HTTP stubs via a web UI
- Methods: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- Configure response status, JSON body, headers, and artificial delay (ms)
- Toggle endpoints active/inactive without deleting them

### Advanced matching (conditional responses)
- Attach matching rules to an endpoint so it only responds when conditions are met
- Rules can inspect **query params**, **request headers**, or **JSON body fields** (dot notation for nested fields)
- Operators: `eq`, `neq`, `contains`, `exists`, `not_exists`
- Multiple active stubs can share the same method + path — the one with the most satisfied rules wins
- Fallback: an endpoint with no rules always matches as a catch-all

### JSON editor
- `responseBody` field is a full code editor (CodeMirror 6) with JSON syntax highlighting
- Real-time validation — save button disabled while JSON is invalid
- One-click formatting (pretty-print with 2-space indent)
- Auto-growing height up to a configurable max

### Developer experience
- Path params supported (`/api/users/:id`)
- `delay` field to simulate slow APIs
- Custom response headers per endpoint
- 92 tests across API and UI

---

## Tech stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Backend  | Node.js 20 · Fastify 5 · Zod · Drizzle ORM     |
| Database | SQLite (dev/self-hosted) · Postgres (planned)   |
| Frontend | React 18 · Vite · Tailwind CSS · shadcn/ui      |
| Editor   | CodeMirror 6 (`@uiw/react-codemirror`)          |
| Tests    | Vitest · Supertest · Testing Library            |
| Language | TypeScript (strict) throughout                  |

---

## Getting started

### Prerequisites

- Node.js 20+
- pnpm 9+

### Install

```bash
git clone https://github.com/<your-username>/stublab.git
cd stublab
pnpm install
```

### Run in development

```bash
pnpm dev
```

This starts both servers in parallel:

| Service | URL                   |
|---------|-----------------------|
| API     | http://localhost:3000 |
| Web UI  | http://localhost:5173 |

The SQLite database is created automatically at `apps/api/stublab.db` on first run.

### Run the database migrations

```bash
cd apps/api
pnpm db:migrate
```

---

## Usage

### 1. Create a stub

Open http://localhost:5173, click **Novo endpoint**, and fill in:

| Field           | Example                       |
|-----------------|-------------------------------|
| Name            | `List users`                  |
| Method          | `GET`                         |
| Path            | `/api/users`                  |
| Response status | `200`                         |
| Response body   | `{"users": []}`               |
| Delay           | `0` (ms)                      |

Click **Salvar**. The stub is immediately active.

### 2. Call your stub

```bash
curl http://localhost:3000/mock/api/users
# → {"users":[]}
```

### 3. Add matching rules (conditional responses)

To return different responses for the same endpoint based on the request:

1. Open an endpoint and click **Adicionar regra**
2. Choose source (`query`, `header`, `body`), field name, operator, and value
3. Create a second endpoint with the same method + path but different rules and a different body

**Example:** return a filtered list when `?env=prod` is present

| Endpoint | Rules                         | Body                             |
|----------|-------------------------------|----------------------------------|
| GET /api/users | `query.env eq prod`   | `{"users": [{"id": 1}]}`         |
| GET /api/users | _(no rules — fallback)_ | `{"users": []}`                |

```bash
curl http://localhost:3000/mock/api/users?env=prod
# → {"users":[{"id":1}]}

curl http://localhost:3000/mock/api/users
# → {"users":[]}
```

The engine scores each candidate by how many rules it satisfies. The highest score wins. Ties are broken by creation date (most recent first).

### 4. Simulate slow responses

Set the **Delay** field to any number of milliseconds. The API will wait before responding — useful for testing loading states and timeouts.

```bash
curl http://localhost:3000/mock/api/slow-endpoint
# responds after N ms
```

---

## API reference

All admin endpoints are under `/api`. The mock server listens on `/mock/*`.

### Endpoints CRUD

| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| GET    | `/api/endpoints`        | List all endpoints       |
| POST   | `/api/endpoints`        | Create endpoint          |
| GET    | `/api/endpoints/:id`    | Get single endpoint      |
| PUT    | `/api/endpoints/:id`    | Update endpoint          |
| PATCH  | `/api/endpoints/:id/toggle` | Toggle active/inactive |
| DELETE | `/api/endpoints/:id`    | Delete endpoint          |

### Create endpoint — request body

```json
{
  "name": "List users",
  "method": "GET",
  "path": "/api/users",
  "responseStatus": 200,
  "responseBody": "{\"users\": []}",
  "responseHeaders": { "x-custom": "value" },
  "delay": 0,
  "matchingRules": [
    {
      "source": "query",
      "field": "env",
      "operator": "eq",
      "value": "prod"
    }
  ]
}
```

### Matching rule operators

| Operator     | Behavior                                     | `value` required |
|--------------|----------------------------------------------|------------------|
| `eq`         | Field equals value                           | Yes              |
| `neq`        | Field does not equal value (absent = passes) | Yes              |
| `contains`   | Field contains substring                     | Yes              |
| `exists`     | Field is present                             | No               |
| `not_exists` | Field is absent                              | No               |

Body fields support dot notation: `user.address.city`, `items.0.name`.

### Health check

```bash
curl http://localhost:3000/health
# → {"status":"ok"}
```

---

## Project structure

```
stublab/
├── apps/
│   ├── api/                  # Fastify backend
│   │   └── src/
│   │       ├── routes/       # Admin REST routes
│   │       ├── mock/         # Mock engine + rule evaluator
│   │       ├── services/     # Business logic
│   │       ├── db/           # Drizzle schema + migrations
│   │       └── schemas/      # Zod validation schemas
│   └── web/                  # React frontend
│       └── src/
│           ├── pages/        # Route-level components
│           ├── components/   # UI components
│           ├── hooks/        # API hooks (React Query)
│           └── lib/          # Utilities (isValidJson, etc.)
├── .claude/
│   └── specs/                # Feature specs (SDD)
└── CLAUDE.md                 # Project constitution for AI agents
```

---

## Development

### Run tests

```bash
pnpm test              # all workspaces
```

Or per workspace:

```bash
cd apps/api && pnpm test
cd apps/web && pnpm test
```

### Database

```bash
cd apps/api

pnpm db:generate    # generate migration from schema changes
pnpm db:migrate     # apply pending migrations
pnpm db:studio      # open Drizzle Studio (visual DB browser)
```

### Environment variables

| Variable      | Default                    | Description                  |
|---------------|----------------------------|------------------------------|
| `PORT`        | `3000`                     | API server port              |
| `CORS_ORIGIN` | `http://localhost:5173`    | Allowed origin for CORS      |
| `DATABASE_URL`| `./stublab.db`             | SQLite path or Postgres URL  |

Copy `.env.example` and adjust as needed:

```bash
cp apps/api/.env.example apps/api/.env
```

---

## Roadmap

- [ ] Request log — inspect incoming requests matched by the mock engine
- [ ] JSON schema-based autocomplete in the response body editor
- [ ] Import/export stubs as JSON
- [ ] Multi-tenant workspaces
- [ ] Docker image + `docker-compose.yml`
- [ ] Postgres support in production

---

## License

MIT — see [LICENSE](./LICENSE).
