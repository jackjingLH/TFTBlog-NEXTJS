import NextAuth, { NextAuthConfig } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GitHubProvider from 'next-auth/providers/github';
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
    // 邮箱密码登录
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
    // GitHub 登录
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
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
    async signIn({ user, account, profile }) {
      // GitHub 登录时的处理
      if (account?.provider === 'github') {
        await dbConnect();

        // 检查用户是否已存在
        let admin = await Admin.findOne({ email: user.email });

        if (!admin) {
          // 首次 GitHub 登录，创建普通用户账号
          admin = await Admin.create({
            email: user.email,
            name: user.name || 'GitHub User',
            provider: 'github',
            role: 'user', // 默认创建普通用户
          });
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      // 首次登录时，将用户信息添加到 token
      if (user) {
        // 如果是 OAuth 登录，从数据库读取完整的用户信息（包含最新的 role）
        if (account?.provider === 'github') {
          await dbConnect();
          const dbUser = await Admin.findOne({ email: user.email });

          token.id = dbUser?._id.toString() || user.id;
          token.email = dbUser?.email || user.email;
          token.name = dbUser?.name || user.name;
          token.role = dbUser?.role || 'user'; // 从数据库读取 role
        } else {
          // credentials 登录
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.role = (user as any).role;
        }
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
