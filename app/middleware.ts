import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const url = req.nextUrl.clone();

  // /admin பக்கங்களுக்குச் செல்ல முயற்சித்தால்
  if (url.pathname.startsWith('/admin')) {
    if (!session) {
      url.pathname = '/merchant/login'; // உங்கள் Login பக்கம்
      return NextResponse.redirect(url);
    }

    // உங்களது Admin Email முகவரியை மட்டும் அனுமதிக்க
    const ADMIN_EMAIL = 'your-email@gmail.com'; // உங்கள் மின்னஞ்சலை இடுக
    if (session.user.email !== ADMIN_EMAIL) {
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*'],
};