CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.site_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid(),
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX site_ratings_created_idx ON public.site_ratings (created_at DESC);
GRANT INSERT ON public.site_ratings TO anon;
GRANT SELECT, INSERT ON public.site_ratings TO authenticated;
GRANT ALL ON public.site_ratings TO service_role;
ALTER TABLE public.site_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a rating" ON public.site_ratings FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NOT DISTINCT FROM auth.uid());
CREATE POLICY "Admins read ratings" ON public.site_ratings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));