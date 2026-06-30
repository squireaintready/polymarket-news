# polymarket-news

An AI-generated news desk for prediction markets. It pulls the most active markets from **Polymarket**, then uses **Google Gemini** to write a short analytical article for each one — turning live betting odds into readable market commentary.

**Live → [polymarket-news.vercel.app](https://polymarket-news.vercel.app/)**

> The prototype that became **[Crowdtells](https://crowdtells.com)**.

## How it works

A static build-time pipeline does the heavy lifting — no backend server required:

1. **`scripts/fetch-markets.js`** — pulls the top active markets from Polymarket's Gamma API (filtered to >$10k volume and liquidity) into `public/api/polymarket.json`.
2. **`scripts/generate-ai.js`** — sends each market's question, odds, volume and liquidity to Gemini and caches a ~600-word article to `public/ai/<id>.json` (skips markets already generated).
3. **React app** (`src/App.js`) — renders the market list with expandable AI analysis, cached client-side in `localStorage`.

## Stack

React (CRA) · React Router · Google Generative AI (Gemini) · Polymarket Gamma API · deployed on Vercel

## Run locally

```bash
npm install
echo "REACT_APP_GEMINI_API_KEY=your_key" > .env
npm run fetch-markets   # refresh market data
npm run generate-ai     # generate the AI articles
npm start               # http://localhost:3000
```

`npm run update` re-fetches markets and commits the refreshed data in one step.
