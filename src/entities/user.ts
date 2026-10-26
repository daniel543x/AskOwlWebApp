export interface UserCreate {
  email: string;
  nickname: string;
  password: string;
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
}

export interface TokenData {
  access_token: string;
  token_type: string;
  refresh_token: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token: string;
}

export interface UserRead {
  email: string;
  nickname: string;
  id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}
