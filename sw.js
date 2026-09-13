importScripts("./offline-manifest.js");
const CACHE = "mido-shell-" + self.OFFLINE_VERSION;
async function prepareCache() {
  const cache = await caches.open(CACHE);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < self.OFFLINE_FILES.length) {
        const path = self.OFFLINE_FILES[cursor++];
        if (await cache.match(path)) continue;
        const response = await fetch(new Request(path, { cache: "reload" }));
        if (!response.ok || response.redirected)
          throw new Error("Offline file unavailable: " + path);
        await cache.put(path, response);
      }
    }),
  );
}
self.addEventListener("install", (event) =>
  event.waitUntil(
    (async () => {
      await prepareCache();
      await self.skipWaiting();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data !== "PREPARE_OFFLINE" || !event.ports[0]) return;
  event.waitUntil(
    prepareCache().then(
      () => event.ports[0].postMessage({ ready: true }),
      () => event.ports[0].postMessage({ ready: false }),
    ),
  );
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys())
        if (key.startsWith("mido-shell-") && key !== CACHE)
          await caches.delete(key);
      await self.clients.claim();
    })(),
  ),
);
async function audioRange(request, response) {
  const range = request.headers.get("range");
  if (!range) return response;
  const data = await response.arrayBuffer();
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return new Response(null, { status: 416 });
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, data.byteLength - Number(match[2]));
  const end =
    match[1] && match[2]
      ? Math.min(Number(match[2]), data.byteLength - 1)
      : data.byteLength - 1;
  if (start > end || start >= data.byteLength)
    return new Response(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${data.byteLength}` },
    });
  return new Response(data.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": "audio/mpeg",
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${data.byteLength}`,
      "Content-Length": String(end - start + 1),
    },
  });
}
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.pathname.startsWith('/api/') ||
    url.origin !== self.location.origin ||
    request.cache === "no-store"
  )
    return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Serve one internally consistent application version, even during an update.
      const base = new URL("./", self.location.href);
      if (request.mode === "navigate" && url.pathname === base.pathname)
        return (await cache.match("index.html")) || fetch(request);
      const cached =
        (await cache.match(url.href)) ||
        (await (await caches.open("mido-wordpack-audio-v1")).match(url.href));
      if (cached)
        return url.pathname.endsWith(".mp3")
          ? audioRange(request, cached)
          : cached;
      return fetch(request);
    })(),
  );
});
