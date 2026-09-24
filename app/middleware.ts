import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request: req,
  })

  const url = req.nextUrl.clone()

  // 1. ADMIN ROUTE GUARD (உனது பழைய லாஜிக் - மாற்றமில்லை)
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const adminAuth = req.cookies.get('admin_authenticated')?.value
    if (adminAuth !== 'true') {
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  // 2. MERCHANT SUBSCRIPTION CHECK (Supabase Client பாதுகாப்பான அமைப்பு)
  if (url.pathname.startsWith('/merchant')) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // பயனர் விபரம் பெறுதல்
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: merchant } = await supabase
        .from('merchants')
        .select('subscription_status, trial_ends_at')
        .eq('id', user.id)
        .single()

      if (merchant) {
        const now = new Date()
        
        // Active அல்லது Trialing நிலைகள் செல்லுபடியாகும்
        const isSubValid = merchant.subscription_status === 'active' || merchant.subscription_status === 'trialing'
        const isExplicitlyExpired = merchant.subscription_status === 'expired' || merchant.subscription_status === 'cancelled'
        
        const trialEnd = merchant.trial_ends_at ? new Date(merchant.trial_ends_at) : null
        const isTrialOver = trialEnd ? now.getTime() >= trialEnd.getTime() : false

        // Expired அல்லது காலம் முடிந்திருந்தால் Header-இல் அனுப்பப்படும்
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