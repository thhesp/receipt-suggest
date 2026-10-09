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
    "kcalPerPortion": "650 kcal per serving",
    "images": ["pasta.jpg", "pasta-serving.jpg"],
    "thumbnail": "pasta.jpg",
    "ingredients": [{ "name": "Pasta", "amount": "500 g" }]
}
```

Local recipes have a folder under `src/assets/data/recipe/{id}/` containing
`recipe.json` and `recipe.html`. Angular renders the ingredient table and copy
feature from JSON; `recipe.html` contains description and preparation markup.
List user-facing image filenames in the optional `images` array. Set
`thumbnail` to one of those filenames when a card thumbnail is needed. Image
filenames must be local `.jpg`, `.jpeg`, or `.png` files in the recipe folder.
The Docker build copies only declared images, so unlisted images can remain as
source backups without being served.

External recipes use the same folder structure and set `externalUrl` in
`recipe.json`. The optional `kcalPerPortion` field is free-form and can
contain values such as `650 kcal per serving` or `25 g protein`.

The build generates the alphabetically sorted `recipes.json` manifest from the
declared thumbnails.

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
docker build --build-arg AUTH_CACHE_BUST=$(Get-Date -Format FileDateTime) --secret id=basic_auth_users,src=.htpasswd -t receipt-suggest:latest .
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
.\new-htpasswd.ps1 -Username alice -OutputFile ..\<private-data-repository>\.htpasswd
```

The helper uses a locally installed `htpasswd` executable when available;
otherwise it uses Docker Desktop's `httpd:2.4-alpine` image. Add another user
with `-Append`. After changing the password file, rebuild and redeploy the
image with a new `AUTH_CACHE_BUST` value as shown above; BuildKit does not
invalidate cached layers when a secret changes. For a local private-data test,
run the private data repository's build script; that script supplies the
generated file to Docker as a BuildKit secret.
`image-compressed` is an explicit static-only development target. It has no
user-state API or authentication and must not be used for a deployment.

### Recipe change pull requests

The production image can create reviewed recipe changes in a separate private
recipe repository. The Angular application never receives GitHub credentials.
Instead, the Node runtime exchanges GitHub App credentials for a short-lived
installation token for each recipe submission, creates a branch, commits the
changed recipe files, and opens a pull request. Merge the pull request to the
configured base branch to include the recipe in a subsequent deployment.

Create a GitHub App under **GitHub Settings > Developer settings > GitHub
Apps**, disable webhooks, and permit installations only on the owning account.
Grant it **Contents: Read and write** and **Pull requests: Read and write**
repository permissions, then install it only on the private recipe repository.
On the app's General page, copy the numeric **App ID** (not the Client ID) and
generate a private key. The numeric installation ID appears in the installation
settings URL: `https://github.com/settings/installations/<installation-id>`.

Configure the running container or deployment platform with these runtime
values. Do not use Docker build arguments or frontend environment files. Mark
only the private key as an encrypted secret:

| Variable | Value |
| --- | --- |
| `RECIPE_CHANGE_REPOSITORY` | Target repository in `owner/repository` form |
| `RECIPE_CHANGE_GITHUB_APP_ID` | Numeric GitHub App ID |
| `RECIPE_CHANGE_GITHUB_APP_INSTALLATION_ID` | Numeric installation ID for the target repository |
| `RECIPE_CHANGE_GITHUB_APP_PRIVATE_KEY` | Encrypted GitHub App private-key PEM; literal `\n` is also supported |
| `RECIPE_CHANGE_REPOSITORY_BRANCH` | Optional base branch; defaults to `main` |

Every user authenticated by the production nginx Basic Auth configuration may
submit a recipe change. The endpoint accepts same-origin JSON requests only,
validates recipe metadata and image uploads, and creates pull requests rather
than writing to `main`.
