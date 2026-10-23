# AGENTS.md

- Keep `.env` tracked (never add it to `.gitignore`): the published build reads the backend URL/publishable key from it; without it the live site crashes on load.
- `supabase/config.toml` must point at the Lovable Cloud project and keep `verify_jwt = false` for `whatsapp-webhook`, `whatsapp-automacao`, `import-attendances` and `amigo-api`: they are called by uazapi webhooks and pg_cron without a user session.
- Heavy dashboard tabs (Detalhado: Amigo API + full `detalhado` table) load only when first opened, so the initial dashboard load stays fast.
