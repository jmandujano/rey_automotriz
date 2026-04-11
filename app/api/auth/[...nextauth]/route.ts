import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth handler for both GET and POST requests. Next.js will
// automatically route GET requests for session retrieval and POST
// requests for sign in/out to this file.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };