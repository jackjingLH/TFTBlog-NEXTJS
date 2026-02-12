/**
 * 管理员类型定义
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user'; // 管理员或普通用户
  provider?: 'credentials' | 'github'; // 登录方式
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminSession {
  user: AdminUser;
  expires: string;
}
