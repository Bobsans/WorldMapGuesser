# World Map Guesser developer documentation

This directory covers development, architecture, code style, testing, and the repository upgrade plan. For an introduction to the game and player controls, see the [project README](../README.md).

## Start here

| Guide | What it covers |
| --- | --- |
| [Backend development and builds](backend-development.md) | Go API, SQLite, the combined development server, embedded assets, and standalone builds |
| [Frontend development](frontend-development.md) | The Vue/Vite project, API integration, game state, map controls, and browser tests |
| [Code style](code-style.md) | Module structure, editor settings, the 150-character limit, Vue, TypeScript, and Sass |
| [Repository upgrade plan](repository-upgrade-plan.md) | Agreed architecture, gameplay preservation, mobile support, security, testing, and CI publication |

For local development, start with the backend guide: its single command runs both Go and Vite.

## Current implementation and planned work

The backend and frontend guides describe the current implementation and its checks. The upgrade plan also includes work that is still pending; completed tasks are checked only after their acceptance criteria have been verified.
