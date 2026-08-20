import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const admin = await prisma.admin.findUnique({
            where: { username: credentials.username },
          });

          if (!admin) {
            console.log("DB check: Khong tim thay username:", credentials.username);
            return null;
          }

          const isValid = await bcrypt.compare(credentials.password, admin.password);
          if (!isValid) {
            console.log("DB check: Sai mat khau cho:", credentials.username);
            return null;
          }

          return {
            id: String(admin.id),
            name: admin.fullName,
            email: admin.username,
            role: admin.role,
            department: admin.department,
          };
        } catch (error) {
          console.error("LỖI KẾT NỐI DATABASE TRONG LÚC ĐĂNG NHẬP:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.department = user.department;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.department = token.department;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 giờ
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_nextauth_secret_key_cdc_danang_2026_change_in_production",
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
