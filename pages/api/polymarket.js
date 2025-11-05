// // pages/api/polymarket.js
// export default async function handler(req, res) {
//   const url = 'https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=100&volume_num_min=50000';

//   try {
//     const response = await fetch(url);
//     if (!response.ok) throw new Error(`HTTP ${response.status}`);

//     const data = await response.json();

//     // Allow all origins
//     res.setHeader('Access-Control-Allow-Origin', '*');
//     res.setHeader('Access-Control-Allow-Methods', 'GET');
//     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//     res.status(200).json(data);
//   } catch (error) {
//     console.error('API Error:', error.message);
//     res.status(500).json({ error: 'Failed to fetch markets' });
//   }
// }

// pages/api/polymarket.js
export default async function handler(req, res) {
  const url = 'https://api.polymarket.com/v0/markets?active=true&closed=false&limit=100';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();

    // Filter in backend (volume > 50k, liquidity > 10k)
    const filtered = data.filter(m => 
      m.active && 
      !m.closed && 
      parseFloat(m.volume || 0) > 50000 && 
      parseFloat(m.liquidity || 0) > 10000
    );

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(filtered);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
}