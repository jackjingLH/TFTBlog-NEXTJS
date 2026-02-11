/**
 * 管理员类型定义
 */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminSession {
  user: AdminUser;
  expires: string;
}
