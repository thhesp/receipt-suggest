# Receipt Suggest

## Commands

- `npm start` generates `src/assets/data/recipes.json` and starts the Angular development server.
- `npm run recipe:validate` validates all recipe folders and metadata.
- `npm run generate:manifest` regenerates the alphabetically sorted recipe manifest; run it after changing recipe metadata or thumbnails, and include the updated manifest in the change.
- `npm run recipe:new -- <id> "<name>"` creates a local recipe folder with starter metadata and HTML.
- `npm run build` builds with the default production configuration. `npm run build:prod` additionally validates recipe data and regenerates the manifest first.
- `npm test -- --watch=false` runs the Karma/Jasmine suite once. To run one spec, use `npm test -- --watch=false --include src/app/path/to/example.spec.ts`. There are currently no committed spec files.
- `npm run lint` invokes Angular's lint command; `angular.json` currently has no `lint` target, so it will not run a configured linter.

## Change workflow

- Create new code changes on a dedicated branch, never directly on `main`.
- Before creating the branch, update the local `main` branch from the latest remote `main`. Keep the branch focused so the resulting pull request clearly shows the intended changes.

## Architecture

- This is an Angular 22 standalone-component application. `src/main.ts` bootstraps the root component with router, animations, and `HttpClient`; `src/app/app.routes.ts` maps the overview (`/`), suggestions (`/suggest`), and internal recipe detail (`/recipe/:link`) screens.
- `RecipeService` loads and caches the generated `assets/data/recipes.json` manifest. The overview combines a case-insensitive name/tag search with AND-based selected-tag filtering; the suggestion screen randomly samples only recipes with `includeInSuggestions: true`.
- Recipe cards use `externalUrl` to render an external link. Otherwise they navigate to the local detail route, where `RecipeDetailService` reads that recipe folder's `recipe.json` for ingredients and `recipe.html` for description, strips any `[data-ingredients]` section, and probes for optional images.
- The production image builds the Angular application and serves `dist/receipt-suggest/browser` through nginx. Recipe assets are runtime HTTP requests, so do not change nginx fallback behavior in a way that returns the Angular app shell for missing recipe files; the detail service explicitly rejects that response.

## Recipe data conventions

- Each `src/assets/data/recipe/<folder>/recipe.json` must provide `id`, `name`, `tags`, `includeInSuggestions`, and an `ingredients` array. IDs must be unique. Tags are stored as uppercase display/filter values.
- Local recipes require `recipe.html`; it supplies description/preparation markup, while `recipe.json` is the source of truth for the ingredient table and copy action. Use `data-ingredients` only for legacy embedded ingredient markup that should be removed from the displayed description.
- External recipes still use a recipe folder and valid metadata, but set an absolute `externalUrl`; no `recipe.html` is required and the manifest does not assign a thumbnail.
- Local thumbnails are discovered by the manifest generator from `img.jpg`, `img.png`, or `img.jpeg`. The detail page also supports sequential `img_1` through `img_9` files using those extensions.

## Angular development skill

- Use the installed `angular-developer` skill in `.agents/skills/angular-developer/` when designing or changing Angular architecture, components, services, HTTP communication, reactivity, forms, routing, accessibility, styling, tests, or CLI tooling.
- Follow the skill's task-specific references, while preserving established repository behavior and the existing RxJS-based service/component patterns unless intentionally migrating them.

## Component conventions

- Components are standalone and declare their Angular/component imports in the `@Component` metadata. Styles use SCSS and Bootstrap is included globally.
- Components that subscribe to long-lived observables use a `destroy$` subject with `takeUntil` and complete it in `ngOnDestroy`. OnPush components explicitly call `ChangeDetectorRef.markForCheck()` after deferred state changes.
- Keep recipe-facing state typed with the `Recipe`, `RecipeDetail`, and `Ingredient` models in `src/app/models/recipe.model.ts`; service calls return RxJS observables except optional image discovery, which is asynchronous and cached by `RecipeDetailService`.
