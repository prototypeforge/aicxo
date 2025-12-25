from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AgentWeights(BaseModel):
    finance: float = Field(ge=0, le=1, default=0.2)
    technology: float = Field(ge=0, le=1, default=0.2)
    operations: float = Field(ge=0, le=1, default=0.2)
    people_hr: float = Field(ge=0, le=1, default=0.2)
    logistics: float = Field(ge=0, le=1, default=0.2)


class AgentBase(BaseModel):
    name: str
    role: str  # e.g., "CFO", "CTO", "CPO", "Architect", etc.
    system_prompt: str
    weights: AgentWeights
    model: str = "gpt-4"  # Model to use for this agent
    avatar_color: Optional[str] = "#6366f1"
    is_active: bool = True


class AgentCreate(AgentBase):
    pass


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    system_prompt: Optional[str] = None
    weights: Optional[AgentWeights] = None
    model: Optional[str] = None
    avatar_color: Optional[str] = None
    is_active: Optional[bool] = None


class AgentResponse(AgentBase):
    id: str
    created_by: int  # Admin user ID who created this agent
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentOpinion(BaseModel):
    agent_id: str
    agent_name: str
    agent_role: str
    opinion: str
    reasoning: str
    confidence: float
    weights_applied: AgentWeights
    timestamp: datetime


class MeetingBase(BaseModel):
    question: str
    context: Optional[str] = None


class MeetingCreate(MeetingBase):
    pass


class FollowUpCreate(BaseModel):
    question: str


class FollowUpResponse(BaseModel):
    id: str
    question: str
    chair_response: Optional[str] = None
    created_at: str
    version: Optional[int] = None  # Which opinion version this belongs to


class MeetingFileResponse(BaseModel):
    id: str
    filename: str
    file_type: str
    uploaded_at: str


class OpinionVersion(BaseModel):
    version: int
    opinions: List[AgentOpinion]
    chair_summary: str
    chair_recommendation: str
    follow_ups: Optional[List[FollowUpResponse]] = []
    generated_at: datetime
    generated_by: Optional[int] = None  # Admin user ID who triggered regeneration


class DebugLogEntry(BaseModel):
    timestamp: str
    agent_id: str
    agent_name: str
    level: str  # "info", "warning", "error"
    message: str
    details: Optional[dict] = None


class MeetingResponse(BaseModel):
    id: str
    user_id: int
    question: str
    context: Optional[str] = None
    opinions: List[AgentOpinion]  # Current version opinions
    chair_summary: str
    chair_recommendation: str
    status: str  # "in_progress", "completed"
    created_at: datetime
    completed_at: Optional[datetime] = None
    follow_ups: Optional[List[FollowUpResponse]] = []
    attached_files: Optional[List[MeetingFileResponse]] = []
    current_version: Optional[int] = 1
    opinion_history: Optional[List[OpinionVersion]] = []
    debug_logs: Optional[List[DebugLogEntry]] = []  # Debug logs for admin review

    class Config:
        from_attributes = True


class CompanyFileBase(BaseModel):
    filename: str
    file_type: str  # "financial_statement", "presentation", "report", etc.
    content: str  # Extracted text content
    description: Optional[str] = None


class CompanyFileCreate(CompanyFileBase):
    pass


class CompanyFileResponse(CompanyFileBase):
    id: str
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

