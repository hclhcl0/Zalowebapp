
async function testZaloProxy() {
  const url = 'https://zcdc.ksbtdanang.vn/api/zalo-proxy';
  
  const testCases = [
    { name: 'cover_type 0', cover: { cover_type: 0, photo_url: 'https://developers.zalo.me/web/static/zalo.png', status: 'show' } },
    { name: 'cover_type 1', cover: { cover_type: 1, photo_url: 'https://developers.zalo.me/web/static/zalo.png', status: 'show' } },
    { name: 'cover_type "photo"', cover: { cover_type: 'photo', photo_url: 'https://developers.zalo.me/web/static/zalo.png', status: 'show' } },
    { name: 'cover_type "image"', cover: { cover_type: 'image', photo_url: 'https://developers.zalo.me/web/static/zalo.png', status: 'show' } },
    { name: 'No cover_type', cover: { photo_url: 'https://developers.zalo.me/web/static/zalo.png', status: 'show' } },
    { name: 'No status', cover: { cover_type: 0, photo_url: 'https://developers.zalo.me/web/static/zalo.png' } },
    { name: 'Type 0, cover_view', cover: { cover_type: 0, photo_url: 'https://developers.zalo.me/web/static/zalo.png', cover_view: 'show' } },
  ];

  for (const tc of testCases) {
    const payload = {
      type: 'normal',
      title: 'API Test ' + Date.now(),
      description: 'API Test Description',
      cover: tc.cover,
      body: [{ type: 'text', content: 'hello' }],
      status: 'show'
    };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log(`\n--- Test: ${tc.name} ---`);
      console.log('Result:', data.response);
    } catch (e) {
      console.log(`\n--- Test: ${tc.name} ---`);
      console.log('Error:', e.message);
    }
  }
}

testZaloProxy();
