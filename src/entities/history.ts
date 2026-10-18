export interface ConversationRead {
  id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
}

export interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ConversationWithMessages extends ConversationRead {
  messages: Message[];
}
