// api/polymarket.js
export default async function handler(req, res) {
  const url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&volume_num_min=50000';

  try {
    const response = await fetch(url);
    const data = await response.json();

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
}