import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  
  // 1. பயனர் /admin/subscriptions போன்ற அட்மின் பக்கங்களை அணுக முயன்றால்
  if (url.pathname.startsWith('/admin') && !url.pathname.startsWith('/admin/login')) {
    
    // Cookie-இல் அட்மின் லாக் இன் ஆதாரம் உள்ளதா எனச் சரிபார்க்கிறது
    const adminAuth = req.cookies.get('admin_authenticated')?.value;

    // அட்மின் லாக் இன் செய்யவில்லை என்றால், அவர்களை அட்மின் லாக் இன் பக்கத்திற்குத் திருப்புகிறது
    if (adminAuth !== 'true') {
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};