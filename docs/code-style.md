# Frontend code style

These rules apply to source files, components, tests, and frontend configuration in `web`. They are defined by `.editorconfig`, ESLint, and Stylelint; CI runs the same checks.

## Project structure

```text
server/
  .editorconfig
  .gitignore
  cmd/build/
  internal/
  main.go
  go.mod
  go.sum
  test-package.sh
web/
  .editorconfig
  .gitignore
  src/
    api/
      client.ts
    assets/
      data/
      images/
    components/
    game/
      state.ts
    map/
      viewport.ts
    styles/
      _variables.scss
      index.scss
    utils/
      random.ts
      time.ts
    main.ts
    types.ts
  tests/
  eslint-rules/
  stylelint-rules/
  package.json
  package-lock.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  playwright.config.ts
  eslint.config.js
  stylelint.config.js
```

The root `.editorconfig`, `.gitignore`, `.github`, and `docs` apply to the entire repository. The frontend builds into `web/dist`. The backend packages that output into the executable; Go code uses `gofmt` with tabs. See [backend development](backend-development.md). The local development database is `server/db.sqlite` and is not tracked by Git.

Organize code by responsibility: `api` contains the network client, `game` the pure game rules and state, `map` the viewport math, and `utils` small shared functions. Components live in `components`, and shared styles in `styles`. The `assets` directory contains only static data and images. Shared models stay in `types.ts`; separate barrel files for re-exports are unnecessary.

Local `.gitignore` files exclude frontend dependencies and build output in `web`, and embedded assets and the development database in `server`. The root `.gitignore` contains shared IDE/environment rules and the application's root `bin` output. `.editorconfig` settings inherit from the root: `web/.editorconfig` defines the frontend line-length limit, and `server/.editorconfig` defines Go tabs.

## Indentation and Vue components

- Use two spaces, no tabs; UTF-8, LF, a final newline, and no trailing whitespace.
- SFC section order is `template`, then `script`, then `style`.
- Separate sections with one blank line.
- Root content inside each section starts at two spaces. Each additional nesting level adds two more.
- Keep an opening tag and all its attributes on one line if the line is at most 150 characters, including indentation. If it is longer, place every attribute on its own line.
- Only two layouts are allowed: all attributes on one line, or each attribute on a separate line. In the multiline layout, put `>` or `/>` on its own line at the opening tag's indentation level. Preserve attribute values, including significant whitespace and multiline expressions; a multiline value requires moving every attribute to a separate line.
- Use `kebab-case` for components in templates, such as `<score-table />`; use `PascalCase` for imports, such as `ScoreTable`.
- Component names are inferred from filenames. An explicit `name` option, including one in `defineOptions`, is prohibited. Other `defineOptions` settings are allowed.
- Components without content use self-closing tags with a space before `/>`.
- Attributes use double quotes; `{{ ... }}` expressions and `{ ... }` objects have spaces inside braces.
- Scripts use `script setup lang="ts"`; styles use `style lang="scss"` without `scoped` or CSS Modules.
- ESLint enforces two spaces through `@stylistic/indent`, `vue/script-indent`, and `vue/html-indent`. Vue sections use `baseIndent: 1`. `vue/block-order` checks section order.
- Stylelint enforces two spaces for Sass through `@stylistic/indentation`; Vue `style` blocks use `baseIndentLevel: 1`.

`max_line_length = 150` in `web/.editorconfig` provides the editor guideline. The local ESLint rule `project/attribute-layout` checks and fixes Vue and HTML attribute layout at that threshold. It does not require splitting long string values or template text.

`vue/component-name-in-template-casing`, `vue/no-restricted-component-options`, `vue/html-self-closing`, and `no-restricted-syntax` check component names and syntax. `vue/multi-word-component-names` is disabled: single-word filenames such as `Result.vue` and `Modal.vue` are allowed.

## TypeScript

- Use single quotes for strings and semicolons to end statements.
- Put spaces inside braces in named imports and objects.
- The line-length guideline is 150 characters, including indentation. Keep imports, function parameters, calls, conditions, method chains, and ternary expressions compact when they fit. Wrap long expressions at logical boundaries; the one-attribute-per-line rule applies only to HTML/Vue.
- Preserve the structure of multiline objects, arrays, and types. Avoid unnecessary wrapping in surrounding calls: keep an argument's opening bracket beside the call, and allow the next argument to start directly after the previous argument's closing bracket.
- Put one blank line between functions, interfaces, groups of checks, and subsequent actions. In tests, separate setup, action, and assertions. Related state declarations or calculations may be grouped; formatting must preserve meaningful group boundaries.
- Reuse existing named types, such as `Point`, instead of repeating structural definitions. Type-only imports use `import type`; mixed imports may use `import { WORLD, type Point }`.
- Both arrow function forms are allowed: an implicit expression return and a block body with `return`. Do not convert one form into the other across the project.
- Keep imports in a single block without blank lines inside it. Put one blank line after imports and between `defineProps`, `defineEmits`, and the rest of the code. This also applies to `defineProps` wrapped in `withDefaults`.
- In multiline types and interfaces, write each member on its own line and end it with `;`. `project-types/multiline-members` and `@stylistic/member-delimiter-style` enforce this.
- Prefer `const` and arrow functions, including named handlers and exported functions.
- `if`, `else`, `for`, `while`, and `do` always use braces, even for a single action.
- Use K&R/1TBS brace style: the opening brace is on the same line; `else` and `catch` share the previous block's closing-brace line.
- Write block bodies across multiple lines; do not use single-line condition or loop blocks.
- Regular functions are allowed when an API requires them or they need their own `this` semantics; the current frontend has no such requirement.

ESLint enforces `curly: all`, `func-style: expression`, `prefer-arrow-callback`, `@stylistic/brace-style: 1tbs`, indentation, quotes, and semicolons.

`project-layout/compact` removes unnecessary line breaks in expressions that fit within 150 characters. It preserves multiline objects and types, string literals, and comments. The threshold does not require splitting strings or text. Meaningful grouping and named-type reuse are checked during editing; ESLint checks syntactic block boundaries and type-import syntax.

```ts
const props = withDefaults(defineProps<{
  label: string;
  size?: 'small' | 'large';
}>(), {
  size: 'large',
});
```

## Imports

| Alias | Path |
| --- | --- |
| `@/` | `web/src/` |
| `@assets/` | `web/src/assets/` |

Aliases are configured consistently in `web/tsconfig.json`, Vite, and Vitest. Use them to import components, TypeScript modules, images, and geographic data. ESLint prohibits relative imports of frontend modules.

Import Sass variables with `@use '@/styles/variables' as v;`. Built-in Sass modules such as `sass:color` keep their own names. Paths read by tests through Node `fs` and `import.meta.url` remain ordinary file URLs rather than module imports.

## Sass

- Styles are global, with clear component class names.
- Nest selectors for component elements and states; separate declarations, selectors, and blocks with line breaks.
- Write each property on its own line, ending with `;`. Put one blank line between selector blocks; a blank line before the first nested selector is optional when no declarations precede it.
- Keep media queries inside the relevant component block.
- Align Sass variable values in a single column within each consecutive group. Preserve the chosen column in an already aligned group; align a new group to the longest name, with at least one space after `:`. A blank line, comment, or other node separates groups.
- Ordinary CSS properties use one space after `:`. Keep values, including shadows and gradients, on one line when they fit within 150 characters. Preserve strings, comments, Sass maps, and custom-property token streams.
- Write HEX colors in full uppercase form: `#FFFFFF`, `#C38F58`, `#AABBCCDD`. Functional `rgb(...)` notation stays functional.
- Use separate root blocks for elements rendered through `Teleport`: the preview modal is physically outside `.score-table`.
- Do not add one-off lint exceptions to bypass the agreed style.

`project/sass-variable-alignment` and `project/compact-values` check variable alignment and compact values; `color-hex-length` and `@stylistic/color-hex-case` check HEX length and case.

## Editor

The root `.editorconfig` sets base indentation and LF, while `web/.editorconfig` sets the 150-character guideline. `.vscode/settings.json` sets a ruler at 150, disables indentation detection, and enables ESLint/Stylelint fixes on explicit save. A separate format-on-save formatter is disabled so it does not rewrite the agreed layout. Recommended extensions are listed in `.vscode/extensions.json`. The user's Vue settings for initial indentation and input are preserved. Go uses tabs through `server/.editorconfig`.

## Checks

From the repository root:

```sh
npm --prefix web run format
npm --prefix web run lint:fix
npm --prefix web run check
npm --prefix web run test:e2e
go -C server test -tags dev ./...
```

The last command checks the Go API, SQLite persistence, and static serving without requiring a frontend build first.

`lint:fix` applies ESLint fixes; `stylelint:fix` applies Stylelint fixes. `format` runs both tools in sequence; there is no separate formatter. A regular `check` runs without modifying source files.

Local rules live in `web/eslint-rules` and `web/stylelint-rules`. Regression tests in `web/tests/unit/code-style.test.ts` and `web/tests/unit/stylelint.test.ts` cover the 150/151 threshold, attribute and expression layout, literal and comment preservation, Sass alignment, colors, and unchanged output when formatting is repeated.
