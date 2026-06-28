# Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Web Push notifications to the VM 2026 PWA — match reminders (30 min before kickoff, only for users who haven't tipped that match) and group chat notifications (throttled to 1 push per user per 5 minutes).

**Architecture:** Three DB migrations add storage + deduplication guards. A `lib/push.ts` server utility wraps `web-push`. Triggers fire from the existing cron job (match reminders) and a new `/api/chat` route (chat notifications). Chat insertion is moved from direct Supabase client in the browser to `/api/chat` so the server can trigger push — this is the key bug fix. The `PushInit` client component auto-prompts on first load; a `NotificationToggle` in the profile page lets users opt out.

**Tech Stack:** `web-push` npm package (VAPID sending), Supabase (subscription storage + throttle state), Web Push API + Service Worker (browser), Next.js App Router API routes (triggers).

---

## File Map

**New files:**
- `supabase/migrations/014_push_subscriptions.sql` — push_subscriptions table + RLS
- `supabase/migrations/015_matches_reminder_sent_at.sql` — dedup column on matches
- `supabase/migrations/016_profiles_last_chat_push_at.sql` — throttle column on profiles
- `public/sw.js` — service worker: push event → show notification, click → navigate
- `lib/push.ts` — server-only utility: send to user ID list, clean up 410 endpoints
- `app/api/push/subscribe/route.ts` — POST (save) + DELETE (remove) subscription
- `app/api/chat/route.ts` — POST: insert message + fire chat push
- `hooks/usePushNotifications.ts` — client hook: SW register, permission, subscribe/unsubscribe
- `components/push-init.tsx` — invisible client component: auto-prompt on protected page load
- `components/notification-toggle.tsx` — toggle switch for profile page

**Modified files:**
- `components/chat-window.tsx` — replace direct Supabase insert with `fetch('/api/chat')`
- `app/(app)/layout.tsx` — import + render `<PushInit />`
- `app/(app)/profile/[userId]/page.tsx` — add `<NotificationToggle />` in `isMe` section
- `app/api/cron/sync-matches/route.ts` — add match reminder logic after upsert
- `.env.local` — add `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

---

## Task 1: DB Migration — push_subscriptions table

**Files:**
- Create: `supabase/migrations/014_push_subscriptions.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/014_push_subscriptions.sql
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with:
- `name`: `014_push_subscriptions`
- `query`: contents of the file above

Expected: migration applied successfully, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/014_push_subscriptions.sql
git commit -m "feat: add push_subscriptions table with RLS"
```

---

## Task 2: DB Migration — reminder_sent_at on matches

**Files:**
- Create: `supabase/migrations/015_matches_reminder_sent_at.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/015_matches_reminder_sent_at.sql
ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- `name`: `015_matches_reminder_sent_at`
- `query`: `ALTER TABLE matches ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz DEFAULT NULL;`

Expected: column added, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/015_matches_reminder_sent_at.sql
git commit -m "feat: add reminder_sent_at to matches for push deduplication"
```

---

## Task 3: DB Migration — last_chat_push_at on profiles

**Files:**
- Create: `supabase/migrations/016_profiles_last_chat_push_at.sql`

- [ ] **Step 1: Write migration file**

```sql
-- supabase/migrations/016_profiles_last_chat_push_at.sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_chat_push_at timestamptz DEFAULT NULL;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- `name`: `016_profiles_last_chat_push_at`
- `query`: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_chat_push_at timestamptz DEFAULT NULL;`

Expected: column added, no errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/016_profiles_last_chat_push_at.sql
git commit -m "feat: add last_chat_push_at to profiles for chat push throttle"
```

---

## Task 4: Install web-push + generate VAPID keys

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Install package**

```bash
cd world-cup-predictor
npm install web-push
npm install --save-dev @types/web-push
```

Expected: `web-push` appears in `package.json` dependencies.

- [ ] **Step 2: Generate VAPID keys**

```bash
npx web-push generate-vapid-keys
```

Output looks like:
```
=======================================
Public Key:
BExamplePublicKeyBase64UrlString...

Private Key:
ExamplePrivateKeyBase64UrlString...
=======================================
```

Copy both values.

- [ ] **Step 3: Add to .env.local**

Add these three lines to `world-cup-predictor/.env.local`:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<paste public key here>
VAPID_PRIVATE_KEY=<paste private key here>
VAPID_SUBJECT=mailto:bjorkenbasse@gmail.com
```

- [ ] **Step 4: Add to Vercel (production)**

Add the same three env vars to the Vercel project via the dashboard or `vercel env add`. `NEXT_PUBLIC_VAPID_PUBLIC_KEY` should be set for Production + Preview + Development. `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` are server-only (no NEXT_PUBLIC_ prefix) — set for Production + Preview only.

- [ ] **Step 5: Commit package changes (not .env.local)**

```bash
git add world-cup-predictor/package.json world-cup-predictor/package-lock.json
git commit -m "feat: add web-push dependency"
```

---

## Task 5: Service Worker

**Files:**
- Create: `public/sw.js`

- [ ] **Step 1: Write service worker**

```javascript
// public/sw.js
self.addEventListener('push', event => {
  if (!event.data) return

  const { title, body, url } = event.data.json()

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      data: { url: url ?? '/dashboard' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const targetUrl = new URL(
    event.notification.data?.url ?? '/dashboard',
    self.location.origin
  ).href

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c => c.url === targetUrl)
        if (existing) return existing.focus()
        return clients.openWindow(targetUrl)
      })
  )
})
```

- [ ] **Step 2: Commit**

```bash
git add world-cup-predictor/public/sw.js
git commit -m "feat: add push notification service worker"
```

---

## Task 6: Server push utility

**Files:**
- Create: `lib/push.ts`

- [ ] **Step 1: Write lib/push.ts**

```typescript
import 'server-only'
import webpush from 'web-push'
import { createAdminClient } from '@/lib/supabase/admin'

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_SUBJECT}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string }
): Promise<void> {
  if (userIds.length === 0) return

  const supabase = createAdminClient()
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('user_id', userIds)

  if (!subs || subs.length === 0) return

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/dashboard',
  })

  const results = await Promise.allSettled(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      )
    )
  )

  // Remove expired subscriptions (HTTP 410 Gone)
  const expiredEndpoints = subs
    .filter((_, i) => {
      const r = results[i]
      if (r.status !== 'rejected') return false
      return (r.reason as { statusCode?: number })?.statusCode === 410
    })
    .map(s => s.endpoint)

  if (expiredEndpoints.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', expiredEndpoints)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add world-cup-predictor/lib/push.ts
git commit -m "feat: add sendPushToUsers server utility"
```

---

## Task 7: Push subscription API route

**Files:**
- Create: `app/api/push/subscribe/route.ts`

- [ ] **Step 1: Write route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { endpoint?: string; p256dh?: string; auth?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { endpoint, p256dh, auth } = body
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json(
      { error: 'endpoint, p256dh, and auth are required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert(
      { user_id: user.id, endpoint, p256dh, auth },
      { onConflict: 'endpoint' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  // Suppress unused-variable warning — request is required by Next.js route signature
  void request

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add world-cup-predictor/app/api/push/subscribe/route.ts
git commit -m "feat: add push subscription API (POST + DELETE)"
```

---

## Task 8: usePushNotifications hook

**Files:**
- Create: `hooks/usePushNotifications.ts`

- [ ] **Step 1: Write hook**

```typescript
'use client'
import { useCallback, useEffect, useState } from 'react'

export type PushState = 'unsupported' | 'default' | 'granted' | 'denied'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function usePushNotifications() {
  const [pushState, setPushState] = useState<PushState>('default')

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPushState('unsupported')
      return
    }
    setPushState(Notification.permission as PushState)
  }, [])

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const permission = await Notification.requestPermission()
      setPushState(permission as PushState)
      if (permission !== 'granted') return false

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      })

      const p256dh = sub.getKey('p256dh')
      const auth = sub.getKey('auth')
      if (!p256dh || !auth) return false

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          p256dh: btoa(String.fromCharCode(...new Uint8Array(p256dh))),
          auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
        }),
      })

      return true
    } catch {
      return false
    }
  }, [])

  const unsubscribe = useCallback(async (): Promise<void> => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        if (sub) await sub.unsubscribe()
      }
      await fetch('/api/push/subscribe', { method: 'DELETE' })
      setPushState('default')
    } catch {
      // ignore — browser state and DB state may already be clean
    }
  }, [])

  return { pushState, subscribe, unsubscribe }
}
```

- [ ] **Step 2: Commit**

```bash
git add world-cup-predictor/hooks/usePushNotifications.ts
git commit -m "feat: add usePushNotifications client hook"
```

---

## Task 9: PushInit component + wire into app layout

**Files:**
- Create: `components/push-init.tsx`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Write PushInit component**

```typescript
// components/push-init.tsx
'use client'
import { useEffect } from 'react'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function PushInit() {
  const { pushState, subscribe } = usePushNotifications()

  useEffect(() => {
    if (pushState === 'unsupported' || pushState === 'denied') return
    if (sessionStorage.getItem('push_init_done')) return

    // Already granted: silently re-register SW and refresh subscription
    // Not yet asked: wait 3 s before prompting (less intrusive than immediate)
    const delay = pushState === 'granted' ? 0 : 3000
    const timer = setTimeout(async () => {
      const ok = await subscribe()
      if (ok) sessionStorage.setItem('push_init_done', '1')
    }, delay)

    return () => clearTimeout(timer)
  }, [pushState, subscribe])

  return null
}
```

- [ ] **Step 2: Add PushInit to app layout**

Open `app/(app)/layout.tsx`. The current file is:

```typescript
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import Nav from '@/components/nav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, onboarding_completed, display_name')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      <Nav isAdmin={profile?.is_admin ?? false} userId={user.id} displayName={profile?.display_name ?? ''} />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  )
}
```

Replace with:

```typescript
import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import Nav from '@/components/nav'
import PushInit from '@/components/push-init'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, onboarding_completed, display_name')
    .eq('id', user.id)
    .single()

  if (profile && !profile.onboarding_completed) redirect('/onboarding')

  return (
    <div className="min-h-screen">
      <Nav isAdmin={profile?.is_admin ?? false} userId={user.id} displayName={profile?.display_name ?? ''} />
      <PushInit />
      <main className="max-w-5xl mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add world-cup-predictor/components/push-init.tsx world-cup-predictor/app/\(app\)/layout.tsx
git commit -m "feat: add PushInit component and auto-prompt on protected pages"
```

---

## Task 10: NotificationToggle + profile page

**Files:**
- Create: `components/notification-toggle.tsx`
- Modify: `app/(app)/profile/[userId]/page.tsx`

- [ ] **Step 1: Write NotificationToggle**

```typescript
// components/notification-toggle.tsx
'use client'
import { usePushNotifications } from '@/hooks/usePushNotifications'

export default function NotificationToggle() {
  const { pushState, subscribe, unsubscribe } = usePushNotifications()

  if (pushState === 'unsupported') {
    return (
      <p className="text-xs text-white/40">
        Push-notiser stöds inte i din webbläsare. Lägg till appen på hemskärmen för att aktivera.
      </p>
    )
  }

  const isEnabled = pushState === 'granted'
  const isDenied = pushState === 'denied'

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-wc-light-gray font-medium">Push-notiser</div>
        <div className="text-xs text-white/50 mt-0.5">
          {isEnabled
            ? 'Matchpåminnelser och chattmeddelanden'
            : isDenied
            ? 'Blockerade i webbläsarens inställningar'
            : 'Inaktiverade'}
        </div>
      </div>
      {!isDenied && (
        <button
          onClick={isEnabled ? unsubscribe : subscribe}
          aria-label={isEnabled ? 'Stäng av notiser' : 'Slå på notiser'}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
            isEnabled ? 'bg-wc-green' : 'bg-[#2a2a2a]'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Add NotificationToggle to profile page**

Open `app/(app)/profile/[userId]/page.tsx`. Add the import at the top (after existing imports):

```typescript
import NotificationToggle from '@/components/notification-toggle'
```

Find the `isMe` section that currently renders the bonus section:

```typescript
{isMe ? (
  <div className="space-y-3">
    <h2 className="font-display text-sm uppercase tracking-widest text-white/50 px-1">
      Bonusgissningar
    </h2>
    ...
  </div>
) : (
```

Replace the outer `isMe` block with:

```typescript
{isMe ? (
  <>
    {/* Notification settings */}
    <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a]">
      <h2 className="font-display text-sm uppercase tracking-widest text-white/50 mb-4">
        Notiser
      </h2>
      <NotificationToggle />
    </div>

    {/* Bonus predictions */}
    <div className="space-y-3">
      <h2 className="font-display text-sm uppercase tracking-widest text-white/50 px-1">
        Bonusgissningar
      </h2>
      {(bonusTypes ?? []).length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2a2a2a] text-center">
          <p className="text-white/50 text-sm">Inga bonusfrågor har lagts till än.</p>
        </div>
      ) : (
        (bonusTypes ?? []).map((bt: BonusType) => (
          <BonusForm
            key={bt.type}
            bonusType={bt}
            existing={predMap.get(bt.type) as BonusPrediction | undefined}
            options={optionsByType.get(bt.type)}
          />
        ))
      )}
    </div>
  </>
) : (
```

- [ ] **Step 3: Commit**

```bash
git add world-cup-predictor/components/notification-toggle.tsx world-cup-predictor/app/\(app\)/profile/\[userId\]/page.tsx
git commit -m "feat: add notification toggle to profile page"
```

---

## Task 11: Chat API route (bug fix + push trigger)

**Files:**
- Create: `app/api/chat/route.ts`
- Modify: `components/chat-window.tsx`

- [ ] **Step 1: Create /api/chat route**

```typescript
// app/api/chat/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUsers } from '@/lib/push'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { content?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const content = body.content?.trim()
  if (!content || content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: 'content must be 1–500 characters' }, { status: 400 })
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({ user_id: user.id, content })
    .select('id')
    .single()

  if (error || !message) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 })
  }

  // Fire-and-forget: don't await so the response returns immediately
  void sendChatPush(user.id, content)

  return NextResponse.json({ id: message.id })
}

async function sendChatPush(senderId: string, content: string): Promise<void> {
  try {
    const admin = createAdminClient()
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // Find all users with push subscriptions except the sender
    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('user_id')
      .neq('user_id', senderId)

    if (!subs || subs.length === 0) return

    const subUserIds = [...new Set(subs.map(s => s.user_id as string))]

    // Fetch sender name and eligible recipients (not notified in last 5 min) in parallel
    const [{ data: senderProfile }, { data: eligibleProfiles }] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', senderId).single(),
      admin
        .from('profiles')
        .select('id')
        .in('id', subUserIds)
        .or(`last_chat_push_at.is.null,last_chat_push_at.lt.${fiveMinutesAgo}`),
    ])

    if (!eligibleProfiles || eligibleProfiles.length === 0) return

    const eligibleIds = eligibleProfiles.map(p => p.id as string)
    const senderName = senderProfile?.display_name ?? 'Någon'
    const body = content.length > 60 ? content.slice(0, 57) + '…' : content

    await sendPushToUsers(eligibleIds, {
      title: `💬 ${senderName}`,
      body,
      url: '/dashboard',
    })

    // Update throttle timestamp for notified users
    await admin
      .from('profiles')
      .update({ last_chat_push_at: new Date().toISOString() })
      .in('id', eligibleIds)
  } catch {
    // Never let push errors propagate — the message was already saved
  }
}
```

- [ ] **Step 2: Refactor ChatWindow to use /api/chat**

Open `components/chat-window.tsx`. Find the `sendMessage` function's insert block (lines 104–124):

```typescript
    const { data, error } = await supabase
      .from('messages')
      .insert({ user_id: userId, content: trimmed })
      .select('id')
      .single()

    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInput(trimmed)
      setSendError('Kunde inte skicka meddelandet. Försök igen.')
      setSending(false)
      return
    }

    if (data?.id) {
      // Mark real ID so realtime skips it, then swap optimistic placeholder
      pendingIds.current.add(data.id)
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, id: data.id } : m
      ))
    }
```

Replace with:

```typescript
    let messageId: string | null = null
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed }),
      })
      if (!res.ok) throw new Error('Send failed')
      const json = await res.json() as { id: string }
      messageId = json.id
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      setInput(trimmed)
      setSendError('Kunde inte skicka meddelandet. Försök igen.')
      setSending(false)
      return
    }

    if (messageId) {
      // Mark real ID so realtime skips it, then swap optimistic placeholder
      pendingIds.current.add(messageId)
      setMessages(prev => prev.map(m =>
        m.id === optimisticId ? { ...m, id: messageId! } : m
      ))
    }
```

Note: the `supabase` instance created on line 16 (`const supabase = useMemo(() => createClient(), [])`) is still used for the realtime subscription — do NOT remove it.

- [ ] **Step 3: Commit**

```bash
git add world-cup-predictor/app/api/chat/route.ts world-cup-predictor/components/chat-window.tsx
git commit -m "fix: move chat insert to API route and add chat push notifications"
```

---

## Task 12: Match reminder in cron job

**Files:**
- Modify: `app/api/cron/sync-matches/route.ts`

- [ ] **Step 1: Add import at top of sync-matches route**

After the existing imports (after line 11), add:

```typescript
import { sendPushToUsers } from '@/lib/push'
```

- [ ] **Step 2: Add reminder logic after the upsert**

Find this block in the route (around line 97–103):

```typescript
  const { error: upsertError } = await supabase
    .from('matches')
    .upsert(matchesToUpsert, { onConflict: 'api_match_id' })

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 })
  }
```

Insert the following AFTER the `if (upsertError)` block:

```typescript
  // ── Push reminders: notify users who haven't tipped matches locking soon ──
  let reminderssent = 0
  if (isMatchWindow) {
    const in5min = new Date(now.getTime() + 5 * 60 * 1000).toISOString()

    const { data: lockingSoon } = await supabase
      .from('matches')
      .select('id, home_team, away_team, stage')
      .eq('status', 'scheduled')
      .gte('lock_at', nowIso)
      .lte('lock_at', in5min)
      .is('reminder_sent_at', null)

    if (lockingSoon && lockingSoon.length > 0) {
      const { data: allProfiles } = await supabase.from('profiles').select('id')

      for (const match of lockingSoon) {
        const { data: existingPreds } = await supabase
          .from('predictions')
          .select('user_id')
          .eq('match_id', match.id)

        const predictedIds = new Set(
          (existingPreds ?? []).map((p: { user_id: string }) => p.user_id)
        )
        const unpredictedIds = (allProfiles ?? [])
          .map((p: { id: string }) => p.id)
          .filter(id => !predictedIds.has(id))

        const tipUrl = match.stage === 'group' ? '/tips/gruppspel' : '/tips/slutspel'

        if (unpredictedIds.length > 0) {
          await sendPushToUsers(unpredictedIds, {
            title: '⚽ Glöm inte tippa!',
            body: `${match.home_team} vs ${match.away_team} låser snart`,
            url: tipUrl,
          })
        }

        await supabase
          .from('matches')
          .update({ reminder_sent_at: nowIso })
          .eq('id', match.id)

        remindersent++
      }
    }
  }
```

Note: `remindersent` is declared with `let remindersent = 0` in the block above — add it to the return JSON at the bottom of the route:

```typescript
  return NextResponse.json({
    synced: matchesToUpsert.length,
    groups_inferred: teamGroupMap.size,
    points_processed: unprocessedFinished?.length ?? 0,
    events_synced: eventsSynced,
    reminders_sent: remindersent,   // ← add this line
    match_window: isMatchWindow,
    timestamp: new Date().toISOString(),
  })
```

- [ ] **Step 3: Commit**

```bash
git add world-cup-predictor/app/api/cron/sync-matches/route.ts
git commit -m "feat: add match reminder push notifications to cron job"
```

---

## Task 13: End-to-end verification

- [ ] **Step 1: Build check**

```bash
cd world-cup-predictor && npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 2: Verify service worker is served**

Start the dev server (`npm run dev`) and open `http://localhost:3000/sw.js` in the browser. You should see the service worker JavaScript (not a 404).

- [ ] **Step 3: Verify manifest is served**

Open `http://localhost:3000/manifest.webmanifest`. Should return JSON with `name: "VM 2026 Tippning"`.

- [ ] **Step 4: Test permission prompt**

Open the app in a fresh browser session (or incognito). Log in. After ~3 seconds, the browser permission dialog should appear asking "VM 2026 vill skicka notiser". Accept it.

- [ ] **Step 5: Verify subscription was saved**

After accepting, run in Supabase SQL editor:

```sql
SELECT user_id, endpoint, created_at FROM push_subscriptions ORDER BY created_at DESC LIMIT 5;
```

Expected: a row exists for the logged-in user.

- [ ] **Step 6: Test opt-out toggle**

Navigate to `/profile/{your-user-id}`. The "Notiser" section should show a green toggle. Click it to disable. Re-run the SQL above — the row should be gone.

- [ ] **Step 7: Test chat notification**

Log in as user A in one browser, user B in another. User A sends a chat message. Within seconds, user B (if they have push permissions) should receive a push notification with "💬 [User A name]: [message]".

- [ ] **Step 8: Verify chat throttle**

Send multiple chat messages in quick succession. User B should only receive one push per 5-minute window.

- [ ] **Step 9: Verify match reminder (manual trigger test)**

Find a scheduled match in the DB. Set its `lock_at` to 2 minutes in the future and `reminder_sent_at` to NULL. Wait for the cron to fire (or trigger it manually via curl with the CRON_SECRET). Check that unpredicted users receive a push. Check that `reminder_sent_at` is now set on that match.

```sql
-- Find a scheduled match to test with
SELECT id, home_team, away_team, lock_at, reminder_sent_at
FROM matches WHERE status = 'scheduled' LIMIT 5;

-- After test: verify reminder_sent_at was set
SELECT id, home_team, reminder_sent_at FROM matches WHERE id = '<match-id>';
```
