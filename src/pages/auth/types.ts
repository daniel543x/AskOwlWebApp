export interface LoginData {
  identifier: string; // Email or nickname
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  nickname: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFormState {
  loading: boolean;
  error: string | null;
}
