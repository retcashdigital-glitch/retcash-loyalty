import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl

    if (pathname.startsWith('/wallet') || pathname.startsWith('/card')) {
        return NextResponse.next()
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/wallet/:path*', '/card/:path*'],
}