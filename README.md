# NestJS Web Backend Service

A starter setup for a Node.js web backend service built with [NestJS](https://nestjs.com/) and [TypeScript](https://www.typescriptlang.org/).

## Features Included

- **NestJS 10 & TypeScript 5** modular architecture.
- **Environment Configuration** via `@nestjs/config` and `.env`.
- **Validation & Transformation** via `class-validator` and `class-transformer`.
- **CORS Support** pre-enabled.
- **Health Check Endpoint** at `/health`.
- **Testing Setup** with Jest (Unit tests & E2E tests).
- **Code Formatting & Linting** with Prettier and ESLint.

## Project Structure

```text
├── src/
│   ├── app.controller.spec.ts  # Controller unit tests
│   ├── app.controller.ts       # Sample / and /health endpoints
│   ├── app.module.ts           # Root application module
│   ├── app.service.ts          # Root service logic
│   └── main.ts                 # Application entry point
├── test/
│   ├── app.e2e-spec.ts         # End-to-end integration test
│   └── jest-e2e.json           # Jest E2E test configuration
├── .env                        # Local environment variables
├── .env.example                # Example environment variables template
├── .eslintrc.js                # ESLint configuration
├── .gitignore                  # Git ignore rules
├── .prettierrc                 # Prettier code formatting rules
├── nest-cli.json               # Nest CLI configuration
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler options
└── tsconfig.build.json         # TypeScript build options
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Review or copy the default environment configuration:

```bash
cp .env.example .env
```

### 3. Run the Service

```bash
# Development mode with hot-reload
npm run start:dev

# Production build and run
npm run build
npm run start:prod
```

Once running, the service is available at:
- Root: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

### 4. Running Tests

```bash
# Unit tests
npm run test

# End-to-end tests
npm run test:e2e

# Test coverage
npm run test:cov
```
