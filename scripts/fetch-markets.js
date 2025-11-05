// scripts/fetch-markets.js
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const url = 'https://gamma-api.polymarket.com/markets?limit=100&volume_num_min=10000&closed=false&liquidity_num_min=10000';

console.log('Fetching from:', url);

fetch(url)
  .then(res => {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })
  .then(json => {
    const markets = json || [];
    console.log(`Found ${markets.length} markets`);
    json.forEach(e=>console.log(e.active))

    const filtered = markets.filter(m =>
      m.active &&
      m.closed == false &&
      parseFloat(m.volumeNum || 0) > 10000
    );

    console.log(`Filtered to ${filtered.length} markets`);

    const outputPath = path.resolve(__dirname, '../public/api/polymarket.json');
    console.log('Writing to:', outputPath);

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));

    console.log('SUCCESS: polymarket.json updated');
  })
  .catch(err => {
    console.error('FETCH FAILED:', err.message);
    process.exit(1);
  });