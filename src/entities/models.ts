export type ModelKind = "chat" | "embedding" | "reranker" | "decision";

export const MODEL_KINDS: ModelKind[] = ["chat", "embedding", "reranker", "decision"];

export interface ModelEntry {
  id: string;
  provider_id: string;
  kind: ModelKind;
  model_name: string;
  display_name: string;
  is_active: boolean;
  required_role: string;
  capabilities: string[];
  vector_dims: number | null;
  provider_name?: string | null;
  provider_type?: string | null;
}

export interface PreferenceRead {
  user_id: string;
  kind: ModelKind;
  selected_model_id: string;
}
