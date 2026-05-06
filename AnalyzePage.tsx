import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Brain, TrendingUp, TrendingDown, RefreshCw, Loader2, LogIn, Plus, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTrading } from "@/hooks/use-trading";
import { useStockPrices } from "@/hooks/use-stock-prices";
import { DEFAULT_TICKERS } from "@/lib/stock-prices";

const ANALYZE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-portfolio`;

interface Holding {
  ticker: string;
  shares: number;
  value: number;
  weight: number;
  change: number;
}

const AnalyzePage = () => {
  const navigate = useNavigate();
  const { positions, cashBalance, loading, userId } = useTrading();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [manualTicker, setManualTicker] = useState("");
  const [manualShares, setManualShares] = useState("");
  const [manualHoldings, setManualHoldings] = useState<{ ticker: string; shares: number }[]>([]);
  const [useManual, setUseManual] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Collect all tickers we need prices for
  const allTickers = Array.from(new Set([
    ...DEFAULT_TICKERS,
    ...positions.map((p) => p.ticker),
    ...manualHoldings.map((h) => h.ticker),
  ]));
  const { prices } = useStockPrices(allTickers);

  // Build holdings from real positions
  useEffect(() => {
    if (!useManual && positions.length > 0) {
      const totalValue = positions.reduce((sum, pos) => {
        const price = prices[pos.ticker]?.price || pos.average_cost;
        return sum + price * pos.shares;
      }, 0);

      const h: Holding[] = positions.map((pos) => {
        const price = prices[pos.ticker]?.price || pos.average_cost;
        const value = price * pos.shares;
        const change = ((price - pos.average_cost) / pos.average_cost) * 100;
        return { ticker: pos.ticker, shares: pos.shares, value, weight: totalValue > 0 ? (value / totalValue) * 100 : 0, change };
      });
      setHoldings(h);
    }
  }, [positions, useManual, prices]);

  // Build holdings from manual entries
  useEffect(() => {
    if (useManual && manualHoldings.length > 0) {
      const totalValue = manualHoldings.reduce((sum, h) => {
        const price = prices[h.ticker]?.price || 100;
        return sum + price * h.shares;
      }, 0);

      const h: Holding[] = manualHoldings.map((mh) => {
        const price = prices[mh.ticker]?.price || 100;
        const value = price * mh.shares;
        return { ticker: mh.ticker, shares: mh.shares, value, weight: totalValue > 0 ? (value / totalValue) * 100 : 0, change: 0 };
      });
      setHoldings(h);
    }
  }, [manualHoldings, useManual, prices]);

  const addManualHolding = () => {
    const ticker = manualTicker.toUpperCase().trim();
    if (!ticker || !manualShares || Number(manualShares) <= 0) return;
    if (manualHoldings.find((h) => h.ticker === ticker)) return;
    setManualHoldings((prev) => [...prev, { ticker, shares: Number(manualShares) }]);
    setManualTicker("");
    setManualShares("");
  };

  const removeManualHolding = (ticker: string) => {
    setManualHoldings((prev) => prev.filter((h) => h.ticker !== ticker));
  };

  const runAnalysis = async () => {
    if (holdings.length === 0) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setAnalysis("");
    setAnalyzing(true);

    try {
      const resp = await fetch(ANALYZE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ holdings, source: useManual ? "uploaded" : "trade_lab", cashBalance: useManual ? null : cashBalance }),
        signal: controller.signal,
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Analysis failed" }));
        setAnalysis(`Error: ${err.error}`);
        setAnalyzing(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              accumulated += content;
              setAnalysis(accumulated);
            }
          } catch {}
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setAnalysis("Error: Failed to connect to AI service.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const hasRealPositions = !loading && userId && positions.length > 0;
  const showContent = holdings.length > 0 || useManual;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <Brain className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">AI Portfolio Professor</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-6">
            Analyze your Trade Lab portfolio or upload your own. Get strategy lessons and actionable recommendations to maximize returns.
          </p>
        </motion.div>

        {userId && (
          <div className="flex flex-wrap gap-3 mb-6">
            <Button variant={!useManual ? "default" : "outline"} onClick={() => setUseManual(false)} disabled={positions.length === 0}>
              Trade Lab Portfolio {positions.length === 0 && "(no positions)"}
            </Button>
            <Button variant={useManual ? "default" : "outline"} onClick={() => setUseManual(true)}>
              Upload / Manual Portfolio
            </Button>
          </div>
        )}

        {!userId && !loading && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-12 text-center mb-6">
            <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="font-display text-xl font-semibold mb-2">Sign in to analyze your portfolio</h2>
            <p className="text-muted-foreground mb-4">Or use manual entry to analyze a hypothetical portfolio.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="hero" onClick={() => navigate("/auth")}>Sign In</Button>
              <Button variant="outline" onClick={() => setUseManual(true)}>Manual Entry</Button>
            </div>
          </motion.div>
        )}

        {useManual && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6 mb-6">
            <h3 className="font-display text-lg font-semibold mb-4">Add Holdings</h3>
            <div className="flex gap-3 mb-4">
              <Input placeholder="Ticker (e.g. AAPL)" value={manualTicker} onChange={(e) => setManualTicker(e.target.value)} className="max-w-[160px]" onKeyDown={(e) => e.key === "Enter" && addManualHolding()} />
              <Input placeholder="Shares" type="number" value={manualShares} onChange={(e) => setManualShares(e.target.value)} className="max-w-[120px]" onKeyDown={(e) => e.key === "Enter" && addManualHolding()} />
              <Button onClick={addManualHolding} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
            </div>
            {manualHoldings.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manualHoldings.map((h) => (
                  <div key={h.ticker} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-1.5 text-sm">
                    <span className="font-semibold">{h.ticker}</span>
                    <span className="text-muted-foreground">{h.shares} shares</span>
                    <button onClick={() => removeManualHolding(h.ticker)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {holdings.length > 0 && (
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-border/30 flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold">{useManual ? "Hypothetical Holdings" : "Your Holdings"}</h3>
                <Button variant="hero" onClick={runAnalysis} disabled={analyzing}>
                  {analyzing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>) : analysis ? (<><RefreshCw className="w-4 h-4 mr-2" /> Re-Analyze</>) : (<><Brain className="w-4 h-4 mr-2" /> Analyze with AI</>)}
                </Button>
              </div>
              <div className="divide-y divide-border/20">
                {holdings.map((h) => (
                  <div key={h.ticker} className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-display font-bold text-sm text-primary">{h.ticker.slice(0, 2)}</div>
                      <div>
                        <div className="font-semibold">{h.ticker}</div>
                        <div className="text-sm text-muted-foreground">{h.shares} shares</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Weight</div>
                        <div className="font-semibold">{h.weight.toFixed(1)}%</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">Value</div>
                        <div className="font-semibold">${h.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                      {!useManual && (
                        <div className={`flex items-center gap-1 font-semibold ${h.change >= 0 ? "text-gain" : "text-loss"}`}>
                          {h.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                          {h.change >= 0 ? "+" : ""}{h.change.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {(analysis || analyzing) && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Brain className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-lg font-semibold">AI Analysis</h3>
                  {analyzing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{analysis || "Thinking..."}</ReactMarkdown>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {useManual && manualHoldings.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">Add some tickers above to analyze a hypothetical portfolio.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AnalyzePage;
