-- Subscription entitlement must be decided server-side only.
DROP POLICY IF EXISTS "Users manage their own rows" ON public.subscriptions;

CREATE POLICY "Users can read their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;