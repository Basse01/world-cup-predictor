import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  // PREVIEW MODE: skip Supabase auth when no real URL is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith('https://')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/register')
  const isApiRoute = request.nextUrl.pathname.startsWith('/api')
  const isRootPage = request.nextUrl.pathname === '/'

  if (!user && !isAuthPage && !isApiRoute && !isRootPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
