// api/index.js
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

app.get('/polymarket', async (req, res) => {
  console.log('API hit!'); // ← Shows in Vercel logs

  const url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&offset=0';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    const markets = json.data || [];

    const filtered = markets.filter(m =>
      m.active &&
      !m.closed &&
      parseFloat(m.liquidity || 0) > 10000 &&
      parseFloat(m.volume || 0) > 50000
    );

    res.json(filtered);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).json({ error: 'Failed' });
  }
});

module.exports = app;