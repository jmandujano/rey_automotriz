import { AuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './db';
import bcrypt from 'bcrypt';

/**
 * NextAuth configuration for Rey Automotriz.
 *
 * We use a credentials provider with email and password. Passwords are
 * stored hashed using bcrypt on the usuarios table (column
 * contrasena_hash). When a user logs in successfully we return the
 * minimal user object containing the id, name and role id so this
 * information is available on the session token.
 */
export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Correo', type: 'text', placeholder: 'correo@dominio.com' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        // Validate credentials
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password;
        if (!email || !password) {
          return null;
        }
        // Look up user by email.  We perform a case‑insensitive match so that
        // users can log in regardless of the casing they used when
        // registering or typing their email.  `findFirst` allows us to
        // specify `mode: 'insensitive'` for the string comparison.
        const user = await prisma.usuario.findFirst({
          where: { correo_electronico: { equals: email, mode: 'insensitive' } },
          include: { rol: true },
        });
        if (!user) {
          return null;
        }
        // Check active state
        if (user.estado !== 'activo') {
          return null;
        }
        // Compare password hash
        const valid = await bcrypt.compare(password, user.contrasena_hash);
        if (!valid) {
          return null;
        }
        // Update last access date for the user upon successful login
        await prisma.usuario.update({
          where: { id_usuario: user.id_usuario },
          data: { fecha_ultimo_acceso: new Date() },
        });
        // Return user object with id and role
        return {
          id: String(user.id_usuario),
          name: user.nombre_completo,
          email: user.correo_electronico,
          roleId: user.id_rol,
        } as unknown as User;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  // Override the default sign‑in page. Our template
  // provides a credentials login form at `/signin` under the full‑width
  // auth route group. Point NextAuth at that path so unauthenticated
  // users are directed there instead of the default page.
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // @ts-ignore
        token.roleId = user.roleId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // @ts-ignore
        session.user.roleId = token.roleId as number;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};