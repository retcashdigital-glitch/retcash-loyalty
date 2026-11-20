import crypto from 'crypto'

export const CUSTOMER_SESSION_COOKIE = 'retcash_cust_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface CustomerSessionPayload {
  customerId: string
  phone: string // normalized 94XXXXXXXXX
  exp: number // unix epoch seconds
}

function getSigningSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'retcash-dev-fallback-secret-change-in-prod'
  )
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

export function createCustomerSessionToken(payload: Omit<CustomerSessionPayload, 'exp'>): string {
  const fullPayload: CustomerSessionPayload = {
    customerId: String(payload.customerId),
    phone: String(payload.phone),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  }

  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload))
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url')

  return `${encodedPayload}.${signature}`
}

export function verifyCustomerSessionToken(token?: string | null): CustomerSessionPayload | null {
  if (!token || typeof token !== 'string') return null
  const parts = token.split('.')
  if (parts.length !== 2) return null

  const [encodedPayload, providedSig] = parts
  if (!encodedPayload || !providedSig) return null

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url')

  const providedBuf = Buffer.from(providedSig)
  const expectedBuf = Buffer.from(expectedSig)

  if (providedBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as CustomerSessionPayload
    if (!parsed?.customerId || !parsed?.phone || typeof parsed.exp !== 'number') {
      return null
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function getCustomerSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  }
}