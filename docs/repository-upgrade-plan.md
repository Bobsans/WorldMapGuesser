# World Map Guesser upgrade plan

Approved on October 23, 2026.

Status: in progress. The frontend has moved to the new stack; existing leaderboard operations have moved to Go and `/api/scores`, with a combined development launcher and embedded-asset build added. CI now includes publication of the checked executable over SSH; the first workflow run is still pending. Server-side game session validation remains a separate task. Checkboxes are marked only after the corresponding task is implemented and verified.

The current implementation and checks are described in the [frontend guide](frontend-development.md) and [Go backend guide](backend-development.md). Moving HTTP/SQLite and packaging to Go does not mean that server-side game validation or the entire plan is complete.

Source is split between `web/src` and `server`; frontend configuration lives in `web`. Indentation, SFC order, and alias conventions are documented in the [code style guide](code-style.md).

## 1. Goal and agreed decisions

Preserve the existing game, rewrite its technical foundation, fix bugs and vulnerabilities, provide comfortable phone controls, and automate Linux updates after successful GitHub Actions checks.

| Area | Agreed decision |
| --- | --- |
| Repository | `https://github.com/Bobsans/WorldMapGuesser.git`, default branch `main` |
| CI/CD | GitHub Actions; checks for commits and pull requests, automatic deployment of a successful commit from `main` |
| Server | Go, an HTTP server using the standard library, one Linux executable |
| Frontend | Vue 3, TypeScript, Vite, Sass (SCSS); global styles without `scoped`, using the latest compatible stable versions at implementation time |
| Static assets | HTML, JS, CSS, SVG, images, and required fonts are included in the Go executable through `go:embed` and served by the application |
| Map | The existing country catalog and SVG outlines; custom pan/zoom controls replace `svg-pan-zoom` |
| Database | SQLite, confirmed separately; MySQL is not used |
| Layout | One installed executable and the database file beside it in the application directory |
| Runtime | Existing systemd and Nginx infrastructure; Nginx terminates HTTPS and proxies requests to the application |
| Updates | The checked executable replaces the installed file, then the service restarts |
| Server-side versions | No release directories, retained previous executables, automatic backups, or automatic rollback |
| Gameplay | Preserved; new modes, accounts, multiplayer, and a separate redesign are outside this upgrade |
| Mobile | Full adaptation of the existing interface and map controls |

The requirement for no server dependencies means the application must run without installing Python, Node.js, npm, the Go toolchain, a system SQLite library, or a database server. Development libraries are allowed: they are pinned in the repository and included in the executable or static files.

Go and Node.js are used during development and CI. Builds do not run on the production server. Docker and a persistent CI runner on the game server are not required.

## 2. Starting point and migration scope

Original local revision: `78039e110910243f1fd4951459e6e3dc92ba52d3`, December 2018. The branch has been renamed to `main`, and `origin` points to GitHub. An intermediate commit, `04b6693`, was created before the Go migration; it retains the original Python implementation. The obsolete `server/upgrade.sh` has been removed; the project workflow describes builds and publication.

Main source files:

| File | Responsibility |
| --- | --- |
| [`web/src/components/App.vue`](../web/src/components/App.vue) | Game state, prompts, lives, timer, and result submission |
| [`web/src/components/WorldMap.vue`](../web/src/components/WorldMap.vue) | SVG map, Pointer Events, and custom pan/zoom controls |
| [`web/src/assets/data/countries.json`](../web/src/assets/data/countries.json) | Catalog of 256 countries and territories: identifiers, names, and SVG outlines |
| [`web/src/components/Welcome.vue`](../web/src/components/Welcome.vue), [`Result.vue`](../web/src/components/Result.vue), [`ScoreTable.vue`](../web/src/components/ScoreTable.vue) | Start screen, results, and leaderboard |
| [`server/internal/httpserver/server.go`](../server/internal/httpserver/server.go) | HTTP API under `/api`, JSON validation, and readiness |
| [`server/internal/store/store.go`](../server/internal/store/store.go) | SQLite, legacy table preservation, and leaderboard |
| [`server/internal/webui/handler.go`](../server/internal/webui/handler.go) | Embedded static assets served from `/` |
| [`server/cmd/build/main.go`](../server/cmd/build/main.go) | Frontend build and packaging of the single Go executable |
| `tools/` (removed during the frontend migration), [`package.json`](../web/package.json) | Originally Webpack 4, Babel, and Vue 2; now Vite |
| [`.github/workflows/frontend.yml`](../.github/workflows/frontend.yml) | Project checks, executable build, and publication |

The following problems were identified in the original revision. This is a historical inventory, not a list of all remaining bugs:

- A win screen exists, but the game logic never triggers a win.
- The server trusts submitted `result`, `time`, `rights`, and `wrongs`; full game validation is missing.
- Input validation checks only the upper score limit and the types of two arrays.
- The timer stops only after waiting for result submission; network failure or latency affects UI completion.
- API URL construction uses `location.href.trim('/')`; `trim` has no argument for removing a specific character, so this code needs proper URL handling.
- The npm lockfile is excluded from Git, and automated tests and CI are absent.
- Old history contains Bitbucket credentials. Their values must not be copied into documentation, workflows, or new configuration.

The exact reason the installed Linux version does not work has not yet been confirmed through server logs. The rewrite does not need to retain the old Python/Bottle dependency.

During migration, explicitly test the final prompt, rapid repeated clicks, completion followed by an immediate restart, network errors, conflicts between dragging and selecting a country, and small-screen behavior.

## 3. Gameplay to preserve

- The player enters a nickname and starts a game.
- Prompts are shuffled, using the full existing catalog of 256 countries and territories.
- The player finds the requested country on the map; pan and zoom remain available during play.
- The player has three lives. A wrong answer costs one life.
- A correct answer marks the requested country green. A wrong answer marks the requested country red, rather than whichever territory the player selected.
- Answered prompts do not return to the queue and cannot accept another answer.
- Available prompts can be browsed forward and backward without a penalty, including the existing arrow-key controls.
- The score equals the number of correct answers; time is measured in seconds.
- The third mistake ends the game in a loss. Answering every prompt with lives remaining ends it in a win. A loss takes precedence if the third mistake occurs on the final prompt.
- Preserve the result screen, restart, top 10 ordered by score descending and time ascending, and map previews of saved games.

Fixing game completion and adapting the interface for mobile are part of the plan. Changing the catalog, geographic boundaries, scoring rules, or adding new game modes is outside its scope.

## 4. Target architecture

### 4.1. Application and runtime layout

Request path: browser → Nginx/HTTPS → Go application on a loopback address → SQLite.

Example application directory; determine the actual absolute path from the current installation:

```text
world-map-guesser/
  world-map-guesser
  db.sqlite
```

SQLite may create its own journal, `-wal`, and `-shm` files. These are database working data, not retained application versions. Deployment does not remove them.

- Configure the listening address and database path through the systemd environment.
- By default, resolve the database beside the executable, regardless of the process working directory.
- Before the first switchover, explicitly set the existing production database path so starting from another directory cannot silently create an empty leaderboard.
- The application listens on loopback. Nginx accepts external requests.
- Run the service without root. Directory permissions must allow SQLite journals; limit the deployment user's permissions to updating the game and restarting its service.
- Send logs to stdout/stderr and journald; no separate logging infrastructure is required.
- On SIGTERM, finish active requests within a bounded time and close the database cleanly.
- A small `/api/health` endpoint reports readiness, including database availability, and the built commit identifier.

### 4.2. Standalone Go executable

- Use standard `net/http`, `database/sql`, and `embed` wherever they are sufficient.
- Use a SQLite driver without CGO, initially `modernc.org/sqlite`; confirm production architecture support and acceptable resource use.
- Build production with `CGO_ENABLED=0` for the selected `GOOS=linux` and `GOARCH`.
- In CI, check that there are no dynamic library dependencies and that the executable runs in a minimal Linux environment without Python, Node, or a system SQLite library.
- Include only production frontend files and game assets. Exclude the database, secrets, local settings, and test data.
- Build the frontend before compiling Go; missing prepared assets must cause the build to fail.

`go:embed` includes files at compile time, and `modernc.org/sqlite` provides a SQLite driver without CGO. Together, they support the agreed packaging. References: [Go embed](https://pkg.go.dev/embed), [modernc.org/sqlite](https://pkg.go.dev/modernc.org/sqlite).

### 4.3. Game rules and server-side validation

- Extract client game rules into an independent TypeScript module with explicit ready, playing, and finished states.
- Use a deterministic shuffle source for reproducible tests and game validation.
- The server creates a session with an identifier, start time, prompt order, and rules/catalog version.
- The browser handles map interaction and actions locally, without waiting for an HTTP request after each click.
- On completion, the client submits the sequence of answers and necessary prompt switches rather than a trusted final score.
- The server replays that sequence under the same rules and calculates correct answers, mistakes, lives, and the final score itself.
- The server validates duration against the session lifecycle. Display time uses monotonic measurement rather than counting `setInterval` callbacks; rounding rules must agree between the UI and API.
- Session completion is idempotent: resubmission does not create another leaderboard entry.
- Sessions expire; stale data and rate-limit records must not accumulate indefinitely in memory or the database.
- A result-submission failure does not keep the timer running or block the result screen. Retries use the same session.

Game validation prevents direct score substitution and inconsistent results. It does not promise to prevent automated play: the geography and client code are public.

### 4.4. SQLite and data preservation

- Preserve existing nicknames, scores, times, and answer maps.
- Add record identifiers, the necessary session relationship, and leaderboard indexes to the schema; preserve the current top-10 ordering.
- Run migrations transactionally and track the schema version. Repeated migrations must not duplicate data.
- Do not silently delete invalid legacy records: record their count and reason, and preserve their origin.
- Do not retroactively label old results as validated by a new game session.
- Choose connection settings, lock timeout, journal mode, and cache size through single-process testing. Do not enable WAL automatically without assessing the need.
- Test result persistence and application shutdown with a real temporary SQLite file.
- A normal deployment replaces only the executable; do not overwrite, clear, or include the database and its auxiliary files in the artifact.

## 5. Frontend and custom map controls

### 5.1. Vue and build migration

- Migrate the application to Vue 3, TypeScript, and Vite.
- Replace the global event bus with explicit state and component events/composables.
- Type countries, game state, API responses, and network errors.
- Preserve the purpose and content of existing screens; adapt layout to different screen sizes.
- Remove Webpack, Babel, and obsolete plugins after migrating all used functionality. Move all Less styles to Sass (SCSS); use global classes without `scoped` or CSS Modules.
- Use correct API URLs regardless of a trailing `/`, query parameters, or supported Nginx configuration.
- Serve required resources locally; external Google Fonts must not be necessary to display the interface.
- Use an HTML cache policy that allows clients to receive a fresh build after deployment; use long-lived caching for content-hashed files.
- An old open tab must not submit an incompatible game as though it belonged to a new rules version. Validate the session version and show a clear error to the player.

### 5.2. Replacing `svg-pan-zoom`

Implement a small SVG control module using Pointer Events and testable coordinate calculations.

- Mouse and single-finger dragging.
- Wheel zoom centered on the pointer.
- Two-finger zoom centered on the gesture.
- Minimum/maximum zoom and pan limits that allow the map to return to the visible area.
- Initial map fitting, overview reset, and correct handling of container resizing.
- Conversion from screen to SVG coordinates, accounting for zoom, dimensions, and the current transform.
- Pointer capture so a gesture can continue outside its starting element.
- A movement threshold that distinguishes country selection from dragging; ending a drag/pinch does not count as an answer.
- Correct gesture cancellation on `pointercancel`, lost capture, changes in finger count, and phone rotation.
- No conflicts with existing prompt-switching keys or nickname entry.
- Handler removal and capture release when the component is destroyed.
- Map movement must not trigger unnecessary rerenders of the entire application on every pointer move.

### 5.3. Mobile adaptation

- Check widths of 320, 360, 390, 430, and 768 CSS pixels, plus a regular desktop viewport; this is a minimum matrix, not a limit on supported sizes.
- Support portrait and landscape, safe areas, and available-height changes caused by mobile browser bars.
- Position the prompt, lives, time, and navigation so they do not cover the main map.
- Make buttons comfortable to tap, targeting a hit area of at least 44 CSS pixels.
- Allow access to small territories through zooming; do not change country-selection rules through arbitrary expansion of overlapping hit areas.
- Remove dependence on hover and a physical keyboard.
- Limit `touch-action` restrictions to the map: game controls must not break modal scrolling or zooming elsewhere on the page.
- Check nickname entry with the on-screen keyboard, long country names, leaderboard, result-map preview, and restart.
- Preserve visible focus, control labels, and keyboard controls on desktop.

## 6. Dependency versions and security

### 6.1. Update policy

- At the start of implementation, select the latest compatible stable versions of Go, Vue, Vite, TypeScript, and tooling. Do not use beta/RC releases as the main stack.
- Check new Vite/Vue versions' Node requirements; Node is needed only for development and CI.
- Record the exact selected versions in environment documentation, `go.mod`, `go.sum`, `package.json`, and the npm lockfile.
- Remove the lockfile exclusion from `.gitignore`; install frontend dependencies with `npm ci` in CI.
- CI uses pinned versions rather than selecting `latest` again on every deployment.
- Remove unused dependencies instead of carrying over the entire old list.
- Pin GitHub Actions to full commit SHAs; rerun checks when updating dependencies.

### 6.2. Fixes and checks

- Revoke old credentials previously stored in the project. Remove secrets before publishing the full old history; do not push them to public GitHub.
- Do not store the deployment key, passwords, or production access settings in source files or the artifact.
- Validate JSON sizes, types and ranges, nickname length, allowed country identifiers, event order, duplicates, and terminal game state.
- Use parameterized SQL, bounded HTTP timeouts, and predictable JSON errors with appropriate status codes.
- Rate-limit session creation and result submission, trusting the real client address only when supplied by the trusted Nginx proxy.
- Keep the interface and API on one origin; do not open CORS to arbitrary sites. For cookie-based requests, account for origin validation and CSRF.
- Never interpret nicknames as HTML; test XSS protection and accidental exposure of local files through the static handler.
- Configure appropriate security headers and exclude debug endpoints from production.
- Check Go dependencies with `govulncheck`, npm dependencies with an audit, and the repository with secret scanning and static analysis.
- Fix applicable vulnerabilities; do not replace fixes with disabled checks or unjustified warning exclusions.
- Build and test pull requests without production secrets; grant deployment access only to the job for trusted `main`.

Tests and scanners verify the properties they check and identify known problems; they do not promise the absence of every vulnerability.

## 7. Tests and resource measurements

| Layer | Required scenarios |
| --- | --- |
| Game rules | Shuffling, forward/backward navigation, correct answer, mistake, three lives, all prompts, win, loss, score, restart, and no answers after completion |
| Timer and network | Monotonic time, stopping before result submission, slow network, API failure, and retry without a duplicate result |
| Geographic data | 256 entries, unique IDs, nonempty names and outlines, and the same catalog version on client and server |
| Map gestures | Coordinate conversion, zoom/pan limits, drag versus click, pinch, gesture cancellation, resize, and handler cleanup |
| Go API | Real HTTP requests, validation, server-side score calculation, session expiry, idempotency, rate limits, and error codes |
| SQLite | Real temporary files, legacy schema, migration, no record loss/duplication, top-10 ordering, locking, and restart |
| Browser | Playwright: start, answer, loss, win, restart, leaderboard, and preview; desktop and mobile viewports, Chromium/Firefox/WebKit |
| Packaged application | Run the final Linux executable from an empty working directory with a separate temporary database; HTML, embedded assets, API, readiness, and SIGTERM |
| Deployment | Transfer, transfer failure before replacement, checksum verification, file replacement, restart, startup failure, and sequential/stale CI jobs |

Run frontend unit tests with Vitest. Run Go unit/integration tests, `go vet`, and the race detector in a suitable CI environment. Production builds remain CGO-free; the race-detector test toolchain is not installed on the server.

Phone emulation in a browser does not replace real gesture testing. Before completing mobile adaptation, check at least Android/Chrome and iOS/Safari when devices are available; explicitly record any missing coverage.

Measure service RSS, idle CPU, executable and asset sizes, cold startup, API latency, and SQLite behavior under concurrent requests. Record the scenario and concurrent client count, then establish a verifiable resource budget. Do not claim specific memory use before measuring it. Also check session cleanup and the absence of memory growth after repeated games.

## 8. GitHub Actions: from commit to installed file

### 8.1. Checks

1. Run applicable checks on every push; run the same required set on pull requests. Avoid duplicate runs for a change when the push is already covered by the pull-request workflow.
2. Check formatting, ESLint, TypeScript, game-module tests, Go tests, and static analysis.
3. Run dependency audits and secret scanning.
4. Build the production frontend and the Linux executable for the server architecture.
5. Test the executable itself and run browser scenarios against the packaged application.
6. Store the executable artifact, its SHA-256, commit identifier, and test reports in GitHub Actions.

A smoke check for the target architecture requires a compatible runner or explicitly configured emulation. Building an ARM executable alone does not replace running it.

### 8.2. Artifact publication

The workflow publishes the same executable that passed checks, only after a push to `main`. It uses ordinary SCP and SSH, SHA-256 verification, file replacement, and restart of the existing service. The database is excluded from the artifact. Publications run sequentially, stale commits are rejected, and readiness is checked against the build SHA. Server configuration and maintenance instructions are not stored in the repository.

## 9. Implementation sequence

### Stage 1. Record existing rules and server parameters

- [ ] Preserve a source-linked inventory of behavior and bugs; distinguish confirmed problems from unverified assumptions.
- [ ] Confirm the rules in section 3 with examples, including the final country and simultaneous exhaustion of lives/prompts.
- [ ] Verify the Linux server's distribution, architecture, and available resources.
- [ ] Establish absolute paths for the executable and existing database, systemd service name, runtime user, address/port, and Nginx configuration.
- [ ] Check existing service and proxy settings; change only the necessary game parameters.
- [ ] Review secret storage and prepare to publish history without credentials.

Acceptance criteria: rules and migration scope are defined; production parameters are known; unrelated local changes are preserved.

### Stage 2. Prepare the new structure and reproducible build

- [ ] Select and pin the latest stable tool and library versions.
- [x] Add a modern frontend project, npm lockfile, and consistent check commands.
- [x] Add a Go module and backend checks.
- [x] Organize the Go entry point, HTTP API, SQLite, static assets, dev/build tooling, and tests by responsibility without separate services. The full game-rules module belongs to stage 3.
- [x] Add a basic GitHub Actions workflow for frontend checks; its local equivalent is verified, while running it on GitHub requires pushing a commit.
- [x] Add Go API/SQLite checks, the race detector, and packaged Linux application checks to CI; running them on GitHub requires pushing a commit.
- [x] Add publication of the checked executable over SSH after successful CI on a push to `main`.
- [x] Add local backend/frontend startup instructions and a single-executable build guide.

Acceptance criteria: the new foundation builds in CI with pinned dependencies; preparing it does not change the existing database.

### Stage 3. Migrate rules and implement the Go API with SQLite

- [ ] Implement the game module and tests for preserved rules.
- [ ] Implement sessions, server-side score calculation, completion, and error handling.
- [ ] Implement the leaderboard, saved answer maps, and idempotency.
- [ ] Prepare a legacy SQLite schema migration and a fixture with old results, including invalid records.
- [ ] Test migration, data preservation, repeated startup, and concurrent requests on temporary files.
- [x] Add configuration, readiness, and graceful service shutdown.

Acceptance criteria: API and database tests pass; the server rejects arbitrary scores and does not duplicate completed games.

### Stage 4. Migrate the interface and replace SVG controls

- [x] Migrate existing screens to Vue 3 and TypeScript, and styles to global Sass without `scoped`.
- [x] Connect the game module and typed Go API client under `/api/scores` without a global event bus; the session protocol remains a separate task.
- [x] Implement custom pan/zoom and coordinate/gesture tests.
- [x] Fix wins, terminal states, the timer, and UI network-error handling.
- [x] Preserve all 256 map objects, coloring, navigation, and leaderboard previews.
- [x] Remove `svg-pan-zoom` after its replacement passes checks.

Acceptance criteria: every previous scenario remains available, the intended win works, and map gestures do not create false answers.

### Stage 5. Adapt the game for mobile devices

- [x] Implement responsive layout and touch controls; full acceptance under section 5.3 requires the following device checks.
- [ ] Check orientations, small countries, pinch/drag, the on-screen keyboard, and long names.
- [x] Add browser regressions for desktop and mobile sizes.
- [ ] Perform the available real-phone checks and record coverage limitations.

Acceptance criteria: a game can be started, played, and restarted on a phone without a physical keyboard, accidental answers after gestures, or inaccessible controls.

### Stage 6. Finish packaging, security, and checks

- [x] Embed every production asset in the Go executable.
- [x] Verify startup without an external static directory or language runtimes.
- [ ] Resolve applicable audit, input-validation, and security-check findings.
- [ ] Run the full test suite, including migration, browsers, and the final artifact.
- [ ] Measure resources and record results and a budget.

Acceptance criteria: the final Linux artifact passes checks; its contents and resource characteristics are known.

### Stage 7. Verify artifact publication

- [x] Add a deployment job with SSH, checksum verification, sequential publication, and protection against stale commits.
- [ ] Test replacement, restart, and failures in a test environment/fixture without creating production release directories.
- [ ] Perform the first Go artifact publication through CI while preserving the existing database.
- [ ] Verify the installed commit, Nginx access, old leaderboard, and saving a new game.
- [ ] Verify another successful publication without clearing the database.

Acceptance criteria: a successful commit to `main` automatically replaces the single executable, the service starts, and data is preserved.

### Stage 8. Remove obsolete infrastructure and finish documentation

- [x] Remove old Python/Bottle entry points, dependencies, and the template loader after verifying Go HTTP/SQLite and embedded assets; Webpack was removed during the frontend migration.
- [x] Remove `server/upgrade.sh` after GitHub Actions replaces its functionality.
- [x] Split `.gitignore` between the root, `web`, and `server`; remove old Python exclusions and retain exclusions for the working database, local secrets, and generated files.
- [x] Update links to removed source files in this plan and move the current architecture/startup description into permanent documentation.
- [x] Document local development, check commands, application configuration, and data paths. Server instructions are not stored in the repository.
- [ ] Remove temporary development files and rerun checks after deleting old code.

Acceptance criteria: the repository describes and builds one current implementation; obsolete instructions are not used for startup or updates.

## 10. Final acceptance criteria

- [ ] Existing gameplay and the catalog are preserved, and confirmed bugs are fixed.
- [ ] The game works on desktop and phones; custom SVG controls replace the library.
- [ ] Running the application requires one Linux executable with embedded assets and an adjacent SQLite file.
- [ ] The server does not need Python, Node, the Go toolchain, or a system database server.
- [ ] Old results are preserved; migrations and repeated startup are verified.
- [ ] The server validates scores; input and API limits are implemented and tested.
- [ ] Full CI passes before deployment, and the server receives the exact checked artifact.
- [ ] Deployment replaces the executable and restarts systemd; Nginx proxies to the application.
- [ ] Deployment creates no release history, backup mechanism, or automatic rollback on the server.
- [ ] Resource use is measured, configuration and diagnostics are documented, and the old update mechanism is removed.
