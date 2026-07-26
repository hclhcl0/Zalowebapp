const CACHE_NAME = 'zcdc-pwa-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Chỉ xử lý GET request
  if (event.request.method !== 'GET') return;

  // Bỏ qua các request chrome-extension và non-http
  const url = event.request.url;
  if (!url.startsWith('http')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nếu có response hợp lệ thì trả về, đồng thời lưu vào cache
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
        }
        return response;
      })
      .catch(() => {
        // Khi mất mạng thì thử lấy từ cache
        return caches.match(event.request).then((cached) => {
          // Nếu không có cache thì trả về trang offline đơn giản
          return cached || new Response('Không có kết nối mạng. Vui lòng thử lại.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
