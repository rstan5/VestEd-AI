
DROP FUNCTION IF EXISTS public.get_club_leaderboard(jsonb);

CREATE OR REPLACE FUNCTION public.get_club_leaderboard(p_prices jsonb)
RETURNS TABLE(club_id uuid, club_name text, club_description text, join_code text, owner_id uuid, member_count bigint, avg_return numeric, image_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH member_positions AS (
    SELECT
      cm.club_id,
      cm.user_id,
      COALESCE(p.cash_balance, 100000) as cash,
      COALESCE(
        (SELECT SUM(
          pos.shares * COALESCE((p_prices->>pos.ticker)::numeric, pos.average_cost)
        ) FROM public.positions pos WHERE pos.user_id = cm.user_id),
        0
      ) as positions_value
    FROM public.club_memberships cm
    LEFT JOIN public.portfolios p ON p.user_id = cm.user_id
  ),
  member_returns AS (
    SELECT
      mp.club_id,
      mp.user_id,
      ((mp.cash + mp.positions_value - 100000.0) / 100000.0) * 100 as return_pct
    FROM member_positions mp
  )
  SELECT
    ic.id as club_id,
    ic.name as club_name,
    ic.description as club_description,
    ic.join_code,
    ic.owner_id,
    COUNT(mr.user_id)::bigint as member_count,
    COALESCE(ROUND(AVG(mr.return_pct)::numeric, 2), 0) as avg_return,
    ic.image_url
  FROM public.investment_clubs ic
  LEFT JOIN member_returns mr ON mr.club_id = ic.id
  GROUP BY ic.id, ic.name, ic.description, ic.join_code, ic.owner_id, ic.image_url
  ORDER BY avg_return DESC;
END;
$function$;
