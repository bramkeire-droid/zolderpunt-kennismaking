// Alleen voor tests die een serverfunctie uit supabase/functions inladen:
// die code draait op Deno en leest daar haar secrets.
declare const Deno: { env: { get(sleutel: string): string | undefined } };
