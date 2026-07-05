/*global UVServiceWorker, __uv$config, $scramjetLoadWorker*/
/*
 * Vela service worker — one worker, two engines.
 *
 * Ultraviolet handles requests under `/service/`; Scramjet (UV's newer sibling,
 * which runs many modern apps/games UV can't) handles requests under
 * `/scramjet/`. Everything else falls through to the network. Only one service
 * worker may control a scope, so both engines are routed from here.
 */
importScripts("./uv/uv.bundle.js");
importScripts("./uv/uv.config.js");
importScripts("./uv/uv.sw.js");
importScripts("./scram/scramjet.all.js");

const uv = new UVServiceWorker();
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
    // Scramjet first — it reads its live config (prefix/flags) from IndexedDB,
    // which the page's controller writes on load. Guarded so that if Scramjet
    // was never initialised, UV and passthrough still work.
    try {
        await scramjet.loadConfig();
        if (scramjet.route(event)) {
            return await scramjet.fetch(event);
        }
    } catch (err) {
        // Scramjet not ready yet — ignore and fall through.
    }

    if (uv.route(event)) {
        return await uv.fetch(event);
    }

    return await fetch(event.request);
}

self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event));
});
