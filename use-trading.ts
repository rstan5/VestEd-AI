import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Position {
  ticker: string;
  shares: number;
  average_cost: number;
}

export interface Trade {
  id: string;
  ticker: string;
  side: "buy" | "sell";
  shares: number;
  price_per_share: number;
  total_amount: number;
  created_at: string;
}

export function useTrading() {
  const [cashBalance, setCashBalance] = useState<number | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      setUserId(null);
      return;
    }
    setUserId(session.user.id);

    const [portfolioRes, positionsRes, tradesRes] = await Promise.all([
      supabase.from("portfolios").select("cash_balance").eq("user_id", session.user.id).maybeSingle(),
      supabase.from("positions").select("ticker, shares, average_cost").eq("user_id", session.user.id),
      supabase.from("trades").select("*").eq("user_id", session.user.id).order("created_at", { ascending: false }).limit(50),
    ]);

    if (portfolioRes.data) {
      setCashBalance(Number(portfolioRes.data.cash_balance));
    } else {
      // Portfolio doesn't exist yet — will be created on first trade
      setCashBalance(100000);
    }

    setPositions(
      (positionsRes.data || []).map((p: any) => ({
        ticker: p.ticker,
        shares: Number(p.shares),
        average_cost: Number(p.average_cost),
      }))
    );

    setTrades(
      (tradesRes.data || []).map((t: any) => ({
        ...t,
        shares: Number(t.shares),
        price_per_share: Number(t.price_per_share),
        total_amount: Number(t.total_amount),
      }))
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchData();
    });
    return () => subscription.unsubscribe();
  }, [fetchData]);

  const executeTrade = async (ticker: string, side: "buy" | "sell", shares: number, price: number) => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.rpc("execute_trade", {
        p_ticker: ticker,
        p_side: side,
        p_shares: shares,
        p_price: price,
      });

      if (error) throw error;

      const result = data as any;
      if (!result.success) {
        toast({ title: "Trade failed", description: result.error, variant: "destructive" });
        return false;
      }

      toast({
        title: `${side === "buy" ? "Bought" : "Sold"} ${shares} ${ticker}`,
        description: `Total: $${(shares * price).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      });

      await fetchData();
      return true;
    } catch (error: any) {
      toast({ title: "Trade error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setExecuting(false);
    }
  };

  const getPosition = (ticker: string) => positions.find((p) => p.ticker === ticker);

  return {
    cashBalance,
    positions,
    trades,
    loading,
    executing,
    userId,
    executeTrade,
    getPosition,
    refresh: fetchData,
  };
}
