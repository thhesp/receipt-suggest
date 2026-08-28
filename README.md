# receipt-suggest

A simple Angular application for browsing and suggesting recipes.

## Recipe data

Recipe metadata is stored in `src/assets/data/recipes.metadata.json`:

```json
[
  {
    "id": "custom-pasta",
    "name": "Pasta",
    "tags": ["PASTA"],
    "includeInSuggestions": true,
    "nutrition": "650 kcal per serving"
  }
]
```

Local recipes have a folder under `src/assets/data/recipe/{id}/` containing
one `recipe.html` file. Ingredients use `data-ingredient`, `data-name`, and
`data-amount` attributes so the application can render and copy them. Images
can be placed next to the HTML file as `img.jpg`, `img.png`, or `img.jpeg`,
with optional numbered images such as `img_1.jpg`.

External recipes do not need a folder. Set both `id` and `externalUrl` to the
external recipe URL. The optional `nutrition` field is free-form and can
contain values such as `650 kcal per serving` or `25 g protein`.

The build generates the alphabetically sorted `recipes.json` manifest and
detects local thumbnails automatically.

## Development

```powershell
npm install
npm start
```

## Docker

```powershell
docker build -t receipt-suggest:latest .
docker run -p 8080:80 receipt-suggest:latest
```
