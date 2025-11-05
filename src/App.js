import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

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
    const cached = localStorage.getItem("polymarket_ai_cache");
    if (cached) setAiAnalysis(JSON.parse(cached));
    const articles = localStorage.getItem("polymarket_articles");
    if (articles) setArticleData(JSON.parse(articles));
  }, []);

  // Save cache
  useEffect(() => {
    localStorage.setItem("polymarket_ai_cache", JSON.stringify(aiAnalysis));
  }, [aiAnalysis]);

  useEffect(() => {
    localStorage.setItem("polymarket_articles", JSON.stringify(articleData));
  }, [articleData]);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await axios.get("/api/polymarket");
        const data = Array.isArray(res.data.data) ? res.data.data : [];
        setMarkets(data);
        localStorage.setItem("polymarket_markets", JSON.stringify(data));
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load markets.");
      }
    };
    fetchMarkets();
  }, []);

  const formatNumber = (num) => num.toLocaleString();

  const filtered = markets.sort((a, b) => b.volume - a.volume);

  const generateAll = async (market) => {
    const cacheKey = market.id;
    const currentData = `${market.odds}-${market.volume}-${market.liquidity}`;

    setLoadingStates((prev) => ({ ...prev, [cacheKey]: "analysis" }));

    // Analysis
    if (!aiAnalysis[cacheKey] || aiAnalysis[cacheKey].data !== currentData) {
      const prompt = `Analyze Polymarket market: "${market.question}"
Current odds: ${market.odds} | Vol: $${formatNumber(
        market.volume
      )} | Liq: $${formatNumber(market.liquidity)}

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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const text =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "No response.";
        setAiAnalysis((prev) => ({
          ...prev,
          [cacheKey]: { text, data: currentData },
        }));
      } catch (err) {
        setAiAnalysis((prev) => ({
          ...prev,
          [cacheKey]: { text: `AI failed: ${err.message}`, data: currentData },
        }));
      }
    }

    setLoadingStates((prev) => ({ ...prev, [cacheKey]: "article" }));

    // Article
    if (!articleData[cacheKey]) {
      const now = new Date();
      const dateStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(
        now.getDate()
      ).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;

      const prompt = `Write a 600-word professional article with a subtle Joe Rogan tone about this Polymarket market:

"${market.question}"

Current odds: ${market.odds}
24h Volume: $${market.volume.toLocaleString()}
Liquidity: $${market.liquidity.toLocaleString()}

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
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          }
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const fullText =
          data.candidates?.[0]?.content?.parts?.[0]?.text || "Failed.";
        const lines = fullText
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        const title = lines[0] || "NO TITLE";
        const content = lines.slice(1).join("\n").trim();

        const articleObj = { title, content, date: dateStr };
        setArticleData((prev) => ({ ...prev, [cacheKey]: articleObj }));
      } catch (err) {
        const fallback = {
          title: "ARTICLE ERROR",
          content: "Failed to load.",
          date: dateStr,
        };
        setArticleData((prev) => ({ ...prev, [cacheKey]: fallback }));
      }
    }

    setLoadingStates((prev) => ({ ...prev, [cacheKey]: "done" }));
  };

  if (error) return <div>{error}</div>;

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <h1>Polymarket Markets News</h1>
      {filtered.length === 0 ? (
        <p>No markets match criteria.</p>
      ) : (
        <ol style={{ paddingLeft: 20 }}>
          {filtered.map((m) => {
            const analysis = aiAnalysis[m.id];
            const article = articleData[m.id];
            const loading = loadingStates[m.id];
            const isCached =
              analysis &&
              analysis.data === `${m.odds}-${m.volume}-${m.liquidity}`;
            const title = article?.title || "Read More";

            return (
              <li key={m.id} style={{ marginBottom: 20 }}>
                <div
                  onClick={() => {
                    const newExpanded = expanded === m.id ? null : m.id;
                    setExpanded(newExpanded);
                    if (newExpanded && !isCached) generateAll(m);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <strong>{m.question}</strong>
                  <br />
                  <small>
                    Odds: {m.odds} | Vol: ${formatNumber(m.volume)} | Liq: $
                    {formatNumber(m.liquidity)}
                    {isCached && (
                      <span style={{ color: "#34a853" }}> [Cached]</span>
                    )}
                  </small>
                </div>
                {expanded === m.id && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: 16,
                      background: "#f8f9fa",
                      borderRadius: 8,
                      fontSize: "0.95em",
                      lineHeight: 1.6,
                      borderLeft: "4px solid #34a853",
                    }}
                  >
                    {analysis ? (
                      <>
                        <pre
                          style={{
                            margin: 0,
                            whiteSpace: "pre-wrap",
                            fontFamily: "inherit",
                          }}
                        >
                          {analysis.text}
                        </pre>
                        <div style={{ marginTop: 12 }}>
                          {article ? (
                            <Link
                              to={`/article/${m.id}`}
                              state={{
                                market: m,
                                article: article.content,
                                title: article.title,
                                date: article.date,
                              }}
                              style={{
                                color: "#d32f2f",
                                fontWeight: "bold",
                                textDecoration: "none",
                                fontSize: "0.95em",
                              }}
                            >
                              Read More: {title}
                            </Link>
                          ) : (
                            <span
                              style={{
                                color: "#d32f2f",
                                fontWeight: "bold",
                                fontSize: "0.95em",
                              }}
                            >
                              Read More:{" "}
                              <span
                                style={{
                                  display: "inline-block",
                                  animation: "blink 1s infinite",
                                }}
                              >
                                ___
                              </span>
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <p style={{ margin: 0, color: "#666" }}>
                        {loading === "analysis"
                          ? "Analyzing..."
                          : "Generating article..."}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
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
    const articles = JSON.parse(
      localStorage.getItem("polymarket_articles") || "{}"
    );
    const data = articles[marketId];

    if (data) {
      document.title = data.title;
      setArticle(data);
      setLoading(false);
      return;
    }

    setArticle({
      title: "Article Not Found",
      content: "This article was not generated.",
      date: "N/A",
    });
    setLoading(false);
  }, [marketId]);

  if (loading) {
    return (
      <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
        <button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>
          Back
        </button>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: "auto", padding: 20 }}>
      <button
        onClick={() => navigate(-1)}
        style={{ marginBottom: 16, fontSize: "0.9em" }}
      >
        Back
      </button>
      <div style={{ lineHeight: 1.8, fontSize: "1.1em" }}>
        <h1
          style={{ margin: "0 0 8px 0", fontSize: "1.8em", fontWeight: "bold" }}
        >
          {article.title}
        </h1>
        <p style={{ margin: "0 0 20px 0", color: "#666", fontSize: "0.9em" }}>
          Written on {article.date}
        </p>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Georgia, serif" }}>
          {article.content}
        </pre>
      </div>
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
