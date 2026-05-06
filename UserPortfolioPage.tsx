import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, TrendingUp, Wallet, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useStockPrices } from "@/hooks/use-stock-prices";
import { DEFAULT_TICKERS } from "@/lib/stock-prices";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Profile {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Position {
  ticker: string;
  shares: number;
  average_cost: number;
}

const STARTING_CASH = 100000;

const UserPortfolioPage = () => {
  const { userId: viewedUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cash, setCash] = useState<number>(STARTING_CASH);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  // Track tickers held by this user, plus defaults, so we get live prices
  const tickers = useMemo(() => {
    const set = new Set<string>(DEFAULT_TICKERS);
    positions.forEach((p) => set.add(p.ticker));
    return Array.from(set);
  }, [positions]);
  const { priceMap } = useStockPrices(tickers);

  useEffect(() => {
    if (!viewedUserId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [profileRes, portfolioRes, positionsRes] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, username, avatar_url").eq("user_id", viewedUserId).maybeSingle(),
        supabase.from("portfolios").select("cash_balance").eq("user_id", viewedUserId).maybeSingle(),
        supabase.from("positions").select("ticker, shares, average_cost").eq("user_id", viewedUserId),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data ?? null);
      setCash(Number(portfolioRes.data?.cash_balance ?? STARTING_CASH));
      setPositions((positionsRes.data ?? []).map((p) => ({
        ticker: p.ticker,
        shares: Number(p.shares),
        average_cost: Number(p.average_cost),
      })));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [viewedUserId]);

  const positionsValue = positions.reduce((sum, p) => {
    const price = priceMap[p.ticker] ?? p.average_cost;
    return sum + p.shares * price;
  }, 0);
  const totalValue = cash + positionsValue;
  const returnPct = ((totalValue - STARTING_CASH) / STARTING_CASH) * 100;

  const name = profile?.display_name || profile?.username || "Trader";

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center">
        <p className="text-muted-foreground">Loading portfolio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-4xl">
        <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-8 mb-6">
          <div className="flex items-center gap-6 flex-wrap">
            <Avatar className="w-20 h-20">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt={name} /> : null}
              <AvatarFallback className="text-2xl">{name.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-2xl md:text-3xl font-bold">{name}</h1>
              {profile?.username && profile?.display_name && (
                <p className="text-muted-foreground">@{profile.username}</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total Return</div>
              <div className={`font-display text-2xl font-bold flex items-center gap-1 justify-end ${returnPct >= 0 ? "text-gain" : "text-loss"}`}>
                <TrendingUp className="w-6 h-6" />
                {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Wallet className="w-4 h-4" /> Cash
            </div>
            <div className="font-display text-xl font-bold">${cash.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
              <Briefcase className="w-4 h-4" /> Positions Value
            </div>
            <div className="font-display text-xl font-bold">${positionsValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-xs text-muted-foreground mb-1">Total Portfolio</div>
            <div className="font-display text-xl font-bold">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-border/30">
            <h3 className="font-display text-lg font-semibold flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" /> Holdings
            </h3>
          </div>
          {positions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No open positions.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Shares</TableHead>
                  <TableHead className="text-right">Avg Cost</TableHead>
                  <TableHead className="text-right">Current</TableHead>
                  <TableHead className="text-right">Market Value</TableHead>
                  <TableHead className="text-right">P/L</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positions.map((p) => {
                  const price = priceMap[p.ticker] ?? p.average_cost;
                  const mv = p.shares * price;
                  const cost = p.shares * p.average_cost;
                  const pl = mv - cost;
                  const plPct = cost > 0 ? (pl / cost) * 100 : 0;
                  return (
                    <TableRow key={p.ticker}>
                      <TableCell className="font-semibold">{p.ticker}</TableCell>
                      <TableCell className="text-right">{p.shares}</TableCell>
                      <TableCell className="text-right">${p.average_cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">${mv.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                      <TableCell className={`text-right font-semibold ${pl >= 0 ? "text-gain" : "text-loss"}`}>
                        {pl >= 0 ? "+" : ""}${pl.toFixed(2)} ({plPct >= 0 ? "+" : ""}{plPct.toFixed(2)}%)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default UserPortfolioPage;
