import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BarChart3, Search, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight, Sparkles, RefreshCw, Loader2, History, LogIn } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useTrading } from "@/hooks/use-trading";
import { DEFAULT_TICKERS, stockMeta } from "@/lib/stock-prices";
import { useStockPrices } from "@/hooks/use-stock-prices";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/investment-chat`;

const TradePage = () => {
  const navigate = useNavigate();
  const { cashBalance, positions, trades, loading, executing, userId, executeTrade, getPosition } = useTrading();
  const { prices, loading: pricesLoading } = useStockPrices();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [shares, setShares] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [insight, setInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Build stock list from live prices
  const stockList = DEFAULT_TICKERS.map((ticker) => ({
    ticker,
    name: stockMeta[ticker] || ticker,
    price: prices[ticker]?.price ?? 0,
    change: prices[ticker]?.change ?? 0,
    changePercent: prices[ticker]?.changePercent ?? 0,
  }));

  const filteredStocks = stockList.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedStock = selectedTicker ? stockList.find((s) => s.ticker === selectedTicker) ?? null : null;

  // Calculate portfolio value from positions
  const portfolioValue = positions.reduce((sum, pos) => {
    const livePrice = prices[pos.ticker]?.price;
    return sum + ((livePrice ?? pos.average_cost) * pos.shares);
  }, 0);

  const totalValue = (cashBalance ?? 100000) + portfolioValue;
  const totalPnL = totalValue - 100000;

  const fetchInsight = async (stock: typeof stockList[0]) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setInsight("");
    setInsightLoading(true);

    const direction = stock.change >= 0 ? `up ${stock.changePercent.toFixed(2)}%` : `down ${Math.abs(stock.changePercent).toFixed(2)}%`;
    const prompt = `Give me a brief trading insight on ${stock.ticker} (${stock.name}) at $${stock.price.toFixed(2)}, ${direction} today. Include key levels, sentiment, and what to watch for. Keep it concise (3-4 short paragraphs max).`;

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [{ role: "user", content: prompt }] }),
        signal: controller.signal,
      });
      if (!resp.ok) { setInsight("⚠️ Failed to load insights."); setInsightLoading(false); return; }
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { accumulated += content; setInsight(accumulated); }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch (e: any) {
      if (e.name !== "AbortError") setInsight("⚠️ Connection error. Please try again.");
    }
    setInsightLoading(false);
  };

  useEffect(() => {
    if (selectedStock) fetchInsight(selectedStock);
    else setInsight("");
    return () => abortRef.current?.abort();
  }, [selectedTicker]);

  const handleTrade = async (side: "buy" | "sell") => {
    if (!selectedStock || !shares || Number(shares) <= 0) return;
    const success = await executeTrade(selectedStock.ticker, side, Number(shares), selectedStock.price);
    if (success) setShares("");
  };

  // Not logged in state
  if (!loading && !userId) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <LogIn className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display text-2xl font-bold">Sign in to Trade</h2>
          <p className="text-muted-foreground">Create an account to start paper trading with $100K.</p>
          <Button variant="hero" onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </div>
    );
  }

  const currentPosition = selectedStock ? getPosition(selectedStock.ticker) : null;

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="font-display text-3xl md:text-4xl font-bold">Paper Trading Arena</h1>
          </div>
          <p className="text-muted-foreground text-lg mb-8">Trade with $100K in fake money. Real market data. Zero risk.</p>
        </motion.div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-1">Cash Balance</div>
            <div className="font-display text-2xl font-bold text-primary">
              {loading ? "..." : `$${(cashBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-1">Portfolio Value</div>
            <div className="font-display text-2xl font-bold">
              {loading ? "..." : `$${portfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-2xl p-6">
            <div className="text-sm text-muted-foreground mb-1">Total P&L</div>
            <div className={`font-display text-2xl font-bold ${totalPnL >= 0 ? "text-gain" : "text-loss"}`}>
              {loading ? "..." : `${totalPnL >= 0 ? "+" : ""}$${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </div>
          </motion.div>
        </div>

        {/* Positions row */}
        {positions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="glass-card rounded-2xl p-5 mb-6">
            <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3">YOUR POSITIONS</h3>
            <div className="flex flex-wrap gap-3">
              {positions.map((pos) => {
                const currentPrice = prices[pos.ticker]?.price ?? pos.average_cost;
                const pnl = (currentPrice - pos.average_cost) * pos.shares;
                return (
                  <button
                    key={pos.ticker}
                    onClick={() => setSelectedTicker(pos.ticker)}
                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-secondary/50 hover:bg-secondary/80 transition-colors text-left"
                  >
                    <div className="font-semibold text-sm">{pos.ticker}</div>
                    <div className="text-xs text-muted-foreground">{pos.shares} shares</div>
                    <div className={`text-xs font-medium ${pnl >= 0 ? "text-gain" : "text-loss"}`}>
                      {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-6">
          {/* Stock list */}
          <div className="md:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border/30">
                <div className="relative">
                  <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text" placeholder="Search stocks..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-secondary/50 border border-border/30 rounded-xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {pricesLoading && Object.keys(prices).length === 0 ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground text-sm">Loading live prices...</span>
                  </div>
                ) : (
                  filteredStocks.map((stock) => {
                    const pos = getPosition(stock.ticker);
                    return (
                      <button
                        key={stock.ticker}
                        onClick={() => setSelectedTicker(stock.ticker)}
                        className={`w-full flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors text-left ${selectedTicker === stock.ticker ? "bg-primary/5 neon-border" : ""}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center font-display font-bold text-sm text-primary">
                            {stock.ticker.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold">{stock.ticker}</div>
                            <div className="text-sm text-muted-foreground">{stock.name}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${stock.price.toFixed(2)}</div>
                          <div className={`flex items-center gap-1 text-sm font-medium ${stock.change >= 0 ? "text-gain" : "text-loss"}`}>
                            {stock.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
                          </div>
                          {pos && <div className="text-xs text-muted-foreground mt-0.5">{pos.shares} owned</div>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Trade History */}
            {trades.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl mt-6 overflow-hidden">
                <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between p-5 text-left">
                  <div className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold">Trade History</h3>
                    <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">{trades.length}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{showHistory ? "Hide" : "Show"}</span>
                </button>
                {showHistory && (
                  <div className="divide-y divide-border/20 max-h-64 overflow-y-auto">
                    {trades.map((trade) => (
                      <div key={trade.id} className="px-6 py-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${trade.side === "buy" ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"}`}>
                            {trade.side.toUpperCase()}
                          </span>
                          <span className="font-semibold">{trade.ticker}</span>
                          <span className="text-muted-foreground">{trade.shares} shares @ ${trade.price_per_share.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${trade.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                          <div className="text-xs text-muted-foreground">{new Date(trade.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right column: Order panel + AI Insights */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-2xl p-6">
              <h3 className="font-display text-lg font-semibold mb-5">Place Order</h3>
              {selectedStock ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                    <div className="w-10 h-10 rounded-lg gradient-primary flex items-center justify-center font-display font-bold text-sm text-primary-foreground">
                      {selectedStock.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-semibold">{selectedStock.ticker}</div>
                      <div className="text-sm text-muted-foreground">${selectedStock.price.toFixed(2)}</div>
                    </div>
                  </div>

                  {currentPosition && (
                    <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>You own</span>
                        <span className="text-foreground font-semibold">{currentPosition.shares} shares (avg ${currentPosition.average_cost.toFixed(2)})</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-muted-foreground block mb-2">Number of Shares</label>
                    <input
                      type="number" placeholder="0" min="1" value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {shares && Number(shares) > 0 && (
                    <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Estimated Cost</span>
                        <span className="text-foreground font-semibold">
                          ${(Number(shares) * selectedStock.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="hero" className="w-full" onClick={() => handleTrade("buy")} disabled={executing || !shares || Number(shares) <= 0}>
                      {executing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4 mr-1" />} Buy
                    </Button>
                    <Button
                      variant="hero-outline"
                      className="w-full border-loss/50 text-loss hover:bg-loss/10"
                      onClick={() => handleTrade("sell")}
                      disabled={executing || !shares || Number(shares) <= 0 || !currentPosition}
                    >
                      Sell
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a stock to trade</p>
                </div>
              )}
            </motion.div>

            {/* AI Insights */}
            {selectedStock && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h3 className="font-display text-lg font-semibold">AI Insights</h3>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => fetchInsight(selectedStock)} disabled={insightLoading} className="h-8 w-8">
                    <RefreshCw className={`w-4 h-4 ${insightLoading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                {insightLoading && !insight ? (
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating insights…</span>
                  </div>
                ) : insight ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{insight}</ReactMarkdown>
                  </div>
                ) : null}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradePage;
