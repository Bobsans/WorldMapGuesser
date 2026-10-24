# Frontend development

Frontend source lives in `web/src`, its configuration and npm package in `web`, and the Go backend in `server`. The frontend is a standalone Vite project with a regular `index.html` and no server templates. See the [code style guide](code-style.md) and [backend guide](backend-development.md).

`src/api` contains the network client, `src/game` the game state and rules, `src/map` the viewport geometry, and `src/utils` shuffling and time formatting. Vue components live in `src/components`, shared Sass styles in `src/styles`, and data and images in `src/assets`. `src/types.ts` holds shared models. Local `.gitignore` and `.editorconfig` files in `web` extend the root rules.

The frontend uses Vue 3, TypeScript, Vite, and Sass (SCSS syntax). Formatting is defined by `.editorconfig`, ESLint, and Stylelint: two spaces, `template → script → style` order, mandatory braces, and K&R style. Styles are global and use component classes; ESLint prohibits `scoped`. Props/emits and typed functions replace the global event bus and Vue filters. Pointer Events and SVG viewBox calculations replace `svg-pan-zoom`.

## Requirements and commands

Development requires Go 1.27.3, Node.js 24, and npm. The main development command, run from the repository root, is:

```sh
go -C server run -tags dev .
```

Go starts Vite and proxies HTTP/WebSocket traffic; the interface and API are available at `http://127.0.0.1:8280/`. If dependencies are missing, it first runs `npm ci`. Stopping Go also terminates npm/Vite. Frontend HMR uses the same origin.

For independent frontend work, run `npm ci` and `npm run dev` in `web`: Vite listens on `127.0.0.1:8300` and proxies `/api` to `http://127.0.0.1:8280`. Set `API_PROXY_TARGET` to use another backend. All npm commands below run from `web`; from the root, use `npm --prefix web run <command>`. Dependency versions are pinned in the npm package and lockfile. If the API is unavailable, the interface displays a leaderboard or result-saving error.

| Command | Purpose |
| --- | --- |
| `npm run type-check` | Strict TypeScript and Vue SFC checks |
| `npm run lint` | ESLint flat config for JS, TS, Vue, and the ban on scoped styles |
| `npm run stylelint` | Stylelint for global SCSS files and Vue Sass blocks |
| `npm run format` | Apply ESLint and Stylelint fixes |
| `npm test` | Vitest: game rules, time, SVG coordinates, and the API contract |
| `npm run build` | Type checking and a production build in `web/dist` |
| `npm run check` | Linters, formatting checks, unit tests, types, and build |
| `npm run preview` | Local production preview at `127.0.0.1:8301/` |
| `npm run test:e2e` | Playwright: the production build in desktop and mobile viewports |

Before the first browser run, install Chromium with `npx playwright install chromium`. Linux CI uses `npx playwright install --with-deps chromium`. By default, Playwright starts and stops the preview server itself. Set `E2E_BASE_URL` to test an already running Go server instead; the packaged executable check uses this mode. Browser scenarios do not require a working database: E2E tests use API fixtures. The win scenario uses a small catalog with original map outlines; the full 256-entry catalog is checked separately.

The move to TypeScript 7 has not been made: the selected `typescript-eslint` 8.72.0 supports TypeScript below 6.1. TypeScript 6.0.3 was selected as the latest compatible stable release. Other direct dependencies were updated to verified stable versions as of October 23, 2026.

## Builds and the backend boundary

- `web/index.html` is a regular Vite entry point; the production build preserves this structure and uses paths rooted at `/`.
- `npm run build` produces a standard `web/dist`, with no server manifest or Go-specific steps.
- From the root, `go -C server run ./cmd/build` runs the frontend build and packages its output into the executable. Go serves the production assets; no external static directory is required.
- The large source file `web/src/assets/data/countries.json` is shipped as a separate hashed JSON asset rather than duplicated inside JavaScript. The original catalog is unchanged.
- Comfortaa fonts come from an npm package and are included in the static build; no request to Google Fonts is required.
- The frontend knows only `GET /api/scores` and `POST /api/scores`; it does not know the SQLite path, executable location, or packaging method. Result JSON fields are preserved, and HTTP errors with a JSON `error` field are shown to the player.
- Server-side game session validation and idempotency remain the next task in the plan. A POST with an uncertain outcome is not retried automatically.

## Game state and controls

`web/src/game/state.ts` contains the pure game rules. Three lives, correct-answer counting, switching prompts, coloring the expected country after a mistake, and the top 10 are preserved. Answering every prompt results in a win; the third mistake results in a loss. A completed game stops the timer immediately; a network request never delays the result screen. After a restart, an old request cannot change the new game's status.

`web/src/map/viewport.ts` handles zoom, coordinates with SVG letterboxing, and pan bounds. `WorldMap.vue` handles the mouse, wheel, one or two fingers, pointer capture, and gesture cancellation. Dragging and pinching do not count as answers. Zoom and overview-reset buttons are available. Resizing the window preserves the current map position.

The interface adapts to narrow screens: the header, hints, and preview information reflow, dialogs scroll, and buttons support touch interaction. Automated mobile checks use Chromium emulation. Physical Android/iOS checks and a separate WebKit run remain part of later mobile acceptance testing.

## Known dependency audit limitation

At the time of the update, the latest stable `braces` 3.0.3 still had [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), which affects nested glob patterns. It is a transitive dependency of Stylelint tooling and is absent from the browser application. No fixed stable npm release was available on the verification date; the warning has not been suppressed. The fixed `kind-of` 6.0.3, also used by tooling, is installed. Repeat the full `npm audit` when updating dependencies so this limitation can be removed after an upstream fix.
