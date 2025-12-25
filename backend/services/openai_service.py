from openai import AsyncOpenAI
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime
import json
import re
import base64
import traceback

from database.mongodb import get_database
from schemas.billing import calculate_cost


# Global list to collect debug logs during a meeting generation
_debug_logs: List[Dict[str, Any]] = []


def clear_debug_logs():
    """Clear the debug logs list."""
    global _debug_logs
    _debug_logs = []


def get_debug_logs() -> List[Dict[str, Any]]:
    """Get the collected debug logs."""
    global _debug_logs
    return _debug_logs.copy()


def add_debug_log(
    agent_id: str,
    agent_name: str,
    level: str,
    message: str,
    details: Optional[Dict[str, Any]] = None
):
    """Add a debug log entry."""
    global _debug_logs
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "agent_id": agent_id,
        "agent_name": agent_name,
        "level": level,
        "message": message,
        "details": details
    }
    _debug_logs.append(log_entry)
    
    # Also print to console for server-side logging
    print(f"[{level.upper()}] [{agent_name}] {message}")
    if details:
        print(f"  Details: {json.dumps(details, default=str, indent=2)}")


# Models that support response_format: json_object
JSON_MODE_SUPPORTED_MODELS = {
    # GPT-5.x series
    "gpt-5.2",
    "gpt-5.2-instant",
    "gpt-5.2-thinking",
    "gpt-5.1",
    "gpt-5.1-instant",
    "gpt-5.1-thinking",
    "gpt-5",
    # GPT-4.5 series
    "gpt-4.5",
    "gpt-4.5-preview",
    # GPT-4.1 series
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    # GPT-4o series
    "gpt-4o",
    "gpt-4o-mini", 
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06",
    "gpt-4o-2024-11-20",
    "gpt-4o-mini-2024-07-18",
    # GPT-4 Turbo
    "gpt-4-turbo",
    "gpt-4-turbo-preview",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-1106-preview",
    "gpt-4-0125-preview",
    # GPT-3.5
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo-1106",
    # o-series reasoning models
    "o1",
    "o1-preview",
    "o1-mini",
    "o3",
    "o3-mini",
    "o4-mini",
}

# Models that support vision (image inputs) and file inputs
VISION_SUPPORTED_MODELS = {
    # GPT-5.x series (all support vision)
    "gpt-5.2",
    "gpt-5.2-instant",
    "gpt-5.2-thinking",
    "gpt-5.1",
    "gpt-5.1-instant",
    "gpt-5.1-thinking",
    "gpt-5",
    # GPT-4.5 series
    "gpt-4.5",
    "gpt-4.5-preview",
    # GPT-4.1 series
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    # GPT-4o series
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06", 
    "gpt-4o-2024-11-20",
    "gpt-4o-mini-2024-07-18",
    # GPT-4 Turbo with vision
    "gpt-4-turbo",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-vision-preview",
    "gpt-4-1106-vision-preview",
    # o-series reasoning models
    "o1",
    "o1-preview",
    "o3",
    "o3-mini",
    "o4-mini",
}

# Models that support direct file/document inputs (PDF, etc.)
FILE_INPUT_SUPPORTED_MODELS = {
    # GPT-5.x series (all support file input)
    "gpt-5.2",
    "gpt-5.2-instant",
    "gpt-5.2-thinking",
    "gpt-5.1",
    "gpt-5.1-instant",
    "gpt-5.1-thinking",
    "gpt-5",
    # GPT-4.5 series
    "gpt-4.5",
    "gpt-4.5-preview",
    # GPT-4.1 series
    "gpt-4.1",
    "gpt-4.1-mini",
    "gpt-4.1-nano",
    # GPT-4o series
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4o-2024-05-13",
    "gpt-4o-2024-08-06", 
    "gpt-4o-2024-11-20",
    "gpt-4o-mini-2024-07-18",
}

# Image MIME types that can be passed directly to vision models
IMAGE_MIME_TYPES = {
    "image/png",
    "image/jpeg", 
    "image/jpg",
    "image/gif",
    "image/webp",
}

# Document MIME types that can be passed directly to file-input models
DOCUMENT_MIME_TYPES = {
    "application/pdf",
}


def supports_json_mode(model: str) -> bool:
    """Check if a model supports JSON response format."""
    if model in JSON_MODE_SUPPORTED_MODELS:
        return True
    # GPT-5.x, GPT-4.5, GPT-4.1, GPT-4o all support JSON mode
    if model.startswith("gpt-5") or model.startswith("gpt-4.5") or model.startswith("gpt-4.1"):
        return True
    if "gpt-4o" in model or "gpt-4-turbo" in model:
        return True
    # o-series reasoning models
    if model.startswith("o1") or model.startswith("o3") or model.startswith("o4"):
        return True
    # GPT-3.5-turbo supports it
    if "gpt-3.5-turbo" in model:
        return True
    # gpt-4 base (not turbo, not 4o, not 4.x) does NOT support json mode
    if model == "gpt-4" or (model.startswith("gpt-4-0") and "turbo" not in model):
        return False
    return False


def supports_vision(model: str) -> bool:
    """Check if a model supports vision/image inputs."""
    if model in VISION_SUPPORTED_MODELS:
        return True
    # GPT-5.x, GPT-4.5, GPT-4.1 all support vision
    if model.startswith("gpt-5") or model.startswith("gpt-4.5") or model.startswith("gpt-4.1"):
        return True
    # GPT-4o and turbo variants
    if "gpt-4o" in model or "gpt-4-turbo" in model or "gpt-4-vision" in model:
        return True
    # o-series reasoning models (except o1-mini)
    if model.startswith("o1") or model.startswith("o3") or model.startswith("o4"):
        if model != "o1-mini":  # o1-mini doesn't support vision
            return True
    return False


def supports_file_input(model: str) -> bool:
    """Check if a model supports direct file inputs (PDF, etc.)."""
    if model in FILE_INPUT_SUPPORTED_MODELS:
        return True
    # GPT-5.x, GPT-4.5, GPT-4.1, GPT-4o all support file input
    if model.startswith("gpt-5") or model.startswith("gpt-4.5") or model.startswith("gpt-4.1"):
        return True
    if "gpt-4o" in model:
        return True
    return False


def uses_max_completion_tokens(model: str) -> bool:
    """Check if a model uses max_completion_tokens instead of max_tokens."""
    # Newer models (GPT-5.x, GPT-4.5, GPT-4.1, o-series) use max_completion_tokens
    if model.startswith("gpt-5") or model.startswith("gpt-4.5") or model.startswith("gpt-4.1"):
        return True
    if model.startswith("o1") or model.startswith("o3") or model.startswith("o4"):
        return True
    return False


def is_image_file(mime_type: str) -> bool:
    """Check if a MIME type is an image."""
    return mime_type in IMAGE_MIME_TYPES or mime_type.startswith("image/")


def is_document_file(mime_type: str) -> bool:
    """Check if a MIME type is a directly supported document (PDF)."""
    return mime_type in DOCUMENT_MIME_TYPES


def extract_json_from_text(text: str) -> Dict[str, Any]:
    """Extract JSON from text that might contain markdown code blocks or other text."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    code_block_pattern = r'```(?:json)?\s*([\s\S]*?)```'
    matches = re.findall(code_block_pattern, text)
    for match in matches:
        try:
            return json.loads(match.strip())
        except json.JSONDecodeError:
            continue
    
    json_pattern = r'\{[\s\S]*\}'
    matches = re.findall(json_pattern, text)
    for match in matches:
        try:
            return json.loads(match)
        except json.JSONDecodeError:
            continue
    
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


def build_file_content_for_model(
    files: List[Dict[str, Any]], 
    model: str
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Build file content for the model.
    
    For vision-capable models: images passed as image_url content parts.
    For file-input models (GPT-4o): PDFs passed directly as file content.
    For text-only models: extracted text content is used.
    
    Returns:
        Tuple of (text_context, file_content_parts)
    """
    use_vision = supports_vision(model)
    use_file_input = supports_file_input(model)
    
    text_parts = []
    file_parts = []
    
    for file in files:
        filename = file.get('filename', 'Unknown')
        file_type = file.get('file_type', 'unknown')
        mime_type = file.get('mime_type', '')
        content = file.get('content', '')
        raw_data = file.get('raw_data')  # Base64 encoded raw file data
        
        # Check if this is an image file that can be passed directly
        if is_image_file(mime_type) and raw_data and use_vision:
            # Pass image directly to vision model
            file_parts.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:{mime_type};base64,{raw_data}",
                    "detail": "auto"
                }
            })
            text_parts.append(f"[Image attached: {filename}]")
        
        # Check if this is a PDF that can be passed directly
        elif is_document_file(mime_type) and raw_data and use_file_input:
            # Pass PDF directly to file-input capable model
            file_parts.append({
                "type": "file",
                "file": {
                    "filename": filename,
                    "file_data": f"data:{mime_type};base64,{raw_data}"
                }
            })
            text_parts.append(f"[PDF attached: {filename}]")
        
        else:
            # Use extracted text content for other files or non-capable models
            if content:
                text_parts.append(f"--- {filename} ({file_type}) ---\n{content[:5000]}")
    
    text_context = ""
    if text_parts:
        text_context = "\n\n=== COMPANY DOCUMENTS ===\n" + "\n\n".join(text_parts)
    
    return text_context, file_parts


async def generate_agent_opinion(
    agent: Dict[str, Any],
    question: str,
    context: Optional[str],
    company_files: List[Dict[str, Any]],
    user_id: int,
    meeting_id: str
) -> Dict[str, Any]:
    """Generate an opinion from a single agent."""
    model = agent.get('model', 'gpt-4o-mini')
    agent_id = str(agent.get('_id', 'unknown'))
    agent_name = agent.get('name', 'Unknown Agent')
    
    add_debug_log(agent_id, agent_name, "info", f"Starting opinion generation", {
        "model": model,
        "question_length": len(question),
        "context_length": len(context) if context else 0,
        "num_files": len(company_files)
    })
    
    client = await get_openai_client()
    if not client:
        error_msg = "OpenAI API key not configured. Please set it in admin settings."
        add_debug_log(agent_id, agent_name, "error", error_msg)
        raise ValueError(error_msg)
    
    use_json_mode = supports_json_mode(model)
    
    add_debug_log(agent_id, agent_name, "info", f"Model configuration", {
        "model": model,
        "json_mode_supported": use_json_mode,
        "vision_supported": supports_vision(model),
        "file_input_supported": supports_file_input(model)
    })
    
    # Build file context - for vision models, images are passed directly
    file_context, image_parts = build_file_content_for_model(company_files, model)
    
    if image_parts:
        add_debug_log(agent_id, agent_name, "info", f"Including {len(image_parts)} image/file parts in request")
    
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

    user_text = f"""The board has received the following question for deliberation:

QUESTION: {question}

{f'ADDITIONAL CONTEXT: {context}' if context else ''}
{file_context if file_context else ''}

Please provide your professional opinion as the {agent['role']}. Remember to respond with ONLY valid JSON."""

    # Build user message content
    if image_parts:
        # Vision model with images - use content array
        user_content = [{"type": "text", "text": user_text}] + image_parts
    else:
        # Text only
        user_content = user_text

    try:
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.7,
        }
        
        # Use appropriate token limit parameter based on model
        if uses_max_completion_tokens(model):
            request_params["max_completion_tokens"] = 2000
        else:
            request_params["max_tokens"] = 2000
        
        if use_json_mode:
            request_params["response_format"] = {"type": "json_object"}
        
        add_debug_log(agent_id, agent_name, "info", "Sending request to OpenAI API", {
            "model": model,
            "temperature": 0.7,
            "json_mode": use_json_mode,
            "system_prompt_length": len(system_message),
            "user_content_type": "multipart" if image_parts else "text",
            "user_text_length": len(user_text)
        })
        
        response = await client.chat.completions.create(**request_params)
        
        # Log raw response details
        choice = response.choices[0] if response.choices else None
        finish_reason = choice.finish_reason if choice else "no_choice"
        
        add_debug_log(agent_id, agent_name, "info", "Received response from OpenAI API", {
            "finish_reason": finish_reason,
            "has_content": bool(choice and choice.message.content),
            "content_length": len(choice.message.content) if choice and choice.message.content else 0,
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0,
            "total_tokens": response.usage.total_tokens if response.usage else 0
        })
        
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
        
        response_text = response.choices[0].message.content if response.choices else None
        
        # Check for empty or None response
        if not response_text or not response_text.strip():
            # Check if there's a refusal
            refusal = getattr(response.choices[0].message, 'refusal', None) if response.choices else None
            
            add_debug_log(agent_id, agent_name, "error", "Empty response from model", {
                "finish_reason": finish_reason,
                "refusal": refusal,
                "raw_content": repr(response_text),
                "choices_count": len(response.choices) if response.choices else 0,
                "full_response_id": response.id if hasattr(response, 'id') else None
            })
            
            if refusal:
                raise ValueError(f"Model refused to respond: {refusal}")
            raise ValueError(f"Model returned an empty response. Finish reason: {finish_reason}")
        
        add_debug_log(agent_id, agent_name, "info", "Parsing response", {
            "response_preview": response_text[:200] if len(response_text) > 200 else response_text
        })
        
        if use_json_mode:
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError as json_err:
                add_debug_log(agent_id, agent_name, "error", "JSON parsing failed in JSON mode", {
                    "error": str(json_err),
                    "raw_response": response_text[:500]
                })
                raise
        else:
            result = extract_json_from_text(response_text)
        
        # Validate we got the expected fields
        opinion = result.get('opinion', '')
        reasoning = result.get('reasoning', '')
        confidence = float(result.get('confidence', 0.5))
        
        if not opinion:
            add_debug_log(agent_id, agent_name, "warning", "Empty opinion field in parsed response", {
                "parsed_result": result
            })
        
        add_debug_log(agent_id, agent_name, "info", "Successfully generated opinion", {
            "opinion_length": len(opinion),
            "reasoning_length": len(reasoning),
            "confidence": confidence
        })
        
        return {
            "agent_id": agent_id,
            "agent_name": agent['name'],
            "agent_role": agent['role'],
            "opinion": opinion,
            "reasoning": reasoning,
            "confidence": confidence,
            "weights_applied": weights,
            "model_used": model,
            "tokens_used": usage.total_tokens if usage else 0,
            "timestamp": datetime.utcnow()
        }
    except Exception as e:
        error_details = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }
        add_debug_log(agent_id, agent_name, "error", f"Exception during opinion generation: {str(e)}", error_details)
        
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
            "timestamp": datetime.utcnow(),
            "error": True,
            "error_details": error_details
        }


async def generate_chair_summary(
    question: str,
    context: Optional[str],
    opinions: List[Dict[str, Any]],
    user_id: int,
    meeting_id: str,
    company_files: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, str]:
    """Generate the Chair of the Board's summary and recommendation."""
    chair = await get_chair_agent()
    chair_name = chair.get('name', 'Board Chair')
    
    add_debug_log("chair", chair_name, "info", "Starting chair summary generation", {
        "num_opinions": len(opinions),
        "question_length": len(question),
        "has_context": bool(context),
        "num_files": len(company_files) if company_files else 0
    })
    
    client = await get_openai_client()
    if not client:
        add_debug_log("chair", chair_name, "error", "OpenAI API key not configured")
        raise ValueError("OpenAI API key not configured.")
    
    model = chair.get('model', 'gpt-4o-mini')
    use_json_mode = supports_json_mode(model)
    
    add_debug_log("chair", chair_name, "info", "Chair model configuration", {
        "model": model,
        "json_mode_supported": use_json_mode
    })
    
    # Build file context for chair too
    file_context = ""
    image_parts = []
    if company_files:
        file_context, image_parts = build_file_content_for_model(company_files, model)
    
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

    user_text = f"""QUESTION PRESENTED TO THE BOARD:
{question}

{f'CONTEXT: {context}' if context else ''}
{file_context if file_context else ''}

BOARD MEMBER OPINIONS:
{opinions_text}

Please synthesize these opinions and provide your recommendation as Chair of the Board. Remember to respond with ONLY valid JSON.
"""

    # Build user message content
    if image_parts:
        user_content = [{"type": "text", "text": user_text}] + image_parts
    else:
        user_content = user_text

    try:
        request_params = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_content}
            ],
            "temperature": 0.7,
        }
        
        # Use appropriate token limit parameter based on model
        if uses_max_completion_tokens(model):
            request_params["max_completion_tokens"] = 3000
        else:
            request_params["max_tokens"] = 3000
        
        if use_json_mode:
            request_params["response_format"] = {"type": "json_object"}
        
        add_debug_log("chair", chair_name, "info", "Sending chair summary request to OpenAI", {
            "model": model,
            "json_mode": use_json_mode,
            "opinions_text_length": len(opinions_text)
        })
        
        response = await client.chat.completions.create(**request_params)
        
        choice = response.choices[0] if response.choices else None
        finish_reason = choice.finish_reason if choice else "no_choice"
        
        add_debug_log("chair", chair_name, "info", "Received chair summary response", {
            "finish_reason": finish_reason,
            "has_content": bool(choice and choice.message.content),
            "content_length": len(choice.message.content) if choice and choice.message.content else 0,
            "prompt_tokens": response.usage.prompt_tokens if response.usage else 0,
            "completion_tokens": response.usage.completion_tokens if response.usage else 0
        })
        
        usage = response.usage
        if usage:
            await record_token_usage(
                user_id=user_id,
                agent_id="chair",
                agent_name=chair_name,
                agent_role="Chair of the Board",
                model=model,
                meeting_id=meeting_id,
                prompt_tokens=usage.prompt_tokens,
                completion_tokens=usage.completion_tokens
            )
        
        response_text = response.choices[0].message.content if response.choices else None
        
        # Check for empty or None response
        if not response_text or not response_text.strip():
            refusal = getattr(response.choices[0].message, 'refusal', None) if response.choices else None
            
            add_debug_log("chair", chair_name, "error", "Empty response from chair model", {
                "finish_reason": finish_reason,
                "refusal": refusal,
                "raw_content": repr(response_text)
            })
            
            if refusal:
                raise ValueError(f"Model refused to respond: {refusal}")
            raise ValueError(f"Model returned an empty response. Finish reason: {finish_reason}")
        
        if use_json_mode:
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError as json_err:
                add_debug_log("chair", chair_name, "error", "JSON parsing failed for chair response", {
                    "error": str(json_err),
                    "raw_response": response_text[:500]
                })
                raise
        else:
            result = extract_json_from_text(response_text)
            if 'summary' not in result:
                result = {
                    "summary": response_text[:1000] if len(response_text) > 1000 else response_text,
                    "recommendation": "See summary above for details."
                }
        
        add_debug_log("chair", chair_name, "info", "Successfully generated chair summary", {
            "summary_length": len(result.get('summary', '')),
            "recommendation_length": len(result.get('recommendation', ''))
        })
        
        return {
            "summary": result.get('summary', ''),
            "recommendation": result.get('recommendation', ''),
            "model_used": model,
            "tokens_used": usage.total_tokens if usage else 0
        }
    except Exception as e:
        error_details = {
            "error_type": type(e).__name__,
            "error_message": str(e),
            "traceback": traceback.format_exc()
        }
        add_debug_log("chair", chair_name, "error", f"Exception during chair summary: {str(e)}", error_details)
        
        return {
            "summary": f"Error generating summary: {str(e)}",
            "recommendation": "Unable to generate recommendation due to an error.",
            "model_used": model,
            "tokens_used": 0,
            "error": True,
            "error_details": error_details
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
