# receipt-suggest

Angular application for browsing and suggesting recipes.

The overview can be filtered by name and tags. Multiple selected tags are
combined with **AND**, so recipes must contain every selected tag. The tag panel
shows the number of visible recipes and the total.

## Recipe data

Each recipe folder contains a `recipe.json` file with metadata and ingredients:

```json
{
    "id": "custom-pasta",
    "name": "Pasta",
    "tags": ["PASTA"],
    "includeInSuggestions": true,
    "nutrition": "650 kcal per serving",
    "ingredients": [{ "name": "Pasta", "amount": "500 g" }]
}
```

Local recipes have a folder under `src/assets/data/recipe/{id}/` containing
`recipe.json` and `recipe.html`. Angular renders the ingredient table and copy
feature from JSON; `recipe.html` contains description and preparation markup.
Images can be placed next to the files as `img.jpg`, `img.png`, or `img.jpeg`,
with optional numbered images such as `img_1.jpg`.

External recipes use the same folder structure and set `externalUrl` in
`recipe.json`. The optional `nutrition` field is free-form and can
contain values such as `650 kcal per serving` or `25 g protein`.

The build generates the alphabetically sorted `recipes.json` manifest and
detects local thumbnails automatically.

## Development

```powershell
npm install
npm start
```

For a production build, run `npm run build:prod`. It validates recipe metadata
and generates the recipe manifest automatically.

## Docker

```powershell
docker build -t receipt-suggest:latest .
docker run -p 8080:80 receipt-suggest:latest
```
