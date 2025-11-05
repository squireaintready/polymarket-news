// pages/api/polymarket.js
export default async function handler(req, res) {
  const url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&offset=0&volume_num_min=50000';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    res.status(200).json(data);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
}