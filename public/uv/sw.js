importScripts("/uv/uv.bunbun.js");
importScripts("/uv/concon.js");
importScripts(__uv$config.sw || "/uv/hanhan.js");

const sw = new UVServiceWorker();

self.addEventListener("fetch", (event) => {
    if (event.request.url.startsWith(location.origin + __uv$config.prefix))
        return event.respondWith(sw.fetch(event));
});
