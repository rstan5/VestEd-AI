
-- Portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  cash_balance NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own portfolio" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own portfolio" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own portfolio" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  shares NUMERIC(15,6) NOT NULL DEFAULT 0,
  average_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own positions" ON public.positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own positions" ON public.positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own positions" ON public.positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own positions" ON public.positions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trades table
CREATE TABLE public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  shares NUMERIC(15,6) NOT NULL,
  price_per_share NUMERIC(15,2) NOT NULL,
  total_amount NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create portfolio on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_portfolio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.portfolios (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_portfolio
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_portfolio();

-- Atomic trade execution function
CREATE OR REPLACE FUNCTION public.execute_trade(
  p_ticker TEXT,
  p_side TEXT,
  p_shares NUMERIC,
  p_price NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total NUMERIC;
  v_cash NUMERIC;
  v_current_shares NUMERIC;
  v_current_avg_cost NUMERIC;
  v_new_avg_cost NUMERIC;
  v_trade_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_shares <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Shares must be greater than 0');
  END IF;

  IF p_side NOT IN ('buy', 'sell') THEN
    RETURN json_build_object('success', false, 'error', 'Side must be buy or sell');
  END IF;

  v_total := p_shares * p_price;

  -- Ensure portfolio exists
  INSERT INTO public.portfolios (user_id) VALUES (v_user_id) ON CONFLICT (user_id) DO NOTHING;

  SELECT cash_balance INTO v_cash FROM public.portfolios WHERE user_id = v_user_id FOR UPDATE;

  IF p_side = 'buy' THEN
    IF v_cash < v_total THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient funds. Available: $' || v_cash::TEXT);
    END IF;

    -- Update cash
    UPDATE public.portfolios SET cash_balance = cash_balance - v_total WHERE user_id = v_user_id;

    -- Upsert position
    SELECT shares, average_cost INTO v_current_shares, v_current_avg_cost
      FROM public.positions WHERE user_id = v_user_id AND ticker = p_ticker FOR UPDATE;

    IF v_current_shares IS NULL THEN
      INSERT INTO public.positions (user_id, ticker, shares, average_cost)
        VALUES (v_user_id, p_ticker, p_shares, p_price);
    ELSE
      v_new_avg_cost := ((v_current_shares * v_current_avg_cost) + (p_shares * p_price)) / (v_current_shares + p_shares);
      UPDATE public.positions SET shares = shares + p_shares, average_cost = v_new_avg_cost
        WHERE user_id = v_user_id AND ticker = p_ticker;
    END IF;

  ELSIF p_side = 'sell' THEN
    SELECT shares INTO v_current_shares FROM public.positions WHERE user_id = v_user_id AND ticker = p_ticker FOR UPDATE;

    IF v_current_shares IS NULL OR v_current_shares < p_shares THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient shares. You own: ' || COALESCE(v_current_shares, 0)::TEXT);
    END IF;

    UPDATE public.portfolios SET cash_balance = cash_balance + v_total WHERE user_id = v_user_id;

    IF v_current_shares = p_shares THEN
      DELETE FROM public.positions WHERE user_id = v_user_id AND ticker = p_ticker;
    ELSE
      UPDATE public.positions SET shares = shares - p_shares WHERE user_id = v_user_id AND ticker = p_ticker;
    END IF;
  END IF;

  -- Record trade
  INSERT INTO public.trades (user_id, ticker, side, shares, price_per_share, total_amount)
    VALUES (v_user_id, p_ticker, p_side, p_shares, p_price, v_total)
    RETURNING id INTO v_trade_id;

  RETURN json_build_object('success', true, 'trade_id', v_trade_id);
END;
$$;
