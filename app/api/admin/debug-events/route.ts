import { NextResponse } from 'next/server'

const API_BASE = 'https://v3.football.api-sports.io'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const fixtureId = url.searchParams.get('fixture') ?? '1489391'

  const res = await fetch(`${API_BASE}/fixtures/events?fixture=${fixtureId}`, {
    headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
    cache: 'no-store',
  })

  const raw = await res.json()
  return NextResponse.json({ httpStatus: res.status, fixtureId, raw })
}
