export interface Source {
  url: string;
  title: string;
  score: number;
}

export interface SearchRequest {
  query: string;
  stream?: boolean;
  conversation_id?: string | null;
}

export interface AskModelParams {
  model_id?: string;
  embedder_id?: string;
  reranker_id?: string;
  decision_model_id?: string;
  search_provider?: string;
}

export interface ConversationEvent {
  conversation_id: string;
  created: boolean;
}

export interface StatusEvent {
  step: string;
}

export interface QueryEvent {
  query: string;
  tool_call: boolean;
}

export interface PlanEvent {
  subquestions: string[];
  tool_call: boolean;
}

export interface SourcesEvent {
  sources: Source[];
  subquery?: string;
}

export interface ContextEvent {
  context: string;
  chunks: number;
  vector_retrieval: boolean;
  subquery?: string;
}

export interface MessageEvent {
  text: string;
}

export interface GroundingEvent {
  supported: number;
}

export type DoneStatus = "completed" | "no_context" | "budget_exhausted";

export interface DoneEvent {
  status: DoneStatus;
  reason?: string;
}

export interface ErrorEvent {
  error: string;
}
