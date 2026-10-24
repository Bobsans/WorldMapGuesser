# Backend development and builds

The backend lives in `server`, and the standalone Vue/Vite project lives in `web`. The frontend uses a regular `index.html` and knows only the API paths. There are no server templates, manifest loader, or `/static/` prefix. In production, the application serves its embedded frontend from `/` and its HTTP API from `/api`.

## Requirements

Versions are pinned in `server/go.mod` and `server/go.sum`: Go 1.27.3 and `modernc.org/sqlite` 1.61.0. Development and builds also require Node.js 24 and npm. These tools are not needed on the production machine.

HTTP uses the Go standard library; the SQLite driver does not require CGO. The build sets `CGO_ENABLED=0`. References: [Go embed](https://pkg.go.dev/embed), [SQLite driver](https://pkg.go.dev/modernc.org/sqlite), [Go releases](https://go.dev/doc/devel/release).

## One-command development

From the repository root:

```sh
go -C server run -tags dev .
```

Go runs `npm ci` if needed, starts `npm run dev` on an available loopback port, and waits for Vite to become ready. The interface and API are then available at `http://127.0.0.1:8280/`. Frontend requests and HMR WebSockets pass through the Go proxy. There is no need to open Vite's internal address separately.

Stopping Go terminates the npm/Vite process tree. If Vite exits unexpectedly, Go also exits with an error. Frontend changes update through HMR; changes to Go code require restarting the command.

The default development database is `server/db.sqlite`. Use `-db` and `-addr` for an isolated instance, for example:

```sh
go -C server run -tags dev . -addr 127.0.0.1:8281 -db /absolute/path/test.sqlite
```

The `dev` Go build tag excludes production assets, so a frontend build is not required before starting development. After updating npm dependencies, run `npm --prefix web ci`; automatic installation at startup only handles a missing `node_modules` directory.

## Standalone build

From the repository root:

```sh
go -C server run ./cmd/build
```

The command builds `web` with `npm run build`, copies only the output from `web/dist` into the generated `server/internal/webui/dist`, and compiles Go with the embedded files. The frontend has no Go-specific build steps. A missing `index.html`, npm failure, or Go failure causes the build to fail. Old bundle files are not mixed with the new build.

The default output is `bin/world-map-guesser`, or `bin/world-map-guesser.exe` on Windows. Example Linux build:

```sh
go -C server run ./cmd/build -target linux/amd64
```

Confirm the production server's architecture before deployment; `-target` accepts a Go OS/architecture pair. Use `-output` to choose another output path. Git ignores `bin`, both `dist` directories, dependencies, and working databases.

A plain `go build` does not run npm. The supported full-build command is `go run ./cmd/build`, which ensures the correct step order. After it completes, a separate Go compilation can reuse the prepared assets. On a clean checkout, a production compilation without assets fails at `go:embed`.

## Runtime and data

Only one executable is transferred to the server. The database is not included in the bundle and is not overwritten by builds or updates:

```text
application/
  world-map-guesser
  db.sqlite
```

In production, the default database path is resolved relative to the executable, regardless of the working directory. Set `WMG_DB` or `-db` to use another path.

| Setting | Default | Purpose |
| --- | --- | --- |
| `WMG_ADDR` / `-addr` | `127.0.0.1:8280` | HTTP server address |
| `WMG_DB` / `-db` | `db.sqlite` next to the executable | Existing or new SQLite file |

Command-line flags take precedence over environment variables. Logs go to stdout/stderr; there are no separate log files or rotation. systemd captures output in journald. SIGTERM/Interrupt triggers a time-limited HTTP shutdown and closes the database.

The legacy `results(user, result, time, rights, wrongs)` table stays in place. A transactional migration adds the leaderboard index and sets `user_version = 1`; subsequent runs do not duplicate data. Newer or incompatible schemas are rejected. Invalid legacy rows are retained: reads skip them and print a warning with the number of skipped rows. New results pass separate, strict validation.

WAL is not enabled automatically. SQLite may create its own temporary journal; this is database working data, not an application copy or a database backup.

## API

| Method and path | Behavior |
| --- | --- |
| `GET /api/health` | Database readiness and the build's Git revision; a modified checkout adds `-dirty` |
| `GET /api/scores` | Up to 10 results, ordered by score descending and time ascending |
| `POST /api/scores` | Saves a result and returns `{ "success": true }` |

Result fields remain `user`, `result`, `time`, `rights`, and `wrongs`. Arrays contain country identifiers. Validation covers required fields, JSON types, a 64 KiB request limit, a 64-character nickname limit, value ranges, unique answers, a maximum of three mistakes, and agreement between the score and the number of correct answers. Errors have a JSON `error` field and an HTTP status of 400/413/415/500; unsupported routes and methods return 404/405. API requests never reach the static handler and are not cached.

HTML is served with cache revalidation; hashed Vite files under `assets` use long-lived immutable caching. Directory listings, hidden files, and unknown paths are not served as `index.html`.

At this stage, the server stores results after validating their shape and consistency. It does not yet replay a game against a server session or guarantee that submitted answers are honest; sessions, server-side score calculation, TTL, idempotency, and rate limits remain in the [plan](repository-upgrade-plan.md). The client does not automatically retry a POST whose outcome is uncertain.

## Checks

```sh
go -C server test -tags dev ./...
go -C server vet -tags dev ./...
npm --prefix web run check
go -C server run ./cmd/build
go -C server test ./...
```

Go tests cover the legacy table using real temporary SQLite files, repeated migration, persistence after reopening, concurrent writes, JSON errors, API boundaries, caching, and static serving. Go code must be formatted with `gofmt`.

CI also runs the race detector, builds the Linux executable, and runs `bash server/test-package.sh bin/world-map-guesser`. This check copies only the executable into a separate directory, starts it from another working directory without Node/Go in `PATH`, saves a result through the real HTTP API, restarts the application, verifies persistence, and runs Playwright against the embedded frontend. Browser scenarios use the current API fixtures. After completion, the directory contains only the application and `db.sqlite`.
