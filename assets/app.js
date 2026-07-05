/*global __uv$config, navigator, location*/
import { BareMuxConnection } from "../baremux/index.mjs";

/* ------------------------------------------------------------------ *
 * Config
 * ------------------------------------------------------------------ */

// Public WISP server used to actually reach the wider internet. GitHub Pages
// cannot run a server itself, so traffic is tunnelled over WISP to a host that
// can. Swap this for your own server for reliability / privacy.
// Override at runtime in the browser console with:
//   localStorage.setItem("vela:wisp", "wss://your-server/wisp/")
const DEFAULT_WISP = "wss://wisp.mercurywork.shop/";
const WISP_URL = localStorage.getItem("vela:wisp") || DEFAULT_WISP;

const SEARCH_ENGINE = "https://www.google.com/search?q=%s";

/* ------------------------------------------------------------------ *
 * URL helpers
 * ------------------------------------------------------------------ */

// Turn arbitrary input into a real URL: keep full URLs, add https:// to bare
// domains, and send everything else to the search engine.
function normalizeInput(raw) {
    const input = raw.trim();
    if (!input) return null;

    // Already a full URL.
    if (/^https?:\/\//i.test(input)) return input;

    // Looks like a domain (has a dot, no spaces) -> assume https.
    const looksLikeDomain = /^[^\s.]+\.[^\s]+$/.test(input) && !input.includes(" ");
    if (looksLikeDomain) return "https://" + input;

    // Otherwise: search.
    return SEARCH_ENGINE.replace("%s", encodeURIComponent(input));
}

function toProxyUrl(url) {
    // __uv$config comes from uv/uv.config.js (loaded in index.html).
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

    // 1. Register the proxy service worker at the app root scope.
    await navigator.serviceWorker.register("./sw.js", {
        scope: __uv$config.prefix.replace(/service\/$/, ""),
    });
    await navigator.serviceWorker.ready;

    // 2. Point bare-mux at the epoxy WISP transport.
    //    bare-mux requires absolute URLs, so resolve against the page origin —
    //    this keeps subpath (user.github.io/repo/) deploys working.
    const workerUrl = new URL("baremux/worker.js", document.baseURI).href;
    const epoxyUrl = new URL("epoxy/index.mjs", document.baseURI).href;

    const conn = new BareMuxConnection(workerUrl);
    const current = await conn.getTransport();
    if (current !== epoxyUrl) {
        await conn.setTransport(epoxyUrl, [{ wisp: WISP_URL }]);
    }

    ready = true;
}

/* ------------------------------------------------------------------ *
 * UI wiring
 * ------------------------------------------------------------------ */

const form = document.getElementById("search-form");
const field = document.getElementById("search-field");
const status = document.getElementById("status");

function setStatus(text, kind = "") {
    status.textContent = text;
    status.dataset.kind = kind;
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
        // Wait until boot resolves (or throws).
        try {
            await bootPromise;
        } catch (err) {
            setStatus("Engine failed to start: " + err.message, "error");
            return;
        }
    }

    setStatus("Entering orbit…", "loading");
    location.href = toProxyUrl(target);
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    launch(field.value);
});

// Quick-launch chips.
document.querySelectorAll("[data-launch]").forEach((el) => {
    el.addEventListener("click", () => launch(el.dataset.launch));
});

/* ------------------------------------------------------------------ *
 * Kick off
 * ------------------------------------------------------------------ */

setStatus("Igniting thrusters…", "loading");
const bootPromise = boot()
    .then(() => setStatus("Systems nominal. Enter a destination.", "ok"))
    .catch((err) => {
        bootError = err;
        setStatus("Engine failed to start: " + err.message, "error");
        console.error("[Vela] boot failed:", err);
    });
