// public/api/polymarket.js
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  console.log('API route hit'); // ← Shows in Vercel logs

  const url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&offset=0';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    const markets = json.data || [];
    console.log('json: ', json)
    console.log('markets: ', markets)

    const filtered = markets.filter(m =>
      m.active &&
      !m.closed &&
      parseFloat(m.liquidity || 0) > 10000 &&
      parseFloat(m.volume || 0) > 50000
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(filtered);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed' });
  }
}
