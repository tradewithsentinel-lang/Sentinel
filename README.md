# Sentinel

Sentinel is an AI trading co-pilot web app that analyzes a trader's CSV trade history and flags destructive patterns like revenge trading and overtrading.

## Stack

- Next.js (App Router)
- Tailwind CSS
- Anthropic SDK (`@anthropic-ai/sdk`)

## Local Setup

1. Install dependencies:
   - `npm install`
2. Create environment file:
   - Copy `.env.example` to `.env.local`
   - Set `ANTHROPIC_API_KEY`
3. Start development server:
   - `npm run dev`
4. Open [http://localhost:3000](http://localhost:3000)

## Behavior Analysis Output

After CSV upload, Sentinel requests an analysis report that includes:

- Win rate
- Revenge trading patterns
- Overtrading patterns
- Trader hidden edge
- Single highest-impact saving rule

## Deploy To Vercel

1. Push this project to GitHub.
2. Import repo in Vercel.
3. Set environment variable in Vercel project settings:
   - `ANTHROPIC_API_KEY`
4. Deploy.

The app is now production-ready on Vercel.
