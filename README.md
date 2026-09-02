# ResumeFit

Compares a resume against a job posting and reports only what it can prove.

Most resume checkers match keywords. If "Kubernetes" appears in your
skills list, you match Kubernetes. ResumeFit refuses to score it that
way: a requirement only counts when the analysis can quote the line in
your experience that demonstrates it. Anything it cannot place is moved
into the gaps instead.

That distinction is not theoretical. On a real run, the model claimed
Next.js, Jest and Figma as covered, citing nothing but the words from a
skills list. All three were rejected and the score dropped accordingly.

## What makes it different

**Every match is quoted.** Claims come back with the exact sentence from
your resume that backs them. Quotes are verified against your text
before display, so a line the model invented never reaches the page.

**Missing and unproven are not the same problem.** A requirement your
resume never mentions needs experience you may not have. One you listed
but never demonstrated needs a sentence. The results page separates them,
because the fix is completely different.

**Nothing gets invented.** Suggested bullet rewrites are filtered: any
rewrite introducing a number that is not in your original is discarded
before you see it. A bullet with no measurable result gets a stronger
verb, not a fabricated percentage.

**It says when it did not really read anything.** If no model is
configured or the call fails, the analysis falls back to comparing
wording, and the page states that plainly rather than passing a keyword
match off as a considered read.

## Trying it without uploading anything

**See an example** on the home and upload pages opens a finished
analysis. It is real output, produced by running an invented resume
against a real posting once and saving the response, so every section is
populated including two skills that were claimed but never demonstrated.
The fixture ships with the page and is read like any other result, so it
makes no request and spends no quota.

The results page also ranks what to fix first, derived from the analysis
rather than from a second model call. A requirement you named but never
evidenced ranks above one you never mentioned: both cost the same in
score, but the first is a bullet you can write tonight. Suggested
rewrites can be copied, and the whole analysis downloads as a markdown
file, since results otherwise live only in the tab that produced them.

## The flow

```
  /upload                        /api/extract-text            /api/analyze
  ┌────────────────┐             ┌──────────────────┐        ┌──────────────────┐
  │ resume file    │──────────▶  │ PDF / DOCX / TXT │───────▶│ requirements     │
  │ job posting    │             │ → plain text     │        │ pulled from post │
  └────────────────┘             │ reject non-CVs   │        │ matched + quoted │
                                 └──────────────────┘        │ quotes verified  │
                                                             └────────┬─────────┘
                                                                      ▼
                                                             /results
                                                             score, aligned,
                                                             listed-but-unproven,
                                                             absent, rewrites,
                                                             parser report
```

Results are handed between pages through session storage. They belong to
the tab that produced them and are never written to a server.

## Stack

- Next.js 16 (App Router) on React 19
- TypeScript 6, ESLint 10 with a flat config, Prettier
- Tailwind CSS v4, tokens as CSS custom properties, no component library
- `pdfjs-dist` for PDF text, `mammoth` for DOCX, `zod` for response
  validation
- `node --test` for the suite, no test framework dependency
- Deployed on Vercel

## Model providers

Gemini is the provider this runs on. `gemini-3.5-flash-lite` is the
default model.

Groq is supported as a **manual fallback**, not an active second
provider. There is no automatic failover: if Gemini fails or its budget
is spent, the app degrades to keyword matching rather than switching.
Groq is reached only by setting `AI_PROVIDER=groq` with a `GROQ_API_KEY`
present, which is useful during a Gemini outage or for local work. Its
request shape is covered by tests, though it has not been exercised
against the live Groq API here. It is also the weaker option: roughly 40
analyses a day against Gemini's several hundred, and a smaller prompt
budget that truncates long resumes.

## Keeping model usage down

This is built to run on a free tier, so three things guard the quota.

**Caching.** Results are keyed by a SHA-256 hash of the provider, model,
resume and posting. An identical re-run is served from the store and
costs nothing. The cache lives in Upstash Redis when configured, so a
second instance or a cold start still gets the hit, and falls back to an
in-process map otherwise.

**A shared allowance.** Per-client rate limiting cannot protect a quota
that every visitor draws from, so analysis also reserves against a
ceiling shared across everyone, keyed to the provider and model in use.
Defaults sit under the published free-tier limits. Running out does not
fail the request: it falls through to keyword matching with the reason
attached.

**No retry on a rate limit.** A 429 means the quota is gone, so retrying
spends more of what just ran out. Timeouts and provider faults still get
their one retry; rate limits do not.

## Setup

```bash
pnpm install
cp .env.example .env.local   # add GEMINI_API_KEY
pnpm dev
```

Without a key the app still runs. Analysis compares the wording of both
documents and the results page says so. Every setting is listed in
`.env.example`, including `AI_BUDGET_PER_MINUTE` and `AI_BUDGET_PER_DAY`
for matching your own limits.

## Checks

```bash
pnpm test          # node --test, makes no network calls
pnpm lint
pnpm format:check
pnpm exec tsc --noEmit
```

All four run in CI on every push. The suite is fully stubbed: a network
monitor hooking `fetch`, `net.connect`, `tls.connect` and `dns.lookup`
confirms zero outbound connections across the whole run, so running the
tests never spends quota.

## Layout

| Path                   | What lives there                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `app/api/extract-text` | Reads PDF, DOCX and TXT; rejects anything that is not a resume                     |
| `app/api/analyze`      | Scores a resume against a posting                                                  |
| `lib/resume`           | Extraction, resume detection, matching, scoring, evidence grounding, parser report |
| `lib/ai`               | Provider config, request client, review prompt and schemas                         |
| `lib/security`         | Rate limiting and the shared Upstash client                                        |
| `components/results`   | The results display                                                                |

## Notes from building it

The interesting problem here was not calling a model. It was not
trusting it.

An early version took the model's word for coverage, and it was
generous: list a tool in your skills section and it would call that a
match. The fix was to require a quote for every claim and verify the
quote actually appears in the resume, with a tolerance for whitespace
and light rewording. Claims that fail verification are demoted rather
than dropped, which is why a "listed but not shown" category exists at
all. That category came out of watching real output, not from planning.

The second lesson was that a free tier fails in ways that are easy to
make worse. Retrying a 429 sends another request into a quota that has
already run out. Per-IP rate limiting does nothing for a shared budget.
Both were real bugs found by reading the actual limits rather than
assuming them.
