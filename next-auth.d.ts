import NextAuth from 'next-auth';

/**
 * NextAuth 类型扩展
 * @see https://next-auth.js.org/getting-started/typescript
 */
declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
  }

  interface Session {
    user: User;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'user';
  }
}
