/*global __uv$config, $scramjetLoadController, navigator, location*/
import { BareMuxConnection } from "../baremux/index.mjs";

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

// Public WISP server used to actually reach the wider internet. GitHub Pages
// cannot run a server itself, so traffic is tunnelled over WISP to a host that
// can. Swap this for your own server for reliability / privacy.
// Override at runtime in the browser console with:
//   localStorage.setItem("vela:wisp", "wss://your-server/wisp/")
const DEFAULT_WISP = "wss://vela-wisp.onrender.com/";
const WISP_URL = localStorage.getItem("vela:wisp") || DEFAULT_WISP;

const SEARCH_ENGINE = "https://www.google.com/search?q=%s";

// Base path of the deployment, e.g. "/" or "/Vela/". Everything is resolved
// against this so root and subpath (GitHub Pages) deploys both work.
const BASE = new URL(".", document.baseURI).pathname;

/* ------------------------------------------------------------------ *
 * Engine selection (Ultraviolet | Scramjet)
 * ------------------------------------------------------------------ */

// Ultraviolet is the default (fast, broad). Scramjet is the newer engine that
// runs many modern apps/games UV can't — pick it for sites that break under UV.
function getEngine() {
    return localStorage.getItem("vela:engine") === "scramjet" ? "scramjet" : "uv";
}

function setEngine(engine) {
    localStorage.setItem("vela:engine", engine);
    reflectEngineUI();
}

let scramjet = null; // ScramjetController, set during boot
let scramjetReady = false;

/* ------------------------------------------------------------------ *
 * URL helpers
 * ------------------------------------------------------------------ */

// Turn arbitrary input into a real URL: keep full URLs, add https:// to bare
// domains, and send everything else to the search engine.
function normalizeInput(raw) {
    const input = raw.trim();
    if (!input) return null;

    if (/^https?:\/\//i.test(input)) return input;

    const looksLikeDomain = /^[^\s.]+\.[^\s]+$/.test(input) && !input.includes(" ");
    if (looksLikeDomain) return "https://" + input;

    return SEARCH_ENGINE.replace("%s", encodeURIComponent(input));
}

// Build the proxied URL for the currently selected engine.
function toProxyUrl(url) {
    if (getEngine() === "scramjet" && scramjetReady) {
        // Scramjet's encodeUrl returns the full prefixed path.
        return scramjet.encodeUrl(url);
    }
    // Ultraviolet: prefix + xor-encoded target.
    return __uv$config.prefix + __uv$config.encodeUrl(url);
}

/* ------------------------------------------------------------------ *
 * Engine bootstrap
 * ------------------------------------------------------------------ */

let ready = false;
let bootError = null;

async function boot() {
    if (!navigator.serviceWorker) {
        throw new Error("This browser has no Service Worker support.");
    }
    if (!window.isSecureContext) {
        throw new Error("Vela must be served over HTTPS (or localhost).");
    }

    // 1. Register the unified proxy service worker at the app root scope.
    await navigator.serviceWorker.register("./sw.js", { scope: BASE });
    await navigator.serviceWorker.ready;

    // 2. Point bare-mux at the epoxy WISP transport. Both engines share it.
    //    Absolute URLs keep subpath deploys working.
    const workerUrl = new URL("baremux/worker.js", document.baseURI).href;
    const epoxyUrl = new URL("epoxy/index.mjs", document.baseURI).href;

    const conn = new BareMuxConnection(workerUrl);
    const current = await conn.getTransport();
    if (current !== epoxyUrl) {
        await conn.setTransport(epoxyUrl, [{ wisp: WISP_URL }]);
    }

    // 3. Initialise Scramjet's controller (writes its config to IndexedDB so
    //    the service worker can route /scramjet/ requests). Non-fatal: if it
    //    fails, Vela still runs on Ultraviolet.
    try {
        const { ScramjetController } = $scramjetLoadController();
        scramjet = new ScramjetController({
            prefix: BASE + "scramjet/",
            files: {
                wasm: BASE + "scram/scramjet.wasm.wasm",
                all: BASE + "scram/scramjet.all.js",
                sync: BASE + "scram/scramjet.sync.js",
            },
        });
        await scramjet.init();
        scramjetReady = true;
    } catch (err) {
        console.warn("[Vela] Scramjet init failed; Ultraviolet still available:", err);
    }

    ready = true;
}

/* ------------------------------------------------------------------ *
 * UI wiring
 * ------------------------------------------------------------------ */

const form = document.getElementById("search-form");
const field = document.getElementById("search-field");
const status = document.getElementById("status");
const engineButtons = document.querySelectorAll("[data-engine]");

function setStatus(text, kind = "") {
    status.textContent = text;
    status.dataset.kind = kind;
}

function reflectEngineUI() {
    const active = getEngine();
    engineButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.engine === active);
        btn.setAttribute("aria-pressed", String(btn.dataset.engine === active));
    });
}

async function launch(rawInput) {
    const target = normalizeInput(rawInput);
    if (!target) return;

    if (bootError) {
        setStatus("Engine failed to start: " + bootError.message, "error");
        return;
    }
    if (!ready) {
        setStatus("Warping up the engine…", "loading");
        try {
            await bootPromise;
        } catch (err) {
            setStatus("Engine failed to start: " + err.message, "error");
            return;
        }
    }

    if (getEngine() === "scramjet" && !scramjetReady) {
        setStatus("Scramjet unavailable — using Ultraviolet.", "loading");
    } else {
        setStatus("Entering orbit…", "loading");
    }
    location.href = toProxyUrl(target);
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    launch(field.value);
});

document.querySelectorAll("[data-launch]").forEach((el) => {
    el.addEventListener("click", () => launch(el.dataset.launch));
});

engineButtons.forEach((btn) => {
    btn.addEventListener("click", () => setEngine(btn.dataset.engine));
});

/* ------------------------------------------------------------------ *
 * Kick off
 * ------------------------------------------------------------------ */

reflectEngineUI();
setStatus("Igniting thrusters…", "loading");
const bootPromise = boot()
    .then(() => setStatus("Systems nominal. Enter a destination.", "ok"))
    .catch((err) => {
        bootError = err;
        setStatus("Engine failed to start: " + err.message, "error");
        console.error("[Vela] boot failed:", err);
    });
