/*global UVServiceWorker, __uv$config*/
/*
 * Vela service worker. Lives at the app root so its scope covers the whole
 * site. Ultraviolet routes any request under `__uv$config.prefix` through the
 * proxy; everything else falls through to the network untouched.
 */
importScripts("./uv/uv.bundle.js");
importScripts("./uv/uv.config.js");
importScripts("./uv/uv.sw.js");

const uv = new UVServiceWorker();

async function handleRequest(event) {
    if (uv.route(event)) {
        return await uv.fetch(event);
    }
    return await fetch(event.request);
}

self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event));
});
