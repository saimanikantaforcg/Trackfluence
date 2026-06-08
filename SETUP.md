Resume development (clone or ZIP)

This guide explains how to resume development on a new machine after cloning the repository or downloading the ZIP.

Prerequisites
- Git (recommended if cloning)
- Node.js (use the project's Node version)
- pnpm (Corepack or npm install)
- Docker & docker-compose (for Postgres + Redis)

Recommended: clone the repo

```bash
git clone https://github.com/saimanikantaforcg/Trackfluence.git
cd Trackfluence
```

If you downloaded a ZIP

```bash
unzip Trackfluence-main.zip -d Trackfluence
cd Trackfluence
# optionally re-init git to push later
git init
git remote add origin https://github.com/saimanikantaforcg/Trackfluence.git
```

Install pnpm (Corepack)

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

Install dependencies

```bash
pnpm install
```

Start local infra (Postgres + Redis)

```bash
docker compose up -d
# or
docker-compose up -d
```

Create environment variables

- At minimum, create a `.env` (repo root) with:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trackfluence?schema=public"
JWT_SECRET="a_long_random_secret_here"
```

Initialize the database

- If migrations exist (preferred):

```bash
pnpm --filter @trackfluence/database exec prisma migrate deploy
```

- If migrations are not present (fallback used in `apps/api/start.sh`):

```bash
pnpm --filter @trackfluence/database exec prisma db push --accept-data-loss
```

(Recommended: create migrations locally with `prisma migrate dev --name init` and commit them.)

Start development servers

```bash
pnpm dev
# OR run individually
pnpm --filter @trackfluence/api dev
pnpm --filter @trackfluence/web dev
```

Notes
- The API validates the presence of `DATABASE_URL` and `JWT_SECRET`.
- Add additional secrets (Stripe, Resend, third-party keys) as needed for specific features.
- For production, create & commit Prisma migrations and configure secrets in CI/CD or hosting provider.

See `README.md` for more project details.
