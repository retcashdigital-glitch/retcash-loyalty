import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function verifyAdminCookie(token: string | undefined, secret: string): Promise<boolean> {
  if (!token || !token.includes('.') || !secret) return false

  const [encoded, sig] = token.split('.')
  if (!encoded || !sig) return false

  try {
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(encoded))
    const expectedHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    if (sig !== expectedHex) return false

    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const payload = JSON.parse(atob(padded))

    if (payload.role !== 'admin') return false
    if (Date.now() > Number(payload.exp || 0)) return false

    return true
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()

  // 1. ADMIN ROUTE GUARD (Cryptographically Verified)
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    const adminCookie = req.cookies.get('admin_authenticated')?.value
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const isValidAdmin = await verifyAdminCookie(adminCookie, secret)

    if (!isValidAdmin) {
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next({
    request: req,
  })
}

export const config = {
  matcher: ['/admin/:path*', '/merchant/:path*'],
}