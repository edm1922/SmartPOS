import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  console.log('Middleware triggered for:', req.nextUrl.pathname);
  
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
  
  console.log('Session in middleware:', session ? 'exists' : 'null');

  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin')) {
    console.log('Checking admin route protection');
    if (!session) {
      console.log('No session, redirecting to admin login');
      return NextResponse.redirect(new URL('/auth/admin/login', req.url));
    }
    
    // Check if user is admin (in a real app, you would check the user's role from your database)
    // For now, we'll assume that if they're logged in, they can access admin routes
    console.log('Session exists, allowing access to admin route');
  }

  // Protect cashier routes
  if (req.nextUrl.pathname.startsWith('/cashier')) {
    console.log('Checking cashier route protection');
    
    // Check for our custom cashier session
    const cashierSession = req.cookies.get('cashier_session')?.value;
    
    // Also check if there's a custom session in localStorage (client-side)
    // Note: We can't directly access localStorage in middleware, so we check for a cookie we set
    const hasCashierSession = session || cashierSession;
    
    if (!hasCashierSession) {
      console.log('No session, redirecting to cashier login');
      return NextResponse.redirect(new URL('/auth/cashier/login', req.url));
    }
    
    console.log('Session exists, allowing access to cashier route');
  }

  console.log('Middleware completed, continuing with request');
  return res;
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
};