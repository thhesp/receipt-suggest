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

### Private data and user state

The `private-user-state-image` Docker target accepts private recipe data and
through a separate `private-data` build context. It runs the user-state API and
uses the authenticated nginx configuration in `digital_ocean.conf`. It stores
its files in
`/var/lib/receipt-suggest-user-state`. Mount a named volume or host directory
at that path to retain favorites, cooking plans, and shopping lists across
container replacement. The target requires a `basic_auth_users` BuildKit
secret containing an `htpasswd` file.

Create the password file without storing it in this repository:

```powershell
.\new-htpasswd.ps1 -Username alice -OutputFile ..\my-recipes\.htpasswd
```

The helper uses a locally installed `htpasswd` executable when available;
otherwise it uses Docker Desktop's `httpd:2.4-alpine` image. Add another user
with `-Append`. For a local private-data test, run `..\my-recipes\build.ps1`;
that script supplies the generated file to Docker as a BuildKit secret.
