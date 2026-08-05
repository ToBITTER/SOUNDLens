# SoundLens

SoundLens is a Spotify analytics SaaS that turns listening history into daily, weekly, monthly, and yearly insights.

## Stack

- Next.js 15
- React
- TypeScript
- Prisma
- PostgreSQL
- Redis
- Spotify Web API

## Local setup

1. Copy `.env.example` to `.env`
2. Set `DATABASE_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SESSION_SECRET`, and `JOB_SECRET`
3. Install dependencies
4. Run Prisma generate and migrations
5. Start the dev server

## Scripts

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:studio`
