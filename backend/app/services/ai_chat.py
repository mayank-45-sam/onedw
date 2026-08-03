from typing import AsyncGenerator
import json as json_module
import base64
import httpx
from app.core.config import settings
from loguru import logger

SYSTEM_PROMPT = """You are OneDW Assistant, a friendly AI assistant for home services.

Rules:
- Respond like a human, not like an API.
- Never return JSON, objects, arrays, or code blocks unless the user explicitly asks for them.
- Use simple, natural, conversational language.
- Ask only one question at a time.
- Keep responses short and easy to understand.
- Greet the user naturally.
- Understand the user's problem and guide them step by step.
- If the user writes in Tamil (தமிழ்), ALWAYS respond in Tamil or Tanglish (Tamil mixed with simple English words). Never switch to English-only for Tamil input. Even if your Tamil voice is robotic, always write in Tamil/Tanglish.
- When you know the service category, mention it naturally.
- If you can estimate a price, write it in a sentence instead of JSON.
- At the end, suggest booking a worker if appropriate.

Language rules:
- User writes in Tamil → respond in Tamil/Tanglish (Tamil + English mix)
- User writes in English → respond in simple English
- User writes in Hindi → respond in Hindi

Example:

User: Hi

Assistant: Hello! 👋 Welcome to OneDW Assistant. How can I help you today?

User: My light is flickering.

Assistant: I can help with that. It sounds like an electrical issue. Is the flickering happening in just one room or throughout your home?

User: Only one room.

Assistant: Thanks! This could be caused by a loose bulb, faulty switch, or wiring issue. I recommend booking an electrician to inspect it. The typical inspection cost is around $10–$20. Would you like me to help you book an electrician?

User: என் குழாய் லீக் ஆகுது

Assistant: Sari... water off pannunga... tape wrap pannunga... temporary fix dhaan... plumber venuma?

Quick suggestions when greeting a user:
1. 🔧 Plumbing Issue
2. ⚡ Electrical Problem
3. ❄️ AC / Appliance Repair
4. 🐜 Pest Control
5. 🧹 Cleaning Service
6. 📅 Book a Professional"""

SERVICE_ASSISTANT_PROMPT = """You are a Service Assistant AI for a service marketplace app.

Your job is to:
1. Understand the user's problem (text or image description)
2. Identify the correct service category
3. Suggest a solution
4. Provide clear next actions

Always respond in clean JSON format and NOTHING else. Never return empty objects {}.

For service-related problems, respond with this JSON:

{
  "message": "Explain the problem in simple words and suggest solution",
  "service_category": "Electrician / Plumber / AC Repair / Cleaning / Painting / General Maintenance",
  "estimated_price": "Give a realistic range like $10-$30",
  "problem_summary": "Brief 1-2 sentence summary of the problem",
  "actions": [
    {
      "type": "book",
      "label": "Book Service",
      "route": "/booking",
      "payload": {
        "service": "Electrician",
        "price": "$15-$40",
        "problem": "Fan not working"
      }
    },
    {
      "type": "contact",
      "label": "Contact Worker",
      "route": "/workers",
      "payload": {
        "service": "Electrician",
        "problem": "Fan not working"
      }
    },
    {
      "type": "schedule",
      "label": "Schedule for Later",
      "route": "/schedule",
      "payload": {}
    }
  ]
}

For queries NOT related to home/service problems (e.g., asking about a person, history, general knowledge), respond with this JSON:

{
  "message": "This assistant helps with home/service-related issues. Please describe your problem (e.g., AC not cooling, pipe leaking).",
  "service_category": null,
  "estimated_price": null,
  "problem_summary": null,
  "actions": []
}

Rules:
- Always include route and payload in every action
- Payload must contain real values (not variable names or placeholders)
- For schedule action, payload is an empty object {}
- For valid service problems, always include all 3 actions
- If no meaningful payload data, include empty payload {}
- Service categories must be ONE of: Electrician, Plumber, AC Repair, Cleaning, Painting, General Maintenance
- Respond in the same language the user writes in

Examples:
User: "My fan is not working"
→ Electrician, $15-$40

User: "Who is Albert Einstein?"
→ service_category: null, estimated_price: null, problem_summary: null, actions: []

User: "I uploaded a photo of a leaking pipe"
→ Plumber, $20-$50

User: "My AC is not cooling"
→ AC Repair, $25-$60

User: "I need my house cleaned"
→ Cleaning, $10-$30

User: "I want to paint my room"
→ Painting, $30-$80
"""


async def stream_chat(
    messages: list[dict],
    language: str = "en",
) -> AsyncGenerator[str, None]:
    """Stream a chat completion response from the configured LLM provider."""
    if not settings.AI_API_KEY:
        yield "[Error: AI service is not configured. Please contact support.]"
        return

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_msg = {"role": "system", "content": SYSTEM_PROMPT}
    payload = {
        "model": settings.AI_MODEL,
        "messages": [system_msg] + messages,
        "max_tokens": settings.AI_MAX_TOKENS,
        "temperature": 0.7,
        "stream": True,
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                f"{settings.AI_API_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    logger.error(f"LLM API error {response.status_code}: {body[:500]}")
                    if response.status_code == 401:
                        yield "[Error: AI service authentication failed. Please check the API key configuration.]"
                    elif response.status_code == 422:
                        yield "[Error: AI service cannot process this request. The model may be unavailable. Please try again later.]"
                    elif response.status_code == 429:
                        yield "[Error: AI service is rate limited. Please wait a moment and try again.]"
                    elif response.status_code >= 500:
                        yield "[Error: AI service is temporarily unavailable. Please try again in a few minutes.]"
                    else:
                        yield f"[Error: AI service returned status {response.status_code}. Please try again.]"
                    return

                async for line in response.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        break
                    try:
                        chunk = json_module.loads(data)
                        delta = chunk.get("choices", [{}])[0].get("delta", {})
                        content = delta.get("content")
                        if content:
                            yield content
                    except (json_module.JSONDecodeError, IndexError, KeyError):
                        continue

    except httpx.TimeoutException:
        yield "\n\n[Error: The request timed out. Please try a shorter message.]"
    except httpx.ConnectError:
        yield "\n\n[Error: Could not connect to AI service. Please try again later.]"
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        yield "\n\n[Error: An unexpected error occurred. Please try again.]"


def _strip_json_markdown(content: str) -> str:
    """Remove markdown code block wrapping from JSON content."""
    stripped = content.strip()
    if stripped.startswith("```json"):
        stripped = stripped[len("```json"):]
    elif stripped.startswith("```"):
        stripped = stripped[len("```"):]
    if stripped.endswith("```"):
        stripped = stripped[:-len("```")]
    return stripped.strip()


async def service_assistant(
    problem: str,
    language: str = "en",
) -> dict:
    """Analyze a user's problem and return structured service assistance as JSON."""
    if not settings.AI_API_KEY:
        return {
            "message": "AI service is not configured. Please contact support.",
            "service_category": "General Maintenance",
            "estimated_price": "$0-$0",
            "actions": [
                {"type": "book", "label": "Book Service"},
                {"type": "contact", "label": "Contact Worker"},
                {"type": "schedule", "label": "Schedule for Later"},
            ],
        }

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }

    system_msg = {"role": "system", "content": SERVICE_ASSISTANT_PROMPT}
    user_msg = {"role": "user", "content": problem}
    payload = {
        "model": settings.AI_MODEL,
        "messages": [system_msg, user_msg],
        "max_tokens": settings.AI_MAX_TOKENS,
        "temperature": 0.4,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )

            if response.status_code != 200:
                body = await response.aread()
                logger.error(f"Service assistant API error {response.status_code}: {body[:500]}")
                if response.status_code == 401:
                    msg = "AI service authentication failed. Please contact support."
                elif response.status_code == 422:
                    msg = "AI service cannot process this request. The model may be unavailable. Please try again later."
                elif response.status_code == 429:
                    msg = "AI service is rate limited. Please wait a moment and try again."
                elif response.status_code >= 500:
                    msg = "AI service is temporarily unavailable. Please try again in a few minutes."
                else:
                    msg = f"AI service returned status {response.status_code}. Please try again."
                return {
                    "message": msg,
                    "service_category": "General Maintenance",
                    "estimated_price": "$0-$0",
                    "actions": [
                        {"type": "book", "label": "Book Service"},
                        {"type": "contact", "label": "Contact Worker"},
                        {"type": "schedule", "label": "Schedule for Later"},
                    ],
                }

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")

            content = _strip_json_markdown(content)

            try:
                parsed = json_module.loads(content)
                required_keys = {"message", "service_category", "estimated_price", "actions"}
                if not required_keys.issubset(parsed.keys()):
                    raise ValueError("Missing required keys")
                actions = parsed.get("actions", [])
                if not isinstance(actions, list) or len(actions) != 3:
                    raise ValueError("Actions must be a list of 3 items")
                return parsed
            except (json_module.JSONDecodeError, ValueError):
                logger.warning(f"Service assistant returned invalid JSON: {content[:200]}")
                return {
                    "message": content if content else "Unable to analyze your request.",
                    "service_category": "General Maintenance",
                    "estimated_price": "$0-$0",
                    "actions": [
                        {"type": "book", "label": "Book Service"},
                        {"type": "contact", "label": "Contact Worker"},
                        {"type": "schedule", "label": "Schedule for Later"},
                    ],
                }

    except httpx.TimeoutException:
        return {
            "message": "The request timed out. Please try again.",
            "service_category": "General Maintenance",
            "estimated_price": "$0-$0",
            "actions": [
                {"type": "book", "label": "Book Service"},
                {"type": "contact", "label": "Contact Worker"},
                {"type": "schedule", "label": "Schedule for Later"},
            ],
        }
    except httpx.ConnectError:
        return {
            "message": "Could not connect to AI service. Please try again later.",
            "service_category": "General Maintenance",
            "estimated_price": "$0-$0",
            "actions": [
                {"type": "book", "label": "Book Service"},
                {"type": "contact", "label": "Contact Worker"},
                {"type": "schedule", "label": "Schedule for Later"},
            ],
        }
    except Exception as e:
        logger.error(f"Service assistant error: {e}")
        return {
            "message": "An unexpected error occurred. Please try again.",
            "service_category": "General Maintenance",
            "estimated_price": "$0-$0",
            "actions": [
                {"type": "book", "label": "Book Service"},
                {"type": "contact", "label": "Contact Worker"},
                {"type": "schedule", "label": "Schedule for Later"},
            ],
        }


VISION_PROMPT = """List every object you can see in this image as a JSON array of lowercase strings.
Focus on concrete physical objects — tools, furniture, appliances, fixtures, etc.
Include materials or visible conditions only if they are obvious (e.g., "water", "fire", "dust").
Return ONLY a valid JSON array — no markdown, no explanation, no extra text.

Example: ["tap", "water", "sink", "pipe"]
Example: ["wire", "socket", "fan", "switch"]"""

SERVICE_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "plumbing": [
        "tap", "pipe", "water", "leak", "faucet", "shower", "bathtub",
        "toilet", "sink", "drain", "plunger", "tank", "plumber", "pump",
        "valve", "wrench", "sewer", "flush", "basin", "bucket", "tub",
        "spigot", "nozzle", "hose", "fountain", "plumbing", "drip",
        "overflow", "clog", "bathroom", "washbasin", "spout",
        "showerhead", "bath", "water heater", "geyser",
    ],
    "electrician": [
        "wire", "socket", "fan", "switch", "light", "lamp", "electric",
        "circuit", "fuse", "bulb", "led", "cable", "plug", "outlet",
        "breaker", "panel", "voltage", "inverter", "battery", "charger",
        "adapter", "conduit", "electrical", "ceiling fan", "tube light",
        "chandelier", "lantern", "spotlight", "floodlight", "spark",
        "fire", "mcb", "wiring", "extension cord", "power strip",
        "junction box",
    ],
    "ac_repair": [
        "ac", "air conditioner", "aircond", "cooling", "condenser",
        "evaporator", "compressor", "thermostat", "hvac", "vent", "duct",
        "cooler", "air cooler", "remote control", "fan coil", "chiller",
        "refrigerant", "defrost", "temperature", "blower", "heater",
        "furnace", "heat pump", "radiator", "coolant", "exhaust",
        "air handler", "hvac unit",
    ],
    "cleaning": [
        "dirty", "dust", "mop", "broom", "vacuum", "cleaner", "sponge",
        "brush", "detergent", "soap", "towel", "duster", "rag", "scrub",
        "bleach", "squeegee", "disinfect", "sweep", "wipe", "sanitize",
        "polish", "shampoo", "floor", "tile", "grout", "cleaning",
        "housework", "wash", "laundry", "mess", "stain", "filth",
        "window", "glass", "mirror", "carpet", "rug", "mat", "sofa",
        "couch", "furniture", "upholstery", "curtain", "bed", "linen",
        "pillow", "blanket", "mattress",
    ],
    "appliance": [
        "fridge", "refrigerator", "washer", "washing machine", "microwave",
        "oven", "toaster", "iron", "blender", "mixer", "grinder",
        "dryer", "dishwasher", "kettle", "stove", "cooler", "freezer",
        "extractor", "chimney", "hob", "cooker", "induction",
        "air fryer", "juicer", "coffee maker", "sandwich maker",
        "water purifier", "rice cooker", "television", "tv",
        "monitor", "speaker", "projector", "printer", "computer",
        "laptop", "router", "modem", "cctv", "camera",
        "home appliance", "electronic device",
    ],
}

NON_SERVICE_KEYWORDS = [
    "dog", "cat", "bird", "fish", "horse", "cow", "sheep", "pig",
    "person", "man", "woman", "child", "baby", "face",
    "car", "truck", "bus", "train", "airplane", "helicopter",
    "pizza", "hamburger", "cake", "cookie", "ice cream", "fruit",
    "sunset", "mountain", "beach", "ocean", "lake", "river",
    "forest", "tree", "flower", "plant", "leaf", "grass",
    "cloud", "sky", "star", "moon",
    "book", "magazine", "newspaper", "paper", "document", "letter", "pen", "pencil",
]


def _match_service_from_labels(labels: list[str]) -> str | None:
    text = " ".join(labels).lower()
    for category, keywords in SERVICE_CATEGORY_KEYWORDS.items():
        for kw in keywords:
            if kw in text:
                return category
    return None


def _is_non_service(labels: list[str]) -> bool:
    text = " ".join(labels).lower()
    return any(kw in text for kw in NON_SERVICE_KEYWORDS)


def _extract_labels_from_vision_response(content: str) -> list[str]:
    stripped = content.strip()
    if stripped.startswith("```json"):
        stripped = stripped[len("```json"):]
    elif stripped.startswith("```"):
        stripped = stripped[len("```"):]
    if stripped.endswith("```"):
        stripped = stripped[:-len("```")]
    stripped = stripped.strip()
    try:
        parsed = json_module.loads(stripped)
        if isinstance(parsed, list):
            return [str(item).strip().lower() for item in parsed if item]
    except json_module.JSONDecodeError:
        pass
    return []


async def analyze_image_vision(image_data: str) -> dict:
    """Send image to Vision API, extract labels, detect service category."""
    if not settings.AI_API_KEY:
        return {"labels": [], "category": None, "error": "AI service not configured"}

    headers = {
        "Authorization": f"Bearer {settings.AI_API_KEY}",
        "Content-Type": "application/json",
    }

    user_content = [
        {"type": "text", "text": VISION_PROMPT},
        {"type": "image_url", "image_url": {"url": image_data}},
    ]

    payload = {
        "model": settings.AI_MODEL,
        "messages": [{"role": "user", "content": user_content}],
        "max_tokens": 256,
        "temperature": 0.3,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{settings.AI_API_BASE_URL}/chat/completions",
                json=payload,
                headers=headers,
            )

            if response.status_code != 200:
                body = await response.aread()
                logger.error(f"Vision API error {response.status_code}: {body[:500]}")
                return {"labels": [], "category": None, "error": f"API returned {response.status_code}"}

            data = response.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            labels = _extract_labels_from_vision_response(content)

            if not labels:
                return {"labels": [], "category": None, "error": "No labels extracted"}

            category = _match_service_from_labels(labels)

            if not category and _is_non_service(labels):
                return {"labels": labels, "category": None}

            return {"labels": labels, "category": category}

    except httpx.TimeoutException:
        logger.error("Vision API timed out")
        return {"labels": [], "category": None, "error": "Request timed out"}
    except httpx.ConnectError:
        logger.error("Vision API connection error")
        return {"labels": [], "category": None, "error": "Connection error"}
    except Exception as e:
        logger.error(f"Vision API error: {e}")
        return {"labels": [], "category": None, "error": str(e)}
