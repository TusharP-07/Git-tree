# Sprint 0: Infrastructure setup

## Local configuration

Copy `.env.example` to `.env.local`, then populate the existing GitHub and Gemini values plus the four Redis and Supabase values below. Do not commit `.env.local`.

| Variable | Source |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis database REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis database REST token |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase project settings → API Keys → secret key |

## Hosted provisioning

1. Create an Upstash Redis database in the region closest to the Vercel deployment.
2. Create a Supabase project and run `supabase/migrations/202609300001_initial_schema.sql` in its SQL Editor.
3. Add every value from `.env.example` to Vercel's Production and Preview environments. Keep `SUPABASE_SECRET_KEY` server-only; it must never be prefixed with `NEXT_PUBLIC_`.
4. Deploy a Preview build and confirm GitHub sign-in and summary generation still work.

## Scope boundary

This sprint creates provider configuration and the initial persistence schema. Redis-backed caching and rate limiting, plus database-backed chat history, begin in v2 after the hosted projects are provisioned.
