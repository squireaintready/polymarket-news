import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import './App.css';

function Home() {
  const [markets, setMarkets] = useState([]);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [articleData, setArticleData] = useState({});
  const [loadingStates, setLoadingStates] = useState({});

  const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;

  // Load cache
  useEffect(() => {
    const cached = localStorage.getItem('polymarket_ai_cache');
    if (cached) setAiAnalysis(JSON.parse(cached));
    const articles = localStorage.getItem('polymarket_articles');
    if (articles) setArticleData(JSON.parse(articles));
  }, []);

  // Save cache
  useEffect(() => {
    localStorage.setItem('polymarket_ai_cache', JSON.stringify(aiAnalysis));
  }, [aiAnalysis]);

  useEffect(() => {
    localStorage.setItem('polymarket_articles', JSON.stringify(articleData));
  }, [articleData]);

  // Fetch markets
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await axios.get('/api/polymarket.json');
        const data = Array.isArray(res.data) ? res.data : [];
        setMarkets(data);
        localStorage.setItem('polymarket_markets', JSON.stringify(data));
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load markets.');
      }
    };
    fetchMarkets();
  }, []);

  const formatNumber = (num) => num.toLocaleString();

  // Parse outcomes and prices
  const parseMarket = (m) => {
    let outcomes = [];
    let prices = [];
    try {
      outcomes = JSON.parse(m.outcomes || '[]');
      prices = JSON.parse(m.outcomePrices || '[]').map(p => parseFloat(p));
    } catch (e) {
      outcomes = ['Yes', 'No'];
      prices = [0.5, 0.5];
    }

    const maxIndex = prices.indexOf(Math.max(...prices));
    const favored = outcomes[maxIndex] || 'Unknown';
    const prob = (prices[maxIndex] * 100).toFixed(1);

    return {
      id: m.id,
      question: m.question,
      favored: `${favored}: ${prob}%`,
      volume: Math.round(parseFloat(m.volume || 0)),
      liquidity: Math.round(parseFloat(m.liquidity || 0)),
      change: Math.round(parseFloat(m.oneHourPriceChange || 0))
    };
  };

  const filtered = markets
    .map(parseMarket)
    .filter(m => m.volume > 50000 && m.liquidity > 10000)
    .sort((a, b) => b.volume - a.volume);

  const loadArticle = async (market) => {
    const cacheKey = market.id;

    try {
      const res = await fetch(`/ai/${cacheKey}.json`);
      if (res.ok) {
        const article = await res.json();
        setArticleData(prev => ({ ...prev, [cacheKey]: article }));
        setLoadingStates(prev => ({ ...prev, [cacheKey]: 'done' }));
        return;
      }
    } catch (err) {}

    setLoadingStates(prev => ({ ...prev, [cacheKey]: 'article' }));

    const now = new Date();
    const dateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${String(now.getFullYear()).slice(-2)}`;

    const prompt = `Write a 600-word professional article with a subtle Joe Rogan tone about this Polymarket market:

"${market.question}"

Current odds: ${market.favored}
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
      setArticleData(prev => ({ ...prev, [cacheKey]: articleObj }));
    } catch (err) {
      const fallback = { title: 'ARTICLE ERROR', content: 'Failed to load.', date: dateStr };
      setArticleData(prev => ({ ...prev, [cacheKey]: fallback }));
    }

    setLoadingStates(prev => ({ ...prev, [cacheKey]: 'done' }));
  };

  const handleCardClick = async (market) => {
    const cacheKey = market.id;
    const currentData = market.favored;

    const newExpanded = expanded === cacheKey ? null : cacheKey;
    setExpanded(newExpanded);

    if (newExpanded && !aiAnalysis[cacheKey]) {
      setLoadingStates(prev => ({ ...prev, [cacheKey]: 'analysis' }));

      const prompt = `Analyze Polymarket market: "${market.question}"
Current odds: ${market.favored} | Vol: $${formatNumber(market.volume)} | Liq: $${formatNumber(market.liquidity)}

Answer in plain text:

1. My estimated odds: X%
   Reason: [1-2 sentences with key facts/news]

2. Key future factors (up to 5, most important first):
   - Factor 1
   - Factor 2
   - Factor 3
   - Factor 4
   - Factor 5

3. Recommendation: Buy Yes / Buy No / Hold
   Why: [1-2 sentences on value and risk]`;

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
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
        setAiAnalysis(prev => ({ ...prev, [cacheKey]: { text, data: currentData } }));
      } catch (err) {
        setAiAnalysis(prev => ({ ...prev, [cacheKey]: { text: `AI failed: ${err.message}`, data: currentData } }));
      }

      await loadArticle(market);
    }
  };

  if (error) return <div className="container"><p>{error}</p></div>;

  return (
    <div className="container">
      <h1>Polymarket Pulse</h1>
      {filtered.length === 0 ? (
        <p>No markets match criteria.</p>
      ) : (
        <div className="market-grid">
          {filtered.map((m, index) => {
            const analysis = aiAnalysis[m.id];
            const article = articleData[m.id];
            const loading = loadingStates[m.id];
            const isCached = analysis && analysis.data === m.favored;
            const hasAI = isCached || loading;
            const isExpanded = expanded === m.id;

            return (
              <div
                key={m.id}
                className={`market-card ${isExpanded ? 'expanded' : ''}`}
                style={{
                  gridColumn: isExpanded ? '1 / -1' : 'auto'
                }}
              >
                <div className="market-header" onClick={() => handleCardClick(m)}>
                  <div className="market-question">{m.question}</div>
                  <div className="market-stats">
                    <div className="stat">
                      <span className="stat-label">Favored:</span>
                      <span className="stat-value">{m.favored}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Vol:</span>
                      <span className="stat-value">${formatNumber(m.volume)}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-label">Liq:</span>
                      <span className="stat-value">${formatNumber(m.liquidity)}</span>
                    </div>
                    {isCached && <span className="cached-badge">[Cached]</span>}
                  </div>
                </div>

                {isExpanded && (
                  <div className="market-content">
                    {/* HEADLINE ABOVE ODDS/REASONING */}
                    {article && (
                      <div className="article-headline">{article.title}</div>
                    )}

                    {analysis ? (
                      <>
                        <div className="analysis-text">{analysis.text}</div>
                        <div className="read-more-wrapper">
                          {article ? (
                            <>
                              {/* HEADLINE WITH READ MORE */}
                              <div className="article-headline-small">{article.title}</div>
                              <Link
                                to={`/article/${m.id}`}
                                state={{ market: m, article: article.content, title: article.title, date: article.date }}
                                className="read-more"
                              >
                                Read Full Article
                              </Link>
                            </>
                          ) : (
                            <span className="read-more">
                              Generating article<span className="blink">...</span>
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="loading">
                        {loading === 'analysis' ? (
                          <>Analyzing<span className="blink">...</span></>
                        ) : (
                          <>Generating article<span className="blink">...</span></>
                        )}
                      </p>
                    )}
                  </div>
                )}

                {!hasAI && !isExpanded && (
                  <div className="click-to-analyze">
                    Click to analyze
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Article() {
  const { marketId } = useParams();
  const navigate = useNavigate();

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const articles = JSON.parse(localStorage.getItem('polymarket_articles') || '{}');
    const data = articles[marketId];

    if (data) {
      document.title = data.title;
      setArticle(data);
      setLoading(false);
      return;
    }

    setArticle({ title: 'Article Not Found', content: 'This article was not generated.', date: 'N/A' });
    setLoading(false);
  }, [marketId]);

  if (loading) {
    return (
      <div className="article-page">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="article-page">
      <button onClick={() => navigate(-1)} className="back-btn">
        ← Back
      </button>
      <article>
        <h1 className="article-title">{article.title}</h1>
        <p className="article-date">Written on {article.date}</p>
        <div className="article-content">{article.content}</div>
      </article>
    </div>
  );
}

function App() {
  return (
    <Router>
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}
      </style>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/article/:marketId" element={<Article />} />
      </Routes>
    </Router>
  );
}

export default App;