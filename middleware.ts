// Middleware to protect pages requiring authentication.  We use
// next-auth's withAuth helper to automatically check for a valid
// session on every request.  If the user is not authenticated they
// will be redirected to the sign‑in page defined in the options.

import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/signin',
  },
});

// Apply this middleware to all routes except for the sign-in, sign-up,
// API routes and static files.  The pattern below matches anything
// under the app directory except files beginning with _ or api/
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|signin|signup).*)',
  ],
};