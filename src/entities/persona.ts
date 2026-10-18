export interface PersonaCreate {
  name: string;
  system_context?: string;
  allowed_domains?: string[];
  allowed_engines?: string[];
  allowed_keywords?: string[];
  default_parameters?: Record<string, unknown>;
}

export interface PersonaUpdate {
  name?: string | null;
  system_context?: string | null;
  allowed_domains?: string[] | null;
  allowed_engines?: string[] | null;
  allowed_keywords?: string[] | null;
  default_parameters?: Record<string, unknown> | null;
}

export interface PersonaRead {
  id: string;
  name: string;
  system_context: string;
  allowed_domains: string[];
  allowed_engines: string[];
  allowed_keywords: string[];
  default_parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string | null;
}
