export type ProviderHealth = "up" | "down" | "local" | "unknown";

export interface Provider {
  id: string;
  name: string;
  provider_type: string;
  base_url: string | null;
  is_active: boolean;
  health_status: string;
  last_probe_at: string | null;
  has_api_key: boolean;
}

export interface ProviderCreate {
  name: string;
  provider_type: string;
  base_url?: string | null;
  api_key?: string | null;
  is_active?: boolean;
}

export interface ProviderUpdate {
  name?: string;
  base_url?: string | null;
  api_key?: string | null;
  is_active?: boolean;
}
