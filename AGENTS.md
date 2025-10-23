# Repository Guidelines

## Project Structure & Module Organization
- `app/` houses App Router routes, layout wrappers, and loaders; keep server components close to their entry points.
- Feature UI lives under `components/`; pair domain-specific hooks or helpers with each folder to preserve clear boundaries.
- `services/` and `state/` contain API access and Redux Toolkit slices; expose clients and selectors via module indexes.
- Shared config lives in `lib/`, `middleware.ts`, and `types/`; Amplify IaC stays in `amplify/`, generated clients in `src/`.
- `tests/` mirrors the feature tree for integration coverage; product specs sit in `docs/` and `PRD.md`.

## Build, Test, and Development Commands
- `npm run dev` starts the Next.js dev server and streams output to `dev.log`; tail it when diagnosing SSR issues.
- `npm run build` compiles the production bundle and runs type checks; `npm run start` serves the result.
- `npm run lint` executes `next lint` with shared ESLint and Tailwind rules; pass `--fix` to auto-format.
- `npm run test:quiz-config` runs `tsx --test` against `tests/api/quiz/quizConfig.test.ts`; mirror this pattern for future suites.
- `npm run amplify:generate` refreshes GraphQL clients in `src/graphql/`, and `npm run amplify:deploy` pushes backend updates through `ampx sandbox`.

## Coding Style & Naming Conventions
- Write TypeScript/React with 2-space indentation and trailing commas; run Prettier (Tailwind plugin included) or `npm run lint -- --fix`.
- Use PascalCase for components (`components/Header/UserMenu.tsx`), camelCase for utilities, and uppercase constants only in config modules.
- Prefer functional components with explicit prop types and Tailwind utilities kept in Prettier order; route-level CSS stays in `app/globals.css`.

## Testing Guidelines
- Place unit and integration specs under `tests/`, mirroring the feature path (e.g., `tests/messages/...`) for easy discovery.
- Name files `*.test.ts` or `*.test.tsx`, mock services via `services/__mocks__/`, and assert against Amplify schemas.
- Keep `npm run test:quiz-config` green and log new test scripts here as they arrive.

## Commit & Pull Request Guidelines
- Follow the conventional pattern in history (`feat(quiz): ...`, `refactor(logger): ...`) to surface scope and intent.
- Keep commits focused, reference issue IDs when available, and note test evidence before review.
- PRs should summarize changes, attach UI screenshots when visuals shift, and call out `amplify/` or `.env` edits while tagging feature owners.

## Security & Configuration Tips
- Load secrets through `.env.local` (never commit them); mirror AWS values with the Amplify CLI rather than manual edits.
- Rotate Firebase service-account keys via the console and sanitize `dev.log` before sharing.
