# AGENTS.md

Guidance for AI coding agents working on Total.js framework v5.

## Project

Total.js framework v5 is a pure JavaScript framework for Node.js. It can be used for web, desktop, service, and IoT applications.

Package name: `total5`
Main entry: `index.js`
CLI binaries: `bin/total5`, `bin/flow5`
License: MIT

## Repository Layout

- `index.js` initializes the framework and global `F`/`Total` object.
- `global.js` defines public globals such as `ROUTE`, `NEWACTION`, `NEWSCHEMA`, `DATA`, `DB`, `FILESTORAGE`, `PYPELINE`, `MODS`, `REQUEST`, and others.
- `controller.js`, `routing.js`, `api.js`, and `builders.js` contain core web/API/action behavior.
- `nosql*.js`, `querybuilder.js`, and `filestorage.js` contain storage/query functionality.
- `flow*.js`, `flowstream.js`, `tms.js`, `openclient.js`, and `aimodel.js` contain higher-level platform features.
- `tests/` contains runnable examples and regression tests for framework behavior.
- `tools/` and `bin/` contain local command-line helpers.

## Commands

Run the full test suite:

```bash
npm test
```

Equivalent direct command:

```bash
cd tests && node run.js
```

Check JavaScript syntax for a changed file:

```bash
node --check path/to/file.js
```

There is no configured lint script in `package.json`; do not invent one.

## Coding Style

- Use plain JavaScript and existing framework conventions.
- Keep `'use strict';` where existing files use it.
- Prefer `var` in files that already use `var`; do not mass-convert style to modern syntax.
- Keep indentation, spacing, and callback style consistent with nearby code.
- Avoid broad formatting-only changes.
- Do not introduce new runtime dependencies unless the change explicitly requires them and maintainers approve.
- Preserve existing public API names and global names unless the task is specifically about changing them.

## Source-First Rules

- Verify framework behavior in the local source before documenting or changing it.
- Do not assume Total.js v4 APIs exist in Total.js v5.
- Do not document an API, global, option, route flag, or behavior unless it exists in this checkout.
- When writing examples, prefer patterns from `tests/` and nearby framework files.
- If docs and source disagree, treat source and tests as authoritative.

## Actions, Schemas, and Routing

- Use `NEWACTION()` and `NEWSCHEMA()` patterns from `tests/schemas/`.
- API routing examples should follow existing `ROUTE('API ...')` patterns from `tests/routing/`.
- In Total.js v5 action examples, use the framework action/controller context exactly as implemented; verify methods such as `$.success()`, `$.invalid()`, `$.controller`, and response helpers in source before using them.
- Keep validation definitions close to existing examples, such as `input: 'value:String'` and `params: 'id:UID'`, unless the task requires deeper changes.

## Storage and Query Builders

- Verify `DATA`, `DB`, `NOSQL`, `FILESTORAGE`, and query builder behavior in the relevant source files before changing examples or internals.
- Do not infer method signatures from method names. Check the implementation and tests.
- Be careful with storage concurrency, queues, and async behavior; describe only what the current implementation guarantees.

## Testing Expectations

- For framework behavior changes, add or update focused tests under the relevant `tests/` area.
- Run `npm test` when behavior changes touch routing, schemas, static files, NoSQL, proxy, server, minificators, or shared utilities.
- For narrow documentation-only changes, syntax checks are usually enough when no JavaScript changed.
- If tests cannot be run, report exactly what was not run and why.

## Documentation Expectations

- Keep documentation practical and source-backed.
- Use short examples that can be mapped to real framework APIs.
- Avoid speculative comparisons with other frameworks unless needed for user-facing explanation.
- When changing APIs, update related documentation or examples in the same task.

## Git and Contribution Notes

- Contributions are expected through GitHub pull requests.
- If adding code, add tests when practical.
- If changing public APIs, update documentation.
- Do not overwrite unrelated local changes.
- Keep changes small, reviewable, and tied to the requested behavior.

