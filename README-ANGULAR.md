# Receipt-Suggest - Angular 22+ Migration

A modern, fully-typed Angular 22+ application for suggesting and managing recipes. This is a complete migration from the original jQuery/Underscore based application to a modern Angular architecture following best practices.

## 🎯 Features

- **Recipe Overview**: Browse all recipes with tag-based filtering
- **Recipe Suggestions**: Get random recipe suggestions with a single click
- **Recipe Details**: View ingredients, descriptions, and images for each recipe
- **Tag Filtering**: Filter recipes by tags with smart filtering (disable unavailable tags)
- **Responsive Design**: Mobile-friendly interface using Bootstrap 5
- **Generated Recipe Manifest**: Build-time JSON manifest with explicit metadata and thumbnails
- **Image Gallery**: Interactive image viewing with modal display
- **Standalone Components**: Modern Angular 22+ architecture with standalone components

## 🏗️ Architecture

### Key Technologies
- **Angular 22+** - Latest Angular framework
- **TypeScript 6.0+** - Strict type checking
- **Bootstrap 5** - Responsive UI framework
- **RxJS** - Reactive programming with Observables
- **Docker** - Multi-stage build for production deployment

### Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── app/                    # Main application shell
│   │   ├── recipe-overview/        # Recipe list with filtering
│   │   ├── recipe-suggest/         # Random suggestions
│   │   ├── recipe-detail/          # Recipe details view
│   │   ├── recipe-card/            # Reusable recipe card
│   │   └── tag-selector/           # Tag filter component
│   ├── services/
│   │   ├── recipe.service.ts       # Recipe data and business logic
│   │   └── recipe-detail.service.ts # Recipe details loading
│   ├── models/
│   │   └── recipe.model.ts         # TypeScript interfaces
│   ├── utils/
│   │   └── recipe.util.ts          # Recipe utility functions
│   ├── app.routes.ts               # Routing configuration
│   └── app.component.ts            # Root component (under components/app)
├── index.html
├── main.ts                         # Bootstrap application
└── styles.scss                     # Global styles
```

### Service Layer

**RecipeService**
- `loadRecipes()`: Load the generated JSON manifest
- `getRecipesByTags(tags)`: Filter recipes by selected tags
- `getSuggestions(count)`: Get random suggestions

**RecipeDetailService**
- `loadIngredients(recipeLink)`: Load semantic ingredients from recipe HTML
- `loadDescription(recipeLink)`: Load recipe HTML description
- `loadImages(recipeLink)`: Find and load recipe images

### Components

**AppComponent** - Main shell with navigation
- Navbar with routing
- Router outlet for page content

**RecipeOverviewComponent** - Home page
- Display all recipes
- Tag-based filtering
- Reactive updates using RxJS

**RecipeSuggestComponent** - Suggestions page
- Generate random recipe suggestions
- Display as recipe cards

**RecipeDetailComponent** - Recipe details
- Show ingredients table
- Display description
- Interactive image gallery with modal

**RecipeCardComponent** - Reusable card
- Recipe name and tags
- Action button (link or external)
- Hover effects

**TagSelectorComponent** - Filter UI
- Display available tags
- Toggle selection
- Smart disable logic for unavailable tags
- Clear filters button

## 📦 Installation & Development

### Prerequisites
- Node.js 24+ (LTS recommended)
- npm 10+ or yarn 4+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm start
# Navigate to http://localhost:4200/

# Build for production
npm run build:prod

# Run tests
npm test

# Run linter
npm run lint
```

## 🗂️ Adding Your Own Recipes

### 1. Update recipes.metadata.json

Add entries to `src/assets/data/recipes.metadata.json`:

```json
[
  {
    "id": "chefkoch-nudeln-mal-anders",
    "name": "Pasta",
    "tags": ["PASTA", "VEGETARIAN"],
    "includeInSuggestions": true,
    "nutrition": "650 kcal per serving"
  },
  {
    "id": "https://example.com",
    "name": "External Recipe",
    "tags": ["QUICK"],
    "includeInSuggestions": true,
    "externalUrl": "https://example.com"
  }
]
```

The build generates the alphabetically sorted `recipes.json` manifest and adds
local thumbnails automatically. The generated file is not edited manually.

### 2. Add recipe.html

Each local recipe has one `recipe.html` file. Ingredients use semantic
attributes so they remain available to the copy-ingredients feature:

```html
<article>
  <section data-ingredients>
    <h2>Ingredients</h2>
    <ul>
      <li data-ingredient><span data-amount>500 g</span> <span data-name>Pasta</span></li>
    </ul>
  </section>
  <section>
    <h2>Preparation</h2>
    <p>Cook the pasta...</p>
  </section>
</article>
```

Recipe images remain alongside the HTML file as `img.jpg`, `img.png`, or
`img.jpeg`, followed by optional numbered images such as `img_1.jpg`.

Create a new local recipe with the helper:

```powershell
npm run recipe:new -- custom-pasta "Custom Pasta"
```

Validate the metadata and all local recipe folders before committing:

```powershell
npm run recipe:validate
```

## 🐳 Docker Build

### Development
```bash
docker build -t receipt-suggest:latest .
docker run -p 8080:80 receipt-suggest:latest
```

### Production with Image Compression
```bash
docker build -t receipt-suggest:optimized --target image-compressed .
docker run -p 80:8080 receipt-suggest:optimized
```

The Docker build uses multi-stage approach:
1. **Builder stage**: Compiles Angular application (Node.js)
2. **Base stage**: Serves via nginx with SPA routing
3. **Image-compressed stage**: Optimizes recipe images with ImageMagick

## 🔄 Migration from jQuery Version

### What Changed
- ✅ Modern Angular component-based architecture
- ✅ Reactive programming with RxJS Observables
- ✅ Strong TypeScript typing
- ✅ Standalone components (Angular 14+)
- ✅ Improved performance with OnPush change detection
- ✅ Better error handling
- ✅ Scalable and maintainable code

### What Stayed the Same
- Folder structure for recipes
- Bootstrap styling
- Feature functionality

## 🎨 Customization

### Styling
Global styles in `src/styles.scss`. Component-specific styles in component `.scss` files.

Key theme variables:
```scss
--primary-color: #007bff
--secondary-color: #6c757d
--success-color: #28a745
--danger-color: #dc3545
--info-color: #17a2b8
```

### Colors
- Update `src/styles.scss` for global color changes
- Component-specific changes in respective `.scss` files

## 🧪 Testing

```bash
# Run unit tests
npm test

# Generate coverage report
npm run test -- --code-coverage

# Run specific test file
npm test -- --include='**/recipe.service.spec.ts'
```

## 🚀 Best Practices Implemented

1. **Standalone Components** - All components are standalone
2. **Dependency Injection** - Services provided at root level
3. **Change Detection** - OnPush strategy where applicable
4. **Reactive Programming** - RxJS Observables for data flows
5. **Strong Typing** - Full TypeScript strict mode
6. **Error Handling** - Try-catch and observable error handling
7. **Memory Leaks** - Proper subscription management with takeUntil
8. **Code Splitting** - Lazy loading ready (routes configured)
9. **Performance** - Caching, efficient change detection
10. **Accessibility** - Semantic HTML, ARIA labels

## 📝 Future Enhancements

Ideas for extending the application:
- [ ] Recipe ratings and reviews
- [ ] Favorite recipes storage (localStorage)
- [x] Search by recipe name and tags
- [ ] Shopping list generator
- [ ] User-submitted recipes
- [ ] Recipe planning calendar
- [ ] PWA support with offline mode

## 📄 License

Same as original project

## 👤 Author

Migrated to Angular 22+ with best practices
Original project: [receipt-suggest](https://github.com/thhesp/receipt-suggest)

---

**Note**: This is the `angular-migration` branch. The original jQuery version remains on the `main` branch.
