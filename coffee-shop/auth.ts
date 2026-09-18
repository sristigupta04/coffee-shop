
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
  }
}



export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: {},
        phone:{},
        password: {},
      },


      async authorize(credentials) {
        if (!credentials?.password) {
          console.log("LOGIN ERROR: missing email/phone/password");
          return null;
        }

    const password = String(credentials.password);

        let user;
        // emails 
if(credentials.email){
        const email = String(credentials.email)
          .trim()
          .toLowerCase();

     console.log("LOGIN EMAIL:", email);
    
     
         user = await prisma.user.findUnique({
          where: {
            email,
          },
        });

      }else if(credentials.phone){
        const phone = String(credentials.phone)
          .trim();

     console.log("LOGIN PHONE:", phone);

       user = await prisma.user.findFirst({
          where: {
            phone,
          },
        });
      }

        if (!user) {
          console.log("LOGIN ERROR: USER NOT FOUND");
          return null;
        }

        console.log("LOGIN USER FOUND:", user.id);
// matching the ids 



        const match = await bcrypt.compare(
          password,
          user.password
        );

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
          image: user.image,
        };
      },
    }),

    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

callbacks: {
  async signIn({ user, account }) {
    if (account?.provider === "credentials") {
      return true;
    }

    if (account?.provider === "google") {
      if (!user.email) {
        console.log("GOOGLE LOGIN ERROR: EMAIL NOT FOUND");
        return false;
      }

      const email = user.email.trim().toLowerCase();

      const existingUser = await prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (!existingUser) {
        const randomPassword = await bcrypt.hash(
          crypto.randomBytes(32).toString("hex"),
          10
        );

        await prisma.user.create({
          data: {
            name: user.name || "Google User",
            email,
            password: randomPassword,
            image: user.image || null,
          },
        });

        console.log("GOOGLE USER CREATED:", email);
      } else {
        console.log("GOOGLE USER FOUND:", existingUser.id);
      }

      return true;
    }

    return true;
  },

  async jwt({ token, user }) {
    if (token.email) {
      const dbUser = await prisma.user.findUnique({
        where: {
          email: token.email.toLowerCase(),
        },
        select: {
          id: true,
        },
      });

      if (dbUser) {
        (token as typeof token & { userId?: string }).userId =
          dbUser.id;
      }
    }

    const typedToken = token as typeof token & {
      userId?: string;
    };

    if (!typedToken.userId && user?.id) {
      typedToken.userId = user.id;
    }

    return token;
  },

  async session({ session, token }) {
    const typedToken = token as typeof token & {
      userId?: string;
    };

    if (session.user && typedToken.userId) {
      session.user.id = typedToken.userId;
    }

    return session;
  },
},

});
