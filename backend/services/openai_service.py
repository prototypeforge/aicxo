from openai import AsyncOpenAI
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import json
import re

from database.mongodb import get_database
from schemas.billing import calculate_cost


# Models that support response_format: json_object
# Reference: https://platform.openai.com/docs/guides/json-mode
JSON_MODE_SUPPORTED_MODELS = {
    "gpt-4o",
    "gpt-4o-mini", 
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-11-20",
    "gpt-4o-mini-2024-07-18",
    "gpt-4-turbo",
    "gpt-4-turbo-preview",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-1106-preview",
    "gpt-4-0125-preview",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-1106",
    "o1",
    "o1-preview",
    "o1-mini",
    "o3-mini",
}


def supports_json_mode(model: str) -> bool:
    """Check if a model supports JSON response format."""
    # Check exact match first
    if model in JSON_MODE_SUPPORTED_MODELS:
        return True
    # Check if it starts with a known prefix (for versioned models)
    for supported in JSON_MODE_SUPPORTED_MODELS:
        if model.startswith(supported.split("-")[0] + "-") and "gpt-4o" in model:
            return True
    # gpt-4 base (not turbo) does NOT support json mode
    if model == "gpt-4" or model.startswith("gpt-4-0"):
        return False
    return False


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """Extract JSON from text that might contain markdown code blocks or other text."""
    # Try to parse as pure JSON first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try to find JSON in code blocks
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)```'
    matches = re.findall(code_block_pattern, text)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue
    
    # Try to find JSON object pattern
    json_pattern = r'\{[\s\S]*\}'
    matches = re.findall(json_pattern, text)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue
    
    # If all else fails, return a structured error
    return {
        "opinion": text[:500] if len(text) > 500 else text,
        "reasoning": "Response was not in expected JSON format.",
        "confidence": 0.5
    }


async def get_openai_api_key() -> Optional[str]:
    """Get OpenAI API key from database settings."""
    db = get_database()
    setting = await db.settings.find_one({"key": "openai_api_key"})
    if setting:
        return setting.get("value")
    return None


async def get_openai_client() -> Optional[AsyncOpenAI]:
    """Create OpenAI client with API key from settings."""
    api_key = await get_openai_api_key()
    if not api_key:
        return None
    return AsyncOpenAI(api_key=api_key)


async def get_chair_agent() -> Dict[str, Any]:
    """Get the Chair of the Board agent configuration."""
    db = get_database()
    chair = await db.agents.find_one({"role": "Chair of the Board", "is_chair": True})
    
    if not chair:
        # Return default chair configuration
        return {
            "_id": "chair",
            "name": "Board Chair",
            "role": "Chair of the Board",
            "system_prompt": """You are the Chair of the Board of Directors. Your role is to synthesize the opinions of all board members and provide a unified recommendation.

You must:
1. Consider all perspectives presented by board members
2. Weigh opinions based on their confidence levels and relevance to their expertise
3. Identify areas of consensus and disagreement
4. Formulate a clear, actionable recommendation""",
            "model": "gpt-4o-mini",
            "is_chair": True
        }
    
    return chair


async def record_token_usage(
    user_id: int,
    agent_id: str,
    agent_name: str,
    agent_role: str,
    model: str,
    meeting_id: str,
    prompt_tokens: int,
    completion_tokens: int
) -> None:
    """Record token usage for billing purposes."""
    db = get_database()
    
    total_tokens = prompt_tokens + completion_tokens
    cost_usd = calculate_cost(model, prompt_tokens, completion_tokens)
    
    usage_record = {
        "user_id": user_id,
        "agent_id": agent_id,
        "agent_name": agent_name,
        "agent_role": agent_role,
        "model": model,
        "meeting_id": meeting_id,
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "cost_usd": cost_usd,
        "timestamp": datetime.utcnow()
    }
    
    await db.token_usage.insert_one(usage_record)


async def generate_agent_opinion(
    agent: Dict[str, Any],
    question: str,
    context: Optional[str],
    company_files: List[Dict[str, Any]],
    user_id: int,
    meeting_id: str
) -> Dict[str, Any]:
    """Generate an opinion from a single agent."""
    client = await get_openai_client()
    if not client:
        raise ValueError("OpenAI API key not configured. Please set it in admin settings.")
    
    # Build the context for the agent
    file_context = ""
    if company_files:
        file_context = "\n\n=== COMPANY DOCUMENTS ===\n"
        for file in company_files:
            file_context += f"\n--- {file['filename']} ({file['file_type']}) ---\n"
            file_context += file['content'][:2000]  # Limit content length
            file_context += "\n"
    
    weights = agent.get('weights', {})
    weights_context = f"""
Your expertise weights in different areas:
- Finance: {weights.get('finance', 0.2) * 100}%
- Technology: {weights.get('technology', 0.2) * 100}%
- Operations: {weights.get('operations', 0.2) * 100}%
- People & HR: {weights.get('people_hr', 0.2) * 100}%
- Logistics: {weights.get('logistics', 0.2) * 100}%

Focus more on areas where your expertise weight is higher.
"""
    
    system_message = f"""You are {agent['name']}, the {agent['role']} on a corporate Board of Directors.

{agent['system_prompt']}

{weights_context}

You must provide your expert opinion on questions brought to the board. Be professional, insightful, and consider the perspective of your role.

You MUST respond with ONLY a valid JSON object (no markdown, no explanation before or after) in this exact structure:
{{
    "opinion": "Your clear, concise opinion on the matter",
    "reasoning": "Detailed reasoning behind your opinion",
    "confidence": 0.85
}}

The confidence value must be a number between 0.0 and 1.0.
"""

    user_message = f"""The board has received the following question for deliberation:

QUESTION: {question}

{f'ADDITIONAL CONTEXT: {context}' if context else ''}
{file_context if file_context else ''}

Please provide your professional opinion as the {agent['role']}. Remember to respond with ONLY valid JSON.
"""

    model = agent.get('model', 'gpt-4o-mini')
    agent_id = str(agent.get('_id', 'unknown'))
    use_json_mode = supports_json_mode(model)

    try:
        # Build request parameters
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7
        }
        
        # Only add response_format for models that support it
        if use_json_mode:
            request_params["response_format"] = {"type": "json_object"}
        
        response = await client.chat.completions.create(**request_params)
        
        # Record token usage
        usage = response.usage
        if usage:
            await record_token_usage(
                user_id=user_id,
                agent_id=agent_id,
                agent_name=agent['name'],
                agent_role=agent['role'],
                model=model,
                meeting_id=meeting_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens
            )
        
        # Parse response - use extraction for non-JSON mode models
        response_text = response.choices[0].message.content
        if use_json_mode:
            result = json.loads(response_text)
        else:
            result = extract_json_from_text(response_text)
        
        return {
            "agent_id": agent_id,
            "agent_name": agent['name'],
            "agent_role": agent['role'],
            "opinion": result.get('opinion', ''),
            "reasoning": result.get('reasoning', ''),
            "confidence": float(result.get('confidence', 0.5)),
            "weights_applied": weights,
            "model_used": model,
            "tokens_used": usage.total_tokens if usage else 0,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        return {
            "agent_id": agent_id,
            "agent_name": agent['name'],
            "agent_role": agent['role'],
            "opinion": f"Error generating opinion: {str(e)}",
            "reasoning": "An error occurred while processing this request.",
            "confidence": 0.0,
            "weights_applied": weights,
            "model_used": model,
            "tokens_used": 0,
            "timestamp": datetime.utcnow()
        }


async def generate_chair_summary(
    question: str,
    context: Optional[str],
    opinions: List[Dict[str, Any]],
    user_id: int,
    meeting_id: str
) -> Dict[str, str]:
    """Generate the Chair of the Board's summary and recommendation."""
    client = await get_openai_client()
    if not client:
        raise ValueError("OpenAI API key not configured.")
    
    # Get chair configuration
    chair = await get_chair_agent()
    model = chair.get('model', 'gpt-4o-mini')
    use_json_mode = supports_json_mode(model)
    
    opinions_text = ""
    for op in opinions:
        opinions_text += f"""
--- {op['agent_name']} ({op['agent_role']}) ---
Opinion: {op['opinion']}
Reasoning: {op['reasoning']}
Confidence: {op['confidence'] * 100:.0f}%

"""
    
    system_message = f"""{chair['system_prompt']}

You MUST respond with ONLY a valid JSON object (no markdown, no explanation before or after) in this exact structure:
{{
    "summary": "A comprehensive summary of the board's discussion and key points raised",
    "recommendation": "Your final recommendation based on the collective wisdom of the board"
}}
"""

    user_message = f"""QUESTION PRESENTED TO THE BOARD:
{question}

{f'CONTEXT: {context}' if context else ''}

BOARD MEMBER OPINIONS:
{opinions_text}

Please synthesize these opinions and provide your recommendation as Chair of the Board. Remember to respond with ONLY valid JSON.
"""

    try:
        # Build request parameters
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            "temperature": 0.7
        }
        
        # Only add response_format for models that support it
        if use_json_mode:
            request_params["response_format"] = {"type": "json_object"}
        
        response = await client.chat.completions.create(**request_params)
        
        # Record token usage for chair
        usage = response.usage
        if usage:
            await record_token_usage(
                user_id=user_id,
                agent_id="chair",
                agent_name=chair.get('name', 'Board Chair'),
                agent_role="Chair of the Board",
                model=model,
                meeting_id=meeting_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens
            )
        
        # Parse response
        response_text = response.choices[0].message.content
        if use_json_mode:
            result = json.loads(response_text)
        else:
            result = extract_json_from_text(response_text)
            # For chair summary, ensure we have proper fields
            if 'summary' not in result:
                result = {
                    "summary": response_text[:1000] if len(response_text) > 1000 else response_text,
                    "recommendation": "See summary above for details."
                }
        
        return {
            "summary": result.get('summary', ''),
            "recommendation": result.get('recommendation', ''),
            "model_used": model,
            "tokens_used": usage.total_tokens if usage else 0
        }
    except Exception as e:
        return {
            "summary": f"Error generating summary: {str(e)}",
            "recommendation": "Unable to generate recommendation due to an error.",
            "model_used": model,
            "tokens_used": 0
        }


async def generate_follow_up_response(
    original_question: str,
    original_recommendation: str,
    opinions: List[Dict[str, Any]],
    follow_up_question: str,
    user_id: int,
    meeting_id: str
) -> str:
    """Generate the Chair's response to a follow-up question."""
    client = await get_openai_client()
    if not client:
        return "Unable to generate response: OpenAI API key not configured."
    
    # Get chair configuration
    chair = await get_chair_agent()
    model = chair.get('model', 'gpt-4o-mini')
    
    opinions_summary = "\n".join([
        f"- {op['agent_name']} ({op['agent_role']}): {op['opinion']}"
        for op in opinions
    ])
    
    system_message = f"""{chair['system_prompt']}

You are responding to a follow-up question from the board meeting. Be specific, actionable, and reference the original discussion when relevant."""

    user_message = f"""ORIGINAL QUESTION:
{original_question}

ORIGINAL BOARD RECOMMENDATION:
{original_recommendation}

BOARD MEMBER OPINIONS SUMMARY:
{opinions_summary}

FOLLOW-UP QUESTION:
{follow_up_question}

Please provide a detailed, actionable response to this follow-up question. Reference specific points from the original discussion where relevant. Be practical and specific with recommendations."""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.7
        )
        
        # Record token usage
        usage = response.usage
        if usage:
            await record_token_usage(
                user_id=user_id,
                agent_id="chair-followup",
                agent_name=chair.get('name', 'Board Chair'),
                agent_role="Chair of the Board (Follow-up)",
                model=model,
                meeting_id=meeting_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens
            )
        
        return response.choices[0].message.content
    except Exception as e:
        return f"Error generating response: {str(e)}"
