// scripts/generate-ai.js
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Missing REACT_APP_GEMINI_API_KEY');
  process.exit(1);
}

const markets = JSON.parse(fs.readFileSync(path.join(__dirname, '../public/api/polymarket.json'), 'utf8'));

const now = new Date();
const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;

const generate = async (market) => {
  const cacheKey = market.id;
  const filePath = path.join(__dirname, `../public/ai/${cacheKey}.json`);

  if (fs.existsSync(filePath)) {
    console.log(`Skipping ${cacheKey} (already exists)`);
    return;
  }

  const formatNumber = (num) => Number(num).toLocaleString();

  const prompt = `Write a 600-word professional article with a subtle Joe Rogan tone about this Polymarket market:

"${market.question}"

Current odds: ${market.odds}
24h Volume: $${formatNumber(market.volume)}
Liquidity: $${formatNumber(market.liquidity)}

TONE: Professional, clear, analytical. Subtle Rogan vibe: curious, direct, conversational. Use "you know", "here's the thing", "what's interesting", "let me break it down". NO swearing, NO "dude", NO exaggeration.

REQUIREMENTS:
1. Start with a PUNCHY, CATCHY HEADLINE (1 line, ALL CAPS, no quotes)
2. After headline, add: "Written on ${dateStr}"
3. Then full article in plain text (NO markdown)
4. Cover: current odds, market dynamics, key drivers, future risks, final assessment
5. End with a strong, thoughtful conclusion

Output:
HEADLINE
Written on MM/DD/YY
[blank line]
Article body...`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Failed.';
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    const title = lines[0] || 'NO TITLE';
    const content = lines.slice(1).join('\n').trim();

    const articleObj = { title, content, date: dateStr };
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(articleObj, null, 2));
    console.log(`Saved article: ${title}`);
  } catch (err) {
    console.error(`Failed for ${cacheKey}:`, err.message);
  }
};

(async () => {
  for (const market of markets) {
    await generate(market);
  }
  console.log('All AI articles generated');
})();