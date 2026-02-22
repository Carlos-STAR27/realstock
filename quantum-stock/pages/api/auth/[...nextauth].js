import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export default NextAuth({
  // 配置认证提供商
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: {
          label: 'Username',
          type: 'text',
          placeholder: 'admin'
        },
        password: {
          label: 'Password',
          type: 'password',
          placeholder: 'admin'
        }
      },
      async authorize(credentials) {
        try {
          // 调用后端API验证用户
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password
            })
          });
          
          const data = await res.json();
          
          if (res.ok && data.ok) {
            return {
              id: 1,
              name: data.name || credentials.username,
              username: data.username || credentials.username,
              email: `${credentials.username}@example.com`,
              role: data.role || 'user'
            };
          }
          return null;
        } catch (error) {
          console.error('认证错误:', error);
          return null;
        }
      }
    })
  ],
  // 会话管理配置
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  // 页面配置
  pages: {
    signIn: '/auth/signin',
  },
  // 回调配置
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
      }
      return session;
    }
  },
  // 安全配置
  secret: process.env.NEXTAUTH_SECRET,
});