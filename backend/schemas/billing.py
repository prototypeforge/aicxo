from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime


class TokenUsage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class UsageRecord(BaseModel):
    id: str
    user_id: int
    agent_id: str
    agent_name: str
    agent_role: str
    model: str
    meeting_id: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    timestamp: datetime

    class Config:
        from_attributes = True


class UserUsageSummary(BaseModel):
    user_id: int
    username: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float
    usage_by_model: Dict[str, Dict[str, float]]  # model -> {tokens, cost}
    usage_by_agent: List[Dict]  # agent details with usage


class AgentUsageSummary(BaseModel):
    agent_id: str
    agent_name: str
    agent_role: str
    model: str
    total_prompt_tokens: int
    total_completion_tokens: int
    total_tokens: int
    total_cost_usd: float
    request_count: int


class BillingOverview(BaseModel):
    total_users: int
    total_requests: int
    total_tokens: int
    total_cost_usd: float
    usage_by_model: Dict[str, Dict[str, float]]
    usage_by_user: List[UserUsageSummary]
    usage_by_agent: List[AgentUsageSummary]
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ModelPricing(BaseModel):
    model: str
    prompt_price_per_1k: float
    completion_price_per_1k: float


# OpenAI Pricing (as of early 2024 - should be updated regularly)
MODEL_PRICING = {
    "gpt-4": {"prompt": 0.03, "completion": 0.06},
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-4-turbo-preview": {"prompt": 0.01, "completion": 0.03},
    "gpt-4o": {"prompt": 0.005, "completion": 0.015},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    "gpt-3.5-turbo-16k": {"prompt": 0.003, "completion": 0.004},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost in USD based on model and token usage."""
    pricing = MODEL_PRICING.get(model, MODEL_PRICING.get("gpt-4"))
    
    prompt_cost = (prompt_tokens / 1000) * pricing["prompt"]
    completion_cost = (completion_tokens / 1000) * pricing["completion"]
    
    return round(prompt_cost + completion_cost, 6)

