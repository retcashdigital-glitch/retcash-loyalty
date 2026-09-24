import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const url = req.nextUrl.clone()

  // 1. ADMIN ROUTE GUARD
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const adminAuth = req.cookies.get('admin_authenticated')?.value
    if (adminAuth !== 'true') {
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // 2. MERCHANT SUBSCRIPTION CHECK
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Environment Variables இருந்தால் மட்டுமே Supabase செக் இயங்கும்
  if (url.pathname.startsWith('/merchant') && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request: req,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single()

      if (merchant) {
        const now = new Date()
        const isSubValid = merchant.subscription_status === 'active' || merchant.subscription_status === 'trialing'
        const isExplicitlyExpired = merchant.subscription_status === 'expired' || merchant.subscription_status === 'cancelled'
        
        const trialEnd = merchant.trial_ends_at ? new Date(merchant.trial_ends_at) : null
        const isTrialOver = trialEnd ? now.getTime() >= trialEnd.getTime() : false

        if (isExplicitlyExpired || (!isSubValid && isTrialOver) || (merchant.subscription_status === 'trialing' && isTrialOver)) {
          supabaseResponse.headers.set('x-subscription-status', 'expired')
        }
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/merchant/:path*'],
}