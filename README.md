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
.\new-htpasswd.ps1 -Username alice
docker build --secret id=basic_auth_users,src=.htpasswd -t receipt-suggest:latest .
docker run --rm -p 8080:8080 --volume receipt-suggest-user-state:/var/lib/receipt-suggest-user-state receipt-suggest:latest
```

### Private data and user state

The `user-state-image` Docker target is a working authenticated production
example that runs the user-state API using `prod.conf`. The
`private-user-state-image` target accepts private recipe data and a replacement
`prod.conf` through a separate `private-data` build context, so private
deployments can provide their own nginx settings. Both store user state in
`/var/lib/receipt-suggest-user-state`. Mount a named volume or host directory
at that path to retain favorites, cooking plans, and shopping lists across
container replacement. Basic Auth is configured at the server level, so every
page, asset, and API request requires an authenticated user. The target
requires a `basic_auth_users` BuildKit secret containing an `htpasswd` file.

Create the password file without storing it in this repository:

```powershell
.\new-htpasswd.ps1 -Username alice -OutputFile ..\my-recipes\.htpasswd
```

The helper uses a locally installed `htpasswd` executable when available;
otherwise it uses Docker Desktop's `httpd:2.4-alpine` image. Add another user
with `-Append`. For a local private-data test, run `..\my-recipes\build.ps1`;
that script supplies the generated file to Docker as a BuildKit secret.
`image-compressed` is an explicit static-only development target. It has no
user-state API or authentication and must not be used for a deployment.
