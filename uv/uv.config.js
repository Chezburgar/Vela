/*global Ultraviolet*/
/*
 * Vela — Ultraviolet configuration.
 *
 * Paths are computed relative to wherever this file is served from, so the
 * same build works at a domain root (user.github.io) OR a project subpath
 * (user.github.io/repo/) with no edits. `__uvBase` resolves to the directory
 * that contains index.html / sw.js in both the page and the service worker.
 */
const __uvBase = self.location.pathname.replace(/[^/]*$/, "");

self.__uv$config = {
    prefix: __uvBase + "service/",
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: __uvBase + "uv/uv.handler.js",
    client: __uvBase + "uv/uv.client.js",
    bundle: __uvBase + "uv/uv.bundle.js",
    config: __uvBase + "uv/uv.config.js",
    sw: __uvBase + "uv/uv.sw.js",
};
