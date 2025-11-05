// scripts/fetch-markets.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const url = 'https://gamma-api.polymarket.com/markets?limit=100&volume_num_min=50000';

fetch(url)
  .then(res => res.json())
  .then(json => {
    const markets = json.data || [];
    const filtered = markets.filter(m =>
      m.active &&
      !m.closed &&
      parseFloat(m.liquidity || 0) > 10000
    );

    const outputPath = path.join(__dirname, '../public/api/polymarket.json');
    fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));
    console.log('Markets saved to public/api/polymarket.json');
  })
  .catch(err => {
    console.error('Failed to fetch markets:', err);
    process.exit(1);
  });