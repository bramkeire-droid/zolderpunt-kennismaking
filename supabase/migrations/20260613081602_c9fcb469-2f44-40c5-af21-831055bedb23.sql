CREATE TABLE public.google_reviews_cache (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.google_reviews_cache TO authenticated, anon;
GRANT ALL ON public.google_reviews_cache TO service_role;

ALTER TABLE public.google_reviews_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cached reviews"
  ON public.google_reviews_cache FOR SELECT
  USING (true);