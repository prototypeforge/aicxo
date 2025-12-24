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


# OpenAI Pricing (as of late 2025 - prices per 1K tokens)
# Prices are approximate and should be verified with OpenAI's pricing page
MODEL_PRICING = {
    # GPT-5.x series
    "gpt-5.2": {"prompt": 0.015, "completion": 0.060},
    "gpt-5.2-instant": {"prompt": 0.010, "completion": 0.040},
    "gpt-5.2-thinking": {"prompt": 0.020, "completion": 0.080},
    "gpt-5.1": {"prompt": 0.012, "completion": 0.048},
    "gpt-5.1-instant": {"prompt": 0.008, "completion": 0.032},
    "gpt-5.1-thinking": {"prompt": 0.016, "completion": 0.064},
    "gpt-5": {"prompt": 0.010, "completion": 0.040},
    
    # GPT-4.5 series
    "gpt-4.5": {"prompt": 0.075, "completion": 0.150},
    "gpt-4.5-preview": {"prompt": 0.075, "completion": 0.150},
    
    # GPT-4.1 series
    "gpt-4.1": {"prompt": 0.002, "completion": 0.008},
    "gpt-4.1-mini": {"prompt": 0.0004, "completion": 0.0016},
    "gpt-4.1-nano": {"prompt": 0.0001, "completion": 0.0004},
    
    # GPT-4o series
    "gpt-4o": {"prompt": 0.0025, "completion": 0.010},
    "gpt-4o-mini": {"prompt": 0.00015, "completion": 0.0006},
    "gpt-4o-2024-05-13": {"prompt": 0.005, "completion": 0.015},
    "gpt-4o-2024-08-06": {"prompt": 0.0025, "completion": 0.010},
    "gpt-4o-2024-11-20": {"prompt": 0.0025, "completion": 0.010},
    "gpt-4o-mini-2024-07-18": {"prompt": 0.00015, "completion": 0.0006},
    
    # GPT-4 Turbo
    "gpt-4-turbo": {"prompt": 0.01, "completion": 0.03},
    "gpt-4-turbo-preview": {"prompt": 0.01, "completion": 0.03},
    "gpt-4-turbo-2024-04-09": {"prompt": 0.01, "completion": 0.03},
    
    # GPT-4 base
    "gpt-4": {"prompt": 0.03, "completion": 0.06},
    "gpt-4-0613": {"prompt": 0.03, "completion": 0.06},
    
    # GPT-3.5 series
    "gpt-3.5-turbo": {"prompt": 0.0005, "completion": 0.0015},
    "gpt-3.5-turbo-0125": {"prompt": 0.0005, "completion": 0.0015},
    "gpt-3.5-turbo-1106": {"prompt": 0.001, "completion": 0.002},
    "gpt-3.5-turbo-16k": {"prompt": 0.003, "completion": 0.004},
    
    # o-series reasoning models
    "o1": {"prompt": 0.015, "completion": 0.060},
    "o1-preview": {"prompt": 0.015, "completion": 0.060},
    "o1-mini": {"prompt": 0.003, "completion": 0.012},
    "o3": {"prompt": 0.010, "completion": 0.040},
    "o3-mini": {"prompt": 0.0011, "completion": 0.0044},
    "o4-mini": {"prompt": 0.0011, "completion": 0.0044},
}


def calculate_cost(model: str, prompt_tokens: int, completion_tokens: int) -> float:
    """Calculate cost in USD based on model and token usage."""
    # Try exact match first
    if model in MODEL_PRICING:
        pricing = MODEL_PRICING[model]
    else:
        # Try to find a matching base model
        pricing = None
        for known_model in MODEL_PRICING:
            if model.startswith(known_model):
                pricing = MODEL_PRICING[known_model]
                break
        
        # Default fallback pricing
        if pricing is None:
            if model.startswith("gpt-5"):
                pricing = MODEL_PRICING["gpt-5"]
            elif model.startswith("gpt-4.5"):
                pricing = MODEL_PRICING["gpt-4.5"]
            elif model.startswith("gpt-4.1"):
                pricing = MODEL_PRICING["gpt-4.1"]
            elif "gpt-4o-mini" in model:
                pricing = MODEL_PRICING["gpt-4o-mini"]
            elif "gpt-4o" in model:
                pricing = MODEL_PRICING["gpt-4o"]
            elif model.startswith("o3"):
                pricing = MODEL_PRICING["o3-mini"]
            elif model.startswith("o1"):
                pricing = MODEL_PRICING["o1-mini"]
            else:
                pricing = MODEL_PRICING["gpt-4"]  # Conservative fallback
    
    prompt_cost = (prompt_tokens / 1000) * pricing["prompt"]
    completion_cost = (completion_tokens / 1000) * pricing["completion"]
    
    return round(prompt_cost + completion_cost, 6)

