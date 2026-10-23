# Project rules

- `vite.config.ts` injects the public backend URL/publishable key when the build environment lacks them — `.env` is git-ignored (read-only `.gitignore`), and published builds without these values render a blank page ("supabaseUrl is required").
