#!/usr/bin/env node
/*
 Simple test runner to verify /meta/anilist/watch/:id across providers
 Usage:
   node scripts/test-watch.js [episodeId]
 Env:
   BASE_URL=http://localhost:10000 (default)
*/
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 10000}`;
const EPISODE_ID = process.argv[2] || '1';
const PROVIDERS = ['zoro', 'gogoanime'];

(async () => {
  console.log(`[test-watch] Base URL: ${BASE_URL}`);
  console.log(`[test-watch] Episode ID: ${EPISODE_ID}`);

  for (const provider of PROVIDERS) {
    const url = `${BASE_URL}/meta/anilist/watch/${encodeURIComponent(EPISODE_ID)}?provider=${provider}`;
    process.stdout.write(`→ Testing provider: ${provider} ... `);
    try {
      const { data } = await axios.get(url, { timeout: 20000 });
      const sources = Array.isArray(data?.sources) ? data.sources : [];
      const playable = sources.filter((s) => s?.isM3U8 || /\.m3u8(\?|$)/i.test(s?.url || '') || /\.mp4(\?|$)/i.test(s?.url || ''));
      console.log(`OK (${sources.length} sources, ${playable.length} playable)`);
      if (playable.length > 0) {
        console.log(`  First playable:`, playable[0]);
      } else {
        console.log(`  No playable sources returned.`);
      }
    } catch (err) {
      console.log('FAILED');
      console.error(`  Error:`, err?.response?.data || err?.message || String(err));
    }
  }
})();
