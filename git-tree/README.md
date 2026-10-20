# RepoGraph

RepoGraph visualizes the file tree and internal dependencies of a GitHub repository. Signed-in users can also request AI summaries of individual files.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Create a GitHub OAuth application and set its callback URL to `http://localhost:3000/api/auth/callback/github` for local development.
3. Fill in the GitHub OAuth credentials, an `AUTH_SECRET`, and an OpenAI API key.
4. Install dependencies with `npm install`.
5. Start the app with `npm run dev`.

## Security behavior

- Tree and dependency views may be used for public repositories without signing in.
- GitHub requests never fall back to a server-wide GitHub token. A private repository can only be accessed with the signed-in user's GitHub OAuth token.
- AI file summaries require sign-in. Chat, summary, tree, and dependency endpoints are limited to 20 requests per minute per user or client address.
- Repository owners, names, and file paths are validated before GitHub API requests are made.

For a multi-instance production deployment, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without them, rate limiting falls back to per-instance memory and is not sufficient for a distributed deployment.
- Apply `supabase/schema.sql` with a service-role Supabase key before enabling chat-history persistence. Row-level security is enabled and the browser must not receive that key.

## Limits

- GitHub can truncate very large repository trees. RepoGraph displays a warning when that happens.
- Dependency analysis currently examines at most 60 source files and tells the user when the result is incomplete.
- Dependency parsing supports JavaScript, TypeScript, JSX, TSX, and common Python import styles. Complex build aliases and language-specific edge cases may not be represented.

## Verification

Run these before deployment:

```bash
npm run lint
npm run build
```
