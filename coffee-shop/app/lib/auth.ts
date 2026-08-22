import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },

    async authorize(credentials) {
  if (!credentials?.email || !credentials?.password) {
    console.log("LOGIN ERROR: missing email/password");
    return null;
  }

  const email = String(credentials.email).trim().toLowerCase();
  const password = String(credentials.password);

  console.log("LOGIN EMAIL:", email);

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    console.log("LOGIN ERROR: USER NOT FOUND");
    return null;
  }

  console.log("LOGIN USER FOUND:", user.id);

  const match = await bcrypt.compare(password, user.password);

  console.log("LOGIN PASSWORD MATCH:", match);

  if (!match) {
    console.log("LOGIN ERROR: PASSWORD DOES NOT MATCH");
    return null;
  }

  console.log("LOGIN SUCCESS:", user.id);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
},
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) {
        token.userId = user.id;
      }

      if (!token.userId && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: {
            email: token.email,
          },
          select: {
            id: true,
          },
        });

        if (dbUser) {
          token.userId = dbUser.id;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }

      return session;
    },
  },
});

export async function getcurrentuser() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      image: true,
    },
  });

  return user;
}