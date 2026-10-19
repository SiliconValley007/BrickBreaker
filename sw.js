const VER = "__BUILD__";
const CORE = /*__PRECACHE__*/[];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VER).then(function (c) {
      return c.addAll(CORE);
    }).then(function () {
      return self.skipWaiting();
    }),
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (k) {
          if (k !== VER) return caches.delete(k);
        }),
      );
    }).then(function () {
      return self.clients.claim();
    }),
  );
});

function sameOrigin(req) {
  try {
    return new URL(req.url).origin === self.location.origin;
  } catch (e) {
    return false;
  }
}

function cachePut(req, res) {
  if (!res || res.status !== 200 || res.type === "opaque") return res;
  var copy = res.clone();
  caches.open(VER).then(function (c) {
    c.put(req, copy);
  });
  return res;
}

function offlineIndex() {
  return caches.match(new URL("./index.html", self.registration.scope).href).then(function (hit) {
    return hit || caches.match(new URL("./", self.registration.scope).href);
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET" || !sameOrigin(req)) return;
  var nav = req.mode === "navigate";
  var dest = req.destination;
  var fresh = nav || dest === "document" || dest === "script" || dest === "style";
  if (fresh) {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          return cachePut(req, res);
        })
        .catch(function () {
          return caches.match(req).then(function (hit) {
            if (hit) return hit;
            return nav ? offlineIndex() : Response.error();
          });
        }),
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (hit) {
      var net = fetch(req)
        .then(function (res) {
          return cachePut(req, res);
        })
        .catch(function () {
          return hit || Response.error();
        });
      return hit || net;
    }),
  );
});

self.addEventListener("message", function (e) {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});
