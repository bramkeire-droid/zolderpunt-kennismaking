-- LOKETTEN, 26 november: anon en authenticated hadden op public.internal_config alle tabelrechten, ook TRUNCATE (waar
-- RLS niet voor geldt). Via de API was dat niet bereikbaar, maar ze horen er niet. Wie de tabel leest: alleen de
-- dienstsleutel (flush-inbound-groups, pull-bouwflow-projects, push-nieuwe-dossiers, sync-bouwflow-phases) en de
-- geplande taken (postgres). Geen pagina leest ze. Alleen rechten intrekken; de inhoud en RLS blijven gelijk.
revoke all on table public.internal_config from anon, authenticated;
-- Terugdraaien: grant all on table public.internal_config to anon, authenticated;
