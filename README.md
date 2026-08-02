# Karangan BM AI Assistant

An AI research assistant that helps **Malaysian Bahasa Melayu teachers** prepare
essay (_karangan_) material. Give it a topic and it researches the topic across
the six **5W1H** angles — _Siapa, Apa, Bila, Di mana, Mengapa, Bagaimana_ —
returning fact cards (each with a fact, a statistic, a current case, and a real
source link) written in formal Bahasa Melayu. Teachers pick the facts they want,
save them as a report, and print / export them (PDF, Word, or copy-to-clipboard)
for classroom use.

> **Who it's for:** BM teachers preparing KSSM/SPM karangan material who want
> quick, sourced starting points — not a finished essay.

---

## Tech stack

- **Next.js 16** (App Router) + **React 19**
- **TypeScript**
- **Tailwind CSS v4** + **shadcn** components (Base UI, Nova preset)
- **OpenAI** Node SDK — Responses API with the built-in **web search** tool
- **Zod** for validating AI output
- **docx** + **file-saver** for Word / file downloads
- **sonner** for toast notifications
- **next-themes** for light/dark mode
- **framer-motion** for small animations

Data is stored entirely in the browser via **localStorage** — there is no
database (see [Data storage](#data-storage)).

---

## Prerequisites

- **Node.js LTS** (v20 or newer recommended)
- An **OpenAI API key** with access to the Responses API + web search tool

---

## Installation

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd karangan-bm-ai

# 2. Install dependencies
npm install
```

---

## Environment setup (`.env.local`)

Create a file named `.env.local` in the project root:

```bash
OPENAI_API_KEY=sk-your-key-here
```

> ⚠️ **Never commit `.env.local`.** It contains a secret key. The project's
> `.gitignore` already excludes `.env*` files — keep it that way. If a key is
> ever committed or leaked, **revoke it immediately** in the OpenAI dashboard
> and generate a new one.

The key is read **only on the server** (in `app/api/research/route.ts`), so it is
never sent to the browser.

---

## Running locally

```bash
npm run dev
```

Then open <http://localhost:3000>. Edit files and the page hot-reloads.

Other scripts:

```bash
npm run build   # production build
npm run start   # run the production build locally
npm run lint    # lint the code
```

---

## How the AI research works

1. When a teacher searches a topic, the browser fires **six requests in
   parallel** — one per 5W1H section — to the API route `POST /api/research`.
   Sections appear on screen progressively, as each response arrives.
2. For each section, the server builds a Bahasa Melayu prompt
   (`lib/ai/prompt.ts`) and calls the **OpenAI Responses API** with the
   **`web_search`** tool enabled (`gpt-4.1-mini`). The prompt requires the model
   to use web search and never invent facts, statistics, cases, URLs, or years,
   and to prioritise official/reputable sources (Malaysian bodies like SPRM,
   DOSM, KPM, KKM, Bernama, plus international ones like WHO, UNESCO, UN, World
   Bank, OECD, Reuters).
3. The model returns a JSON array of fact cards. The server parses it and
   validates **every card with Zod** (`lib/ai/schema.ts`). Cards that fail
   validation are **dropped** rather than failing the whole request; each valid
   card gets a unique `id`.
4. All text fields are in formal Bahasa Melayu. If no verifiable official
   statistic exists, the `statistic` field is exactly:
   **`"Tiada statistik rasmi ditemui"`**, which the UI shows with a warning icon.
5. **"Muat lagi"** fetches more cards for a single section, passing the existing
   facts so the model doesn't repeat itself.

A **best-effort in-memory rate limit** (20 requests/minute per IP) protects the
API route from accidental spamming. It resets on restart and is per-instance, so
it is a light guard, not a security control.

---

## Data storage

- All saved **reports** and **search history** live in the browser's
  **localStorage** (`lib/storage.ts`). **There is no database — this is by
  design**, keeping the app simple, free to run, and private to each device.
- **Backup / restore:** the sidebar footer has **"Sandaran data"** (download all
  reports + history as a `.json` file) and **"Pulih data"** (restore from such a
  file). Use this to move data between browsers or devices, or to keep a backup.
- Because data is per-browser, clearing browser data or using a different device
  starts fresh.

---

## Deploying to Vercel

1. Push the repository to GitHub/GitLab/Bitbucket.
2. In [Vercel](https://vercel.com), **New Project → Import** your repository.
   Vercel auto-detects Next.js; no special build settings are needed.
3. **Add the environment variable:** Project → **Settings → Environment
   Variables** → add `OPENAI_API_KEY` with your key, for the **Production** (and
   **Preview**, if you want) environments.
4. **Deploy.** After the first deploy, if you add or change the key, **redeploy**
   so the new value is picked up.

> The API route sets `maxDuration = 60` because web-search research can take a
> while — Vercel will allow up to 60s for that function.

---

## Troubleshooting

- **PowerShell: "running scripts is disabled on this system"** (Windows, when
  running `npm`): allow local scripts for your user, then reopen the terminal:
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
  ```
- **"Port 3000 is already in use":** another dev server is running. Stop it, or
  run on a different port:
  ```bash
  # macOS / Linux
  PORT=3001 npm run dev
  # Windows PowerShell
  $env:PORT=3001; npm run dev
  ```
- **"Missing API key" / 500 errors from research:** ensure `.env.local` exists
  with a valid `OPENAI_API_KEY`, and **restart** `npm run dev` after creating or
  editing it (env files are only read at startup).
- **Empty results / a section fails:** the model may have returned no valid cards
  for that angle, or web search hit a snag. Use **"Cuba lagi"** (retry) or
  **"Muat lagi"**. Very generic topics sometimes yield fewer cards.
- **Rate limited (429):** you've made more than 20 requests in a minute (one full
  search = six requests). Wait a moment and try again.
- **Hydration warnings in the console:** usually caused by **browser extensions**
  (e.g. dark-mode or translation extensions) that modify the page before React
  hydrates. They're harmless here; test in an incognito window with extensions
  disabled to confirm.

---

## Future improvements

- **Multi-device sync** — an optional backend/account so reports follow the
  teacher across devices (currently localStorage only).
- **More source filters** — let teachers restrict results to specific sources or
  regions (e.g. Malaysian-only, or a chosen ministry).
- **Essay-type presets** — templates for common karangan formats (e.g.
  _fakta_, _perbincangan_, _keperihalan_, surat) that tailor the research and
  output structure.

---

_Sila sahkan maklumat dengan sumber asal sebelum digunakan._ (Always verify
information against the original sources before use.)
