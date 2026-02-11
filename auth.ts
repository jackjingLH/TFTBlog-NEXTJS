import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import dbConnect from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { AdminUser } from '@/types/admin';

/**
 * NextAuth.js v5 配置
 * @see https://authjs.dev/getting-started/installation
 * @see CLAUDE.md 项目规范
 */
export const authConfig: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: {
          label: '邮箱',
          type: 'email',
          placeholder: 'admin@tftblog.com',
        },
        password: {
          label: '密码',
          type: 'password',
        },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('请输入邮箱和密码');
        }

        await dbConnect();

        // 查找管理员
        const admin = await Admin.findOne({
          email: (credentials.email as string).toLowerCase(),
        });

        if (!admin) {
          throw new Error('邮箱或密码错误');
        }

        // 验证密码
        const isValid = await admin.comparePassword(credentials.password as string);
        if (!isValid) {
          throw new Error('邮箱或密码错误');
        }

        // 返回用户信息（不含密码）
        return {
          id: admin._id.toString(),
          email: admin.email,
          name: admin.name,
          role: admin.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 天
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      // 首次登录时，将用户信息添加到 token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      // 将 token 信息传递到 session
      if (token && session.user) {
        (session.user as AdminUser).id = token.id as string;
        (session.user as AdminUser).email = token.email as string;
        (session.user as AdminUser).name = token.name as string;
        (session.user as AdminUser).role = token.role as 'admin';
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
