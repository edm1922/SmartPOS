import { createServerClient, type Cookie } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          });
          res = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });
          res.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/admin/login', req.url));
    }
    
    // Check if user is admin (in a real app, you would check the user's role from your database)
    // For now, we'll assume that if they're logged in, they can access admin routes
  }

  // Protect cashier routes
  if (req.nextUrl.pathname.startsWith('/cashier')) {
    if (!session) {
      return NextResponse.redirect(new URL('/auth/cashier/login', req.url));
    }
    
    // Check if user is cashier (in a real app, you would check the user's role from your database)
    // For now, we'll assume that if they're logged in, they can access cashier routes
  }

  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
};