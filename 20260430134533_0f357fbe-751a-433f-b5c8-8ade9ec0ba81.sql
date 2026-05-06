-- 1. Stock price cache (one row per ticker, refreshed by a scheduled edge function)
CREATE TABLE public.stock_price_cache (
  ticker text PRIMARY KEY,
  price numeric NOT NULL,
  change numeric NOT NULL DEFAULT 0,
  change_percent numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached prices"
ON public.stock_price_cache
FOR SELECT
USING (true);

-- 2. Per-user return snapshot
CREATE TABLE public.user_returns_snapshot (
  user_id uuid PRIMARY KEY,
  total_value numeric NOT NULL DEFAULT 100000,
  return_pct numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_returns_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read user returns"
ON public.user_returns_snapshot
FOR SELECT
TO authenticated
USING (true);

-- 3. Per-club return snapshot
CREATE TABLE public.club_returns_snapshot (
  club_id uuid PRIMARY KEY,
  avg_return numeric NOT NULL DEFAULT 0,
  member_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.club_returns_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read club returns"
ON public.club_returns_snapshot
FOR SELECT
TO authenticated
USING (true);

-- 4. Safety constraints
ALTER TABLE public.portfolios
  ADD CONSTRAINT portfolios_cash_non_negative CHECK (cash_balance >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS positions_user_ticker_uniq
  ON public.positions (user_id, ticker);

-- 5. Replace leaderboard functions to read from snapshots (no more p_prices arg)
DROP FUNCTION IF EXISTS public.get_club_leaderboard(jsonb);
DROP FUNCTION IF EXISTS public.get_individual_leaderboard(jsonb);

CREATE OR REPLACE FUNCTION public.get_club_leaderboard()
RETURNS TABLE(
  club_id uuid,
  club_name text,
  club_description text,
  join_code text,
  owner_id uuid,
  member_count bigint,
  avg_return numeric,
  image_url text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    ic.id AS club_id,
    ic.name AS club_name,
    ic.description AS club_description,
    CASE WHEN ic.owner_id = auth.uid() THEN ic.join_code ELSE NULL END AS join_code,
    ic.owner_id,
    COALESCE(crs.member_count, 0)::bigint AS member_count,
    COALESCE(crs.avg_return, 0) AS avg_return,
    ic.image_url
  FROM public.investment_clubs ic
  LEFT JOIN public.club_returns_snapshot crs ON crs.club_id = ic.id
  ORDER BY COALESCE(crs.avg_return, 0) DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_individual_leaderboard()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  username text,
  avatar_url text,
  return_pct numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    pr.user_id,
    pr.display_name,
    pr.username,
    pr.avatar_url,
    COALESCE(urs.return_pct, 0) AS return_pct
  FROM public.profiles pr
  LEFT JOIN public.user_returns_snapshot urs ON urs.user_id = pr.user_id
  ORDER BY COALESCE(urs.return_pct, 0) DESC;
$$;

-- 6. Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;