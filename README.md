# 🛰️ Vela

A sleek, space-themed web proxy powered by [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet).
Fully static — the whole thing runs from GitHub Pages.

![status](https://img.shields.io/badge/hosting-static-8b7bff) ![proxy](https://img.shields.io/badge/engine-Ultraviolet%203.2-4de0ff)

---

## How it works (and the one catch)

Ultraviolet runs almost entirely in your browser via a **service worker** that
rewrites pages. The one thing a browser can't do by itself is open raw
connections to arbitrary sites — that needs a server.

GitHub Pages is **static-only**, so Vela tunnels that traffic over
[**WISP**](https://github.com/MercuryWorkshop/wisp-protocol) to an external
server using the `epoxy` transport. This means:

- ✅ The entire UI + proxy engine is hosted free on GitHub Pages.
- ⚠️ Actually reaching websites relies on a **WISP server**. Vela ships with a
  public default, but public servers go down and see your traffic. For anything
  real, **run your own** (see below).

---

## Deploy to GitHub Pages

1. Create a repo and push these files (index.html must be at the repo root).
2. Repo **Settings → Pages**:
   - **Source: Deploy from a branch** → `main` / `/ (root)`, **or**
   - **Source: GitHub Actions** (uses the included `.github/workflows/deploy.yml`).
3. Open `https://<you>.github.io/<repo>/`.

Paths are computed relative to wherever the site is served, so it works at a
domain root *or* a `/repo/` subpath with no edits.

> The `.nojekyll` file is required — it stops GitHub from stripping the vendored
> asset folders. Don't delete it.

## Run locally

Service workers need HTTPS or `localhost`:

```bash
npx serve .        # or:  python -m http.server 8080
```

Then open the printed `http://localhost:...` URL.

---

## Use your own WISP server (recommended)

Public WISP servers are shared, throttled, and can read your traffic. Host your
own with [Wisp-Server-Node](https://github.com/MercuryWorkshop/wisp-server-node)
or [epoxy-server](https://github.com/MercuryWorkshop/epoxy-tls) on any host that
allows a persistent process (Render, Fly.io, a VPS — **not** GitHub Pages).

Then point Vela at it. Either edit the default in
[`assets/app.js`](assets/app.js):

```js
const DEFAULT_WISP = "wss://your-server.example/wisp/";
```

…or override it live from the browser console (persists per-browser):

```js
localStorage.setItem("vela:wisp", "wss://your-server.example/wisp/");
```

---

## Project layout

```
index.html            Landing page / launcher
sw.js                 Service worker (app-root scope)
assets/
  app.js              SW registration, WISP transport, search → warp
  style.css           Space theme
  starfield.js        Animated canvas backdrop
  favicon.svg
uv/                   Ultraviolet 3.2.10 (bundle, client, handler, sw, config)
baremux/             bare-mux (transport multiplexer + worker)
epoxy/               epoxy WISP transport (WASM inlined)
.github/workflows/   Optional Pages deploy action
.nojekyll
```

To update the engine: `npm i @titaniumnetwork-dev/ultraviolet @mercuryworkshop/bare-mux @mercuryworkshop/epoxy-transport`
and copy the `dist/` files back into `uv/`, `baremux/`, and `epoxy/`.

---

## Legal

Provided for education and legitimate privacy/censorship-circumvention use.
Follow your network's acceptable-use policy and local law. Ultraviolet is
MIT-licensed by TitaniumNetwork.
