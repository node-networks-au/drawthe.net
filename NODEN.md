# NodeN fork of drawthe.net

Deployed at <https://draw.noden.com.au> (containers repo, `internal-services`).

## Branches

| Branch | Purpose |
|---|---|
| `main` | Mirror of `cidrblock/drawthe.net` `main`. Never commit here. |
| `noden` (default) | What we deploy: upstream `main` + our feature branches + the NodeN layer. |
| `fix/*`, `feat/*` | Generic changes, each based on upstream `main` so it can be PR'd upstream as is. |

Generic work goes on a topic branch off upstream `main` and is merged into `noden`.
NodeN-only changes are committed straight to `noden`:

- `src/styles/noden.css` (imported in `src/app/main.ts`) — theme
- `public/noden/` — logo and favicons
- `index.html`, `render.html`, `fullscreen.html` — titles, favicons, logo, the
  `drawthe-preamble` meta tag
- `.github/workflows/noden-build-image.yml` — test + push
  `ghcr.io/node-networks-au/drawthe.net`
- this file

## House style (preamble)

`<meta name="drawthe-preamble" content="brand/noden.yaml">` loads the NodeN anchors.
The file is **not** in this repo: the deployment mounts it from the containers repo
(`docs/diagrams/_brand/noden.yaml`) as a ConfigMap at `dist/brand/`, so the brand has
a single source next to the diagrams. For local dev, copy it to `public/brand/noden.yaml`
(git-ignored).

## Syncing upstream

```sh
git fetch upstream
git push origin upstream/main:main
git checkout noden && git merge upstream/main
npm ci && npm test && npm run build
```

Once an upstream PR is merged, the topic branch can be deleted; its commits arrive
through `upstream/main`.
