CREATE OR REPLACE FUNCTION public.get_individual_leaderboard(p_prices jsonb)
 RETURNS TABLE(user_id uuid, display_name text, username text, avatar_url text, return_pct numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_values AS (
    SELECT
      pr.user_id,
      pr.display_name,
      pr.username,
      pr.avatar_url,
      COALESCE(p.cash_balance, 100000) as cash,
      COALESCE(
        (SELECT SUM(
          pos.shares * COALESCE((p_prices->>pos.ticker)::numeric, pos.average_cost)
        ) FROM public.positions pos WHERE pos.user_id = pr.user_id),
        0
      ) as positions_value
    FROM public.profiles pr
    LEFT JOIN public.portfolios p ON p.user_id = pr.user_id
  )
  SELECT
    uv.user_id,
    uv.display_name,
    uv.username,
    uv.avatar_url,
    ROUND((((uv.cash + uv.positions_value - 100000.0) / 100000.0) * 100)::numeric, 2) as return_pct
  FROM user_values uv
  ORDER BY return_pct DESC;
END;
$function$;