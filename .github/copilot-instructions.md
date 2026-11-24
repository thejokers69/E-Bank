# Copilot Instructions for E‑Bank

## Big Picture

- Backend: Spring Boot REST API on port 8085; MySQL persistence; JWT resource server; Swagger UI via springdoc. See [E-bank-Backend/pom.xml](E-bank-Backend/pom.xml) and [E-bank-Backend/src/main/resources/application.properties](E-bank-Backend/src/main/resources/application.properties).
- Frontend: Angular 21 app served at 4200. Services call the backend via `environment.backendHost`. See [E-Bank-Frontend/src/environments/environment.ts](E-Bank-Frontend/src/environments/environment.ts).
- Feature areas: customers, accounts/operations, dashboard. Services under [E-Bank-Frontend/src/app/services](E-Bank-Frontend/src/app/services).

## Local Development

- Backend: `./mvnw spring-boot:run` (requires MySQL running; DB auto-creates). Default port 8085 from [application.properties](E-bank-Backend/src/main/resources/application.properties#L2).
- Frontend: `pnpm install` then `pnpm start` (or `ng serve`). Default port 4200 per Angular CLI config [E-Bank-Frontend/angular.json](E-Bank-Frontend/angular.json).
- Tests: Angular `pnpm test`; Backend `./mvnw test`.

## Authentication & Authorization

- Login endpoint: `POST /auth/login` returns JSON with key `access-token` (frontend expects this exact key). See token handling in [AuthService.loadProfile](E-Bank-Frontend/src/app/services/auth.service.ts#L19-L56).
- JWT contents: `sub` (username) and space‑separated `scope` roles (e.g., `ADMIN`). Roles are parsed in [auth.service.ts](E-Bank-Frontend/src/app/services/auth.service.ts).
- Token storage: localStorage key `jwt-token`. Auto-load on startup via [AuthService](E-Bank-Frontend/src/app/services/auth.service.ts).
- HTTP interceptor: Adds `Authorization: Bearer <token>` to all requests except `/auth/login`. On 401, calls `logout()`. See [app-http.interceptor.ts](E-Bank-Frontend/src/app/interceptors/app-http.interceptor.ts).
- Route guards: `AuthenticationGuard` ensures a token exists and optionally checks `route.data.role`. `AuthorizationGuard` grants only `ADMIN`. See [authentication.guard.ts](E-Bank-Frontend/src/app/guards/authentication.guard.ts) and [authorization.guard.ts](E-Bank-Frontend/src/app/guards/authorization.guard.ts).

## API Surface (from usage)

- Customers: `/customers`, `/customers/search?keyword=...`, `POST /customers`, `DELETE /customers/{id}` via [customer.service.ts](E-Bank-Frontend/src/app/services/customer.service.ts).
- Accounts: `/accounts/{id}/pageOperations`, `/accounts/debit`, `/accounts/credit`, `/accounts/transfer`, `/accounts/history` via [accounts.service.ts](E-Bank-Frontend/src/app/services/accounts.service.ts).
- Dashboard: `/dashboard/dataV1`, `/dashboard/dataV2` via [dashboard.service.ts](E-Bank-Frontend/src/app/services/dashboard.service.ts).

## Frontend Conventions

- Use `environment.backendHost` for all HTTP URLs. Ensure `environment.prod.ts` defines it for production builds (currently missing; add `backendHost` when preparing prod).
- Keep domain types under [src/app/model](E-Bank-Frontend/src/app/model). Example: `AccountDetails`, `Transaction`, `Customer`.
- Apply guards via route `data: { role: 'ADMIN' }` when admin‑only. Redirects: `/login` and `/admin/notAuthorized` are the canonical paths.
- UI dependencies: Bootstrap 5, Bootstrap Icons, Chart.js, ngx‑pagination, FileSaver, xlsx, jsPDF. Styles/scripts configured in [angular.json](E-Bank-Frontend/angular.json).

## Backend Notes

- Ports/DB/JWT configured in [application.properties](E-bank-Backend/src/main/resources/application.properties). Consider externalizing secrets for non‑dev.
- Spring Boot 3.4 + Resource Server; expect `Authorization: Bearer` headers from the interceptor.
- OpenAPI UI typically at `/swagger-ui/index.html` once the app is running.

## Gotchas

- Login response must include `access-token`; mismatched key breaks `AuthService.loadProfile()`.
- Production build replaces `environment.ts` with `environment.prod.ts`; ensure `backendHost` is defined there before deploying.
- Interceptor skips only URLs containing `/auth/login`; other auth endpoints must match or will get a bearer header.

## Examples

- Protect an admin route: set `data: { role: 'ADMIN' }` and add `AuthorizationGuard` to `canActivate`.
- Add a new API call: put the method in the relevant `*.service.ts` using `environment.backendHost`, rely on the interceptor for auth, and return typed `Observable<T>`.
- Handle 401 globally: prefer updating [app-http.interceptor.ts](E-Bank-Frontend/src/app/interceptors/app-http.interceptor.ts) rather than per‑call error handling.
