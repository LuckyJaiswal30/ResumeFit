# ResumeFit

Compares a resume against a job posting and reports what it can prove.

A match only counts when the analysis can quote the line in your resume
that backs it up. Anything it cannot place is moved into the gaps rather
than counted in your favour, which is what stops a skills list from
inflating the score.

## Running it

```bash
pnpm install
cp .env.example .env.local   # add a Gemini or Groq key
pnpm dev
```

Without a key the app still works. Analysis falls back to comparing the
wording of both documents, and the results page says so.

## Checks

```bash
pnpm test          # node --test, no network access
pnpm lint          # eslint 10, flat config
pnpm format:check  # prettier
pnpm exec tsc --noEmit
```

The same four run in CI before anything deploys.

## How it fits together

| Path                   | What lives there                                                    |
| ---------------------- | ------------------------------------------------------------------- |
| `app/api/extract-text` | Reads PDF, DOCX and TXT, then rejects anything that is not a resume |
| `app/api/analyze`      | Scores the resume against the posting                               |
| `lib/resume`           | Extraction, resume detection, matching, scoring, the parser report  |
| `lib/ai`               | Provider config, the request client, the review prompt and schemas  |
| `lib/security`         | Per-client rate limiting and the shared Upstash client              |

## Model usage

Gemini is the default. Its free tier allows more than twice the daily
requests of the Groq alternative and takes a larger prompt, so long
resumes are not truncated.

Three things keep usage down:

- Results are cached by a hash of the provider, model, resume and
  posting, so an identical re-run costs nothing.
- A shared allowance caps requests per minute and per day across all
  visitors, sized under the free tier. Running out falls back to keyword
  matching instead of failing.
- A rate-limited response is not retried, since retrying spends more of
  the quota that just ran out.

Set `AI_BUDGET_PER_MINUTE` and `AI_BUDGET_PER_DAY` to match your own
limits. Every setting is listed in `.env.example`.

## Deploying

`pnpm build` produces a standalone server and copies the static assets
next to it. The PDF worker and its fonts are traced in explicitly.

Provider keys are read per request, so they belong in the Static Web
Apps application settings. The standalone server does not read
`.env.local`.
