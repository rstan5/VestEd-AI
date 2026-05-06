import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DEFAULT_TICKERS } from "@/lib/stock-prices";

const STOCK_PRICES_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stock-prices`;

export interface StockPrice {
  price: number;
  change: number;
  changePercent: number;
}

export function useStockPrices(tickers: string[] = DEFAULT_TICKERS, intervalMs = 900000) {
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const tickersKey = useMemo(() => tickers.join(","), [tickers]);

  const fetchPrices = useCallback(async () => {
    if (!tickersKey) return;
    try {
      const resp = await fetch(
        `${STOCK_PRICES_URL}?tickers=${tickersKey}`
      );
      if (!resp.ok) throw new Error("Failed to fetch prices");
      const data: Record<string, StockPrice> = await resp.json();
      if (mountedRef.current) {
        setPrices((prev) => ({ ...prev, ...data }));
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [tickersKey]);

  useEffect(() => {
    mountedRef.current = true;
    fetchPrices();
    const id = setInterval(fetchPrices, intervalMs);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchPrices, intervalMs]);

  const priceMap = useMemo(
    () =>
      Object.entries(prices).reduce<Record<string, number>>((map, [ticker, data]) => {
        map[ticker] = data.price;
        return map;
      }, {}),
    [prices],
  );

  return { prices, priceMap, loading, error, refresh: fetchPrices };
}
