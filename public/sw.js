const CACHE_NAME = "student-hub-shell-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(["/manifest.webmanifest", "/icons/student-hub.svg"]);
      const shellResponse = await fetch("/");
      if (!shellResponse.ok) throw new Error("Could not cache the public app shell.");
      const shellHtml = await shellResponse.clone().text();
      await cache.put("/", shellResponse);
      const assets = new Set(
        [...shellHtml.matchAll(/(?:src|href)=["']([^"']*\/assets\/[^"']+)["']/g)]
          .map((match) => match[1])
          .filter(Boolean),
      );
      await Promise.all([...assets].map(async (asset) => {
        const response = await fetch(asset);
        if (response.ok) await cache.put(asset, response);
      }));
    }),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
    .then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("student-hub-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    )),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedShell = await caches.match("/");
        return cachedShell ?? new Response("Student Hub is offline.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })),
    );
  }
});
