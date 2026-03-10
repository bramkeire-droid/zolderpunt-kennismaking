
-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voornaam TEXT NOT NULL DEFAULT '',
  achternaam TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telefoon TEXT NOT NULL DEFAULT '',
  gevonden_via TEXT NOT NULL DEFAULT '',
  gezocht_naar TEXT NOT NULL DEFAULT '',
  notities_vooraf TEXT NOT NULL DEFAULT '',
  adres TEXT NOT NULL DEFAULT '',
  oppervlakte_m2 NUMERIC,
  project_type TEXT NOT NULL DEFAULT '',
  project_timing TEXT NOT NULL DEFAULT '',
  volgende_stap TEXT NOT NULL DEFAULT '',
  gesprek_notities TEXT NOT NULL DEFAULT '',
  gesprek_datum DATE DEFAULT CURRENT_DATE,
  budget_min NUMERIC,
  budget_max NUMERIC,
  budget_incl6 NUMERIC,
  budget_incl21 NUMERIC,
  inbegrepen_posten JSONB NOT NULL DEFAULT '[]'::jsonb,
  rapport_tekst TEXT NOT NULL DEFAULT '',
  rapport_gegenereerd_op TIMESTAMP WITH TIME ZONE,
  rapport_versies JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'intake',
  fotos JSONB NOT NULL DEFAULT '[]'::jsonb,
  technisch JSONB NOT NULL DEFAULT '{
    "trap": false,
    "trapgat": "hout",
    "dakraam": false,
    "aantal_velux": 1,
    "airco": false,
    "aantal_airco": 1,
    "draagmuur": false,
    "badkamer": false,
    "maatwerk_kasten": false,
    "elektriciteit_uitgebreid": false,
    "dakconstructie_twijfelachtig": false
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Permissive policies (internal tool, no auth yet)
CREATE POLICY "Allow all reads" ON public.leads FOR SELECT USING (true);
CREATE POLICY "Allow all inserts" ON public.leads FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all updates" ON public.leads FOR UPDATE USING (true);
CREATE POLICY "Allow all deletes" ON public.leads FOR DELETE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for lead photos
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-fotos', 'lead-fotos', true);

CREATE POLICY "Public read lead fotos" ON storage.objects FOR SELECT USING (bucket_id = 'lead-fotos');
CREATE POLICY "Anyone can upload lead fotos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lead-fotos');
CREATE POLICY "Anyone can update lead fotos" ON storage.objects FOR UPDATE USING (bucket_id = 'lead-fotos');
CREATE POLICY "Anyone can delete lead fotos" ON storage.objects FOR DELETE USING (bucket_id = 'lead-fotos');
