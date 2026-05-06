-- Allow any authenticated user to view positions (for social portfolio viewing)
CREATE POLICY "Authenticated users can view all positions"
ON public.positions
FOR SELECT
TO authenticated
USING (true);

-- Allow any authenticated user to view portfolio cash balances
CREATE POLICY "Authenticated users can view all portfolios"
ON public.portfolios
FOR SELECT
TO authenticated
USING (true);