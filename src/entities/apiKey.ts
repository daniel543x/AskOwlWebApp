export type ApiKeyScope = "search" | "research" | "agent";

export const API_KEY_SCOPES: ApiKeyScope[] = ["search", "research", "agent"];

export interface ApiKeyCreate {
  name: string;
  scopes: ApiKeyScope[];
  expires_at?: string | null;
}

export interface ApiKeyRead {
  id: string;
  name: string;
  key_prefix: string;
  scopes: ApiKeyScope[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiKeyCreated extends ApiKeyRead {
  raw_key: string;
}
