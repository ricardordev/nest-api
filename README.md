# NestJS REST API

A reference implementation of a REST API built with **NestJS**, featuring JWT authentication with refresh token rotation, Prisma ORM, Swagger documentation, rate limiting, and a DDD-layered architecture.

> [!IMPORTANT]
> **Disclaimer:** This is example code meant for learning and reference purposes. For production use, implement proper security measures, error handling, and environment-specific configurations as needed.
> 

---

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Framework:** NestJS (Express)
- **ORM:** Prisma (MySQL / MariaDB / PostgreSQL)
- **Auth:** Passport JWT + bcrypt + httpOnly cookies + refresh token rotation
- **Docs:** Swagger / OpenAPI
- **Validation:** class-validator + class-transformer (global pipes)
- **Testing:** Vitest (unit + e2e)
- **Rate Limiting:** @nestjs/throttler
- **Security:** helmet (HTTP security headers)

---

## Features

- **Dual-Mode JWT Authentication** — Login via email+password (front-end browsers) or login+password (API integrations), sessions managed through secure httpOnly cookies
- **Refresh Token Rotation** — Short-lived access tokens (15 min) + long-lived refresh tokens (7 days). Each refresh call rotates the token pair and detects replay attacks via family-based tracking.
- **Dual Client Support** — Tokens delivered both as httpOnly cookies (for front-end browsers) and in the response body (for API/integration clients)
- **Global Validation** — Automatic request validation with whitelist and DTO transformation
- **Global Exception Filter** — Centralized error handling with structured JSON responses and server‑side logging
- **Rate Limiting** — Per‑IP throttling (configurable via environment variables)
- **CORS Support** — Configurable allowed origins for frontend integration
- **Swagger Docs** — Interactive API documentation auto‑generated at `/docs`
- **DDD Architecture** — Layered domain structure in the Transactions module (application / domain / infrastructure)
- **Per-Resource Ownership Enforcement** — Authorized users can only access and modify their own resources; ownership validation is enforced at the service and repository layers for all CRUD operations
- **Full CRUD** — Create, Read, Update, Delete, List (with filters & pagination) for all resources
- **Pagination Metadata** — List endpoints return `page`, `perPage`, and `totalPages` alongside `items` and `total`

---

## API Endpoints

### Auth

| Method | Endpoint          | Auth | Description                                          |
|--------|-------------------|------|------------------------------------------------------|
| POST   | `/auth/login`     | No   | Authenticate via email+password (front-end) or login+password (API), returns access + refresh tokens |
| POST   | `/auth/refresh`   | No   | Rotate refresh token, returns new token pair (body or cookie) |
| POST   | `/auth/logout`    | JWT  | Revoke refresh token family and clear cookies         |
| GET    | `/auth/me`        | JWT  | Validate the current token/session                    |

### Transactions

*All transaction endpoints require a valid JWT (Bearer token or cookie). Resources are identified by a UUID hash.*

| Method | Endpoint                | Auth | Description                              |
|--------|-------------------------|------|------------------------------------------|
| POST   | `/transactions`         | JWT  | Create a new transaction                 |
| GET    | `/transactions`         | JWT  | List transactions (filters + pagination) |
| GET    | `/transactions/:hash`   | JWT  | Find a transaction by UUID hash          |
| PUT    | `/transactions/:hash`   | JWT  | Update a transaction by UUID hash        |
| DELETE | `/transactions/:hash`   | JWT  | Delete a transaction by UUID hash        |

### Single Data

*All single-data endpoints require a valid JWT. Resources are identified by an auto‑increment integer ID.*

| Method | Endpoint              | Auth | Description                            |
|--------|-----------------------|------|----------------------------------------|
| POST   | `/single-data`        | JWT  | Create a new single data entry         |
| GET    | `/single-data`        | JWT  | List entries (filters + pagination)    |
| GET    | `/single-data/:id`    | JWT  | Find an entry by ID                    |
| PUT    | `/single-data/:id`    | JWT  | Update an entry by ID                  |
| DELETE | `/single-data/:id`    | JWT  | Delete an entry by ID                  |

---

## Authentication Flow

### Login

The same endpoint supports two authentication modes — auto-detected based on which fields are provided:

**Front-end (browser) — email + password:**
```
POST /auth/login { email, password }
→ 200 { accessToken, refreshToken }
  + Set-Cookie: access_token  (httponly, 15min, path=/)
  + Set-Cookie: refresh_token (httponly, 7d, path=/auth/refresh)
```

**API / integration (service) — login + password:**
```
POST /auth/login { login, password }
→ 200 { accessToken, refreshToken }
  + Set-Cookie: access_token  (httponly, 15min, path=/)
  + Set-Cookie: refresh_token (httponly, 7d, path=/auth/refresh)
```

The `accessToken` is a short-lived JWT. The `refreshToken` is an opaque string (UUID-based) stored as a bcrypt hash in the database.

### Token Refresh

```
POST /auth/refresh { refreshToken }   ← from body (API clients)
POST /auth/refresh                    ← from refresh_token cookie (browsers)
→ 200 { accessToken, refreshToken }
  + Set-Cookie: access_token  (updated)
  + Set-Cookie: refresh_token (rotated)
```

Each refresh call:
1. Validates the refresh token hash against the database
2. Revokes the used token
3. Issues a new token pair with the same **family** ID
4. Detects replay attacks: if a revoked token from a family is reused, the entire family is revoked

### Logout

```
POST /auth/logout (Authorization: Bearer <accessToken>)
→ 200 { message: "Logged out successfully" }
  + Clear cookies
  + Revoke all refresh token families for the user in the database
```

---

## Database Schema

The data layer uses **Prisma ORM** with support for MySQL/MariaDB and PostgreSQL.

| Model          | Key Fields                                                    | Description                     |
|----------------|---------------------------------------------------------------|---------------------------------|
| `User`         | `id`, `email`, `login` (unique), `password` (hashed)          | Authenticated API users         |
| `RefreshToken` | `id`, `tokenHash` (unique), `lookupKey`, `userId`, `family`, `expiresAt`, `revokedAt` | Refresh token tracking with rotation family |
| `Transaction`  | `id`, `hash` (UUID), `amount`, `type` (credit/debit)          | Simulate transactions records   |
| `SingleData`   | `id`, `title`, `description`, `amount`, `type` (story/transaction) | Simulate generic data entries   |

**Enums:** `TransactionType` (`credit`, `debit`) · `SingleDataType` (`story`, `transaction`)

---

## Project Architecture

```
src/
├── main.ts                  # Application bootstrap & Swagger setup
├── app.module.ts            # Root module (config, throttle, prisma, modules)
├── common/
│   ├── decorators/          # @CurrentUser decorator
│   ├── filters/             # Global HTTP exception filter
│   ├── guards/              # ThrottlerBehindProxyGuard
│   ├── interceptors/        # Global response transform interceptor
│   └── utils/               # Shared utilities (duration parser)
├── infra/
│   └── prisma/              # Prisma module & database provider
├── generated/
│   └── prisma/              # Auto‑generated Prisma client
└── modules/
    ├── auth/                # JWT authentication + refresh token rotation (controller, service, strategies, guards)
    ├── transactions/        # DDD‑layered CRUD + use‑cases
    │   ├── application/     # DTOs & use‑case implementations
    │   ├── domain/          # Domain interfaces & types
    │   └── infrastructure/  # Repository implementations
    └── single-data/         # CRUD with service pattern
tests/                       # e2e tests
└── app.e2e-spec.ts          # e2e test for specific endpoints using vitest
```

---

## Environment Variables

Rename the `.env.example` and `.env.example.test`, populate it with the variables for your environment.

```env
# Database  (mysql, postgres)
DATABASE_TYPE=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
DATABASE_URL=

# Server
PORT=

# Security (comma‑separated frontend origins)
ALLOWED_ORIGINS=

# JWT
JWT_SECRET=
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_SECONDS=60

# Misc
BCRYPT_SALT_ROUNDS=10
DATABASE_CONNECTION_LIMIT=5
```

---

## Getting Started

```bash
# 1. Clone the repository
git clone https://github.com/ricardordev/nest-api && cd nest-api

# 2. Install dependencies
npm install

# 3. Configure your .env file (see section above)

# 4. Run database migrations
npx prisma migrate deploy

# 5. Start the development server
npm run start:dev
```

## Seeding a Test User

After running database migrations, you can create a test user for local development:

```bash
# Run the seed script
npx prisma db seed
```

Alternatively, create one manually via Prisma Studio:

```bash
npx prisma studio
```

**Test credentials:**

| Mode       | Field      | Value              |
|------------|------------|--------------------|
| Front-end  | email      | `test@example.com` |
| Front-end  | password   | `12345678`         |
| API        | login      | `test`             |
| API        | password   | `12345678`         |

> [!NOTE]
> Both modes use the same underlying bcrypt hash stored in the `password` column. The service auto-detects the mode based on which fields are provided (email+password for front-end, login+password for API).

> [!TIP]
> The e2e test suite (`test/app.e2e-spec.ts`) creates its own test user programmatically in `beforeAll` and cleans it up in `afterAll`. No pre-seeded data is required to run the tests.

---

## Running Tests

The project uses **Vitest** for both unit and end-to-end testing.

```bash
# Unit tests (specific files, not all)
npm run test

# End-to-end tests
npm run test:e2e

# Run tests with coverage
npm run test:cov
```

### Unit Test Coverage

| Test File | Tests | Description |
|-----------|-------|-------------|
| `auth.service.spec.ts` | 9 | Login (login+password, email+password), refresh token rotation, replay attack detection, logout |
| `single-data.service.spec.ts` | 8 | CRUD operations, ownership enforcement, empty update validation, pagination metadata |
| `transactions.controller.spec.ts` | 3 | Controller-level request/response mappings |
| `update-transaction.use-case.spec.ts` | 2 | Use-case business logic with mocked repository |
| `transaction.prisma.repository.spec.ts` | 6 | Database integration tests (requires test database) |

---

## Swagger / OpenAPI

Interactive API documentation is auto‑generated with **@nestjs/swagger** and available at:

```
http://localhost:3000/docs
```

---

ricardo albrecht — ricardoalbrecht1@gmail.com