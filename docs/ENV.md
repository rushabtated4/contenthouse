# Environment Variables

> **Auto-update rule:** When any env var is added, removed, or its usage changes, update this file. See `CLAUDE.md` for details.

## Required

| Variable | Used In | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `lib/supabase/client.ts`, `lib/supabase/server.ts` | Supabase project URL. Format: `https://{ref}.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `lib/supabase/client.ts` | Supabase anonymous/public key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `lib/supabase/server.ts` | Supabase service role key (server-only, bypasses RLS) |
| `OPENAI_API_KEY` | `lib/openai/client.ts` | OpenAI API key for gpt-image-1 |
| `RAPIDAPI_KEY` | `lib/tiktok/client.ts` | RapidAPI key for TikTok API access |
| `RAPIDAPI_TIKTOK_HOST` | `lib/tiktok/client.ts` | RapidAPI host. Value: `tiktok-api23.p.rapidapi.com` |

## Optional (override defaults)

| Variable | Default | Used In | Description |
|---|---|---|---|
| `DEFAULT_FIRST_SLIDE_PROMPT` | Long prompt (see `lib/defaults.ts`) | `lib/defaults.ts` | Default prompt for first carousel slide |
| `DEFAULT_OTHER_SLIDES_PROMPT` | Long prompt (see `lib/defaults.ts`) | `lib/defaults.ts` | Default prompt for non-first slides |
| `DEFAULT_OUTPUT_QUALITY` | `"medium"` | `lib/defaults.ts` | Default output quality: `low` / `medium` / `high` |
| `DEFAULT_INPUT_QUALITY` | `"low"` | `lib/defaults.ts` | Default input quality: `low` / `high` |
| `DEFAULT_OUTPUT_FORMAT` | `"jpeg"` | `lib/defaults.ts` | Default output format: `png` / `jpeg` / `webp` |

## Setup

### `.env.local` (local development)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gqtdvbvwvkncvfqtgnzp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenAI
OPENAI_API_KEY=sk-proj-...

# RapidAPI
RAPIDAPI_KEY=your-rapidapi-key
RAPIDAPI_TIKTOK_HOST=tiktok-api23.p.rapidapi.com

# Optional overrides
# DEFAULT_FIRST_SLIDE_PROMPT=...
# DEFAULT_OTHER_SLIDES_PROMPT=...
# DEFAULT_OUTPUT_QUALITY=medium
# DEFAULT_INPUT_QUALITY=low
# DEFAULT_OUTPUT_FORMAT=jpeg
```

### Vercel (production)

Set all **required** variables in Vercel Dashboard → Settings → Environment Variables.

## Gotchas

- **`NEXT_PUBLIC_` prefix:** Only `SUPABASE_URL` and `SUPABASE_ANON_KEY` are exposed to the browser. All other keys are server-only.
- **Shell override:** If `OPENAI_API_KEY` is exported in `~/.zshrc` or `~/.bashrc`, it overrides `.env.local`. Next.js does NOT override existing env vars. Remove it from shell profiles to use `.env.local`.
- **OpenAI singleton:** The OpenAI client caches the key at first use. After changing `OPENAI_API_KEY`, restart the dev server (`rm -rf .next && npm run dev`).
