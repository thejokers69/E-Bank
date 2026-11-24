# Deploy E-bank-Backend on Render (with Render MCP)

Appwrite Sites hosts the Angular frontend only. The Spring Boot API runs on Render (JVM 21 + MySQL).

**Workspace (MCP):** `Joker69-Studio` (`tea-d4i98igdl3ps73a7actg`)

**Service created via MCP:**

| Field | Value |
| -------- | -------- |
| Service ID | `srv-dc2v98lg1s2s73ba78ng` |
| URL | <https://e-bank-backend-psvn.onrender.com> |
| Dashboard | <https://dashboard.render.com/web/srv-dc2v98lg1s2s73ba78ng> |
| Region | frankfurt |
| Runtime | docker (`E-bank-Backend/Dockerfile`) |

First deploy will fail until you **push** the Dockerfile + env-aware config to `master`, then set real MySQL env vars and redeploy.

---

## Why this shape

| Piece | Where |
| -------- | -------- |
| Angular SPA | Appwrite Sites |
| Spring Boot API | Render Web Service (Docker, JDK 21) |
| MySQL | **External** — Render managed DB is Postgres only |

Do not use JDK 25 on the build image (Lombok breaks). The Dockerfile pins **Eclipse Temurin 21**.

---

## 0. Prerequisites

1. GitHub repo connected to Render: `https://github.com/thejokers69/E-Bank`
2. Render MCP enabled in Cursor (`plugin-render-render` / Render account)
3. A reachable MySQL instance (local tunnel is not enough — use Aiven free, Railway, DO Managed MySQL, etc.)
4. Your Appwrite Sites public URL (for CORS), e.g. `https://<site>.appwrite.network`

Repo prep already in this tree:

- `E-bank-Backend/Dockerfile` — multi-stage JDK 21 build
- `E-bank-Backend` reads `PORT`, `SPRING_DATASOURCE_*`, `JWT_SECRET`, `APP_CORS_ORIGINS`
- `GET /health` — unauthenticated (Render health checks)
- Root `render.yaml` Blueprint

Push these files before the first successful deploy:

```bash
git add E-bank-Backend/Dockerfile E-bank-Backend/.dockerignore \
  E-bank-Backend/src E-bank-Backend/pom.xml E-bank-Backend/src/main/resources/application.properties \
  render.yaml docs/RENDER-BACKEND.md
git commit -m "Add Render Docker deploy for Spring Boot backend"
git push origin master
```

---

## 1. MCP: select workspace

```text
list_workspaces
select_workspace  ownerID=tea-d4i98igdl3ps73a7actg
```

Confirm with `get_selected_workspace`.

---

## 2. Option A — Direct create (MCP `create_web_service`)

Best for a single API service. Create after the Dockerfile is on `master`.

```text
create_web_service
  name: e-bank-backend
  runtime: docker
  repo: https://github.com/thejokers69/E-Bank
  branch: master
  plan: free
  region: frankfurt
  dockerfilePath: ./E-bank-Backend/Dockerfile
  dockerContext: ./E-bank-Backend
  autoDeploy: yes
  workspaceId: tea-d4i98igdl3ps73a7actg
  envVars:
    - SPRING_DATASOURCE_URL = jdbc:mysql://HOST:3306/E_BANK?sslMode=REQUIRED
    - SPRING_DATASOURCE_USERNAME = ...
    - SPRING_DATASOURCE_PASSWORD = ...
    - JWT_SECRET = <long random string, 32+ chars>
    - SPRING_JPA_HIBERNATE_DDL_AUTO = update
    - SPRING_JPA_SHOW_SQL = false
    - APP_CORS_ORIGINS = https://YOUR-APPWRITE-SITE.appwrite.network
```

Then:

```text
list_services          # note service id + https://….onrender.com
get_service            # details
list_deploys / get_deploy / list_logs   # if build fails
```

Update secrets later without recreating the service:

```text
update_environment_variables  serviceId=srv-…
```

Manual redeploy:

```text
trigger_deploy  serviceId=srv-…
```

---

## 3. Option B — Blueprint (MCP `create_blueprint`)

Use when you want IaC from `render.yaml`.

1. Push `render.yaml` to `master`.
2. Call:

```text
create_blueprint
  repoUrl: https://github.com/thejokers69/E-Bank
  branch: master
  # path defaults to render.yaml
```

1. Review `planningOutcome` / notices.
2. Fill Blueprint `sync: false` env vars in the Dashboard (DB URL, CORS, etc.).
3. Call `approve_blueprint` only after you accept the plan.

Later edits: push YAML → `plan_blueprint` → review → `approve_blueprint`.

---

## 4. Environment checklist

| Variable | Purpose |
| ---------- | --------- |
| `PORT` | Injected by Render — do not set manually |
| `SPRING_DATASOURCE_URL` | `jdbc:mysql://…` |
| `SPRING_DATASOURCE_USERNAME` | DB user |
| `SPRING_DATASOURCE_PASSWORD` | DB password |
| `JWT_SECRET` | HS512 signing key (strong random) |
| `APP_CORS_ORIGINS` | Appwrite Sites URL (comma-separated if several) |
| `SPRING_JPA_HIBERNATE_DDL_AUTO` | `update` for first boot; tighten later |

Binding: `server.address=0.0.0.0` and `server.port=${PORT:8085}` are already set.

Free web services **spin down after ~15 minutes** idle; first request after sleep can take ~30–60s.

---

## 5. Wire the Appwrite Site

After deploy, copy the public URL (e.g. `https://e-bank-backend-xxxx.onrender.com`).

Update `E-Bank-Frontend/src/environments/environment.prod.ts`:

```ts
backendHost: 'https://e-bank-backend-xxxx.onrender.com',
```

Redeploy the Appwrite Site. Confirm `APP_CORS_ORIGINS` matches that Site origin exactly (scheme + host, no trailing slash).

---

## 6. Verify

```bash
curl -s https://YOUR-SERVICE.onrender.com/health
# {"status":"UP"}

curl -s -X POST https://YOUR-SERVICE.onrender.com/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"…","password":"…"}'
```

MCP: `list_logs` / `get_metrics` on the service id if login or JPA fails.

---

## 7. Common failures

| Symptom | Fix |
| --------- | ----- |
| Build uses wrong Java / Lombok errors | Confirm Dockerfile `eclipse-temurin:21` |
| App listens but Render unhealthy | Ensure `/health` is public and `PORT` is used |
| `Communications link failure` | MySQL must allow Render egress IPs / public access; URL host must be reachable from the internet |
| CORS blocked in browser | Set `APP_CORS_ORIGINS` to the exact Appwrite Sites origin |
| Frontend still hits localhost | Update `environment.prod.ts` and redeploy the Site |

---

## 8. Postgres note

`create_postgres` on Render provisions **PostgreSQL**, not MySQL. This app ships with `mysql-connector-j` + `MySQLDialect`. Prefer external MySQL unless you intentionally migrate the datasource and dialect.
