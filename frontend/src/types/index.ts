export interface AgentWeights {
  finance: number;
  technology: number;
  operations: number;
  people_hr: number;
  logistics: number;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  system_prompt: string;
  weights: AgentWeights;
  model: string;
  avatar_color: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface AgentOpinion {
  agent_id: string;
  agent_name: string;
  agent_role: string;
  opinion: string;
  reasoning: string;
  confidence: number;
  weights_applied: AgentWeights;
  timestamp: string;
}

export interface FollowUpQuestion {
  id: string;
  question: string;
  chair_response?: string;
  created_at: string;
  version?: number;
}

export interface MeetingFile {
  id: string;
  filename: string;
  file_type: string;
  uploaded_at: string;
}

export interface OpinionVersion {
  version: number;
  opinions: AgentOpinion[];
  chair_summary: string;
  chair_recommendation: string;
  follow_ups?: FollowUpQuestion[];
  generated_at: string;
  generated_by?: number;
}

export interface Meeting {
  id: string;
  user_id: number;
  question: string;
  context?: string;
  opinions: AgentOpinion[];
  chair_summary: string;
  chair_recommendation: string;
  status: 'in_progress' | 'completed';
  created_at: string;
  completed_at?: string;
  follow_ups?: FollowUpQuestion[];
  attached_files?: MeetingFile[];
  current_version?: number;
  opinion_history?: OpinionVersion[];
}

export interface CompanyFile {
  id: string;
  user_id: number;
  filename: string;
  file_type: string;
  content: string;
  description?: string;
  created_at: string;
}

export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  company_name: string | null;
  is_admin: boolean;
  is_active: boolean;
  hired_agents: string[];
  created_at: string;
  updated_at?: string;
}

