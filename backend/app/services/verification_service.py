"""Enterprise worker verification service.

Implements the AI-powered skill verification pipeline:
  documents -> AI technical test -> practical assessment -> AI voice interview
  -> trust score -> badge -> certificate (QR + PDF).

Gemini (google-genai) drives question generation, image/video evaluation,
interview follow-up generation and scoring. A deterministic local question
bank and heuristic scoring act as fallbacks so the flow never breaks.
"""

import copy
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

from loguru import logger

from google import genai
from google.genai import types

from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.models.verification import (
    WorkerVerification,
    SkillTestSession,
    PracticalAssessment,
    VoiceInterview,
    VerificationCertificate,
)
from app.models.worker import Worker
from app.models.user import User
from app.models.certificate import Certificate

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

BADGE_GOLD = "gold"
BADGE_PRO = "pro"
BADGE_BEGINNER = "beginner"
BADGE_REJECTED = "rejected"

QUESTION_TIME_LIMITS = {
    "mcq": 20,
    "image": 40,
    "scenario": 45,
    "short_answer": 60,
}

# Languages the worker can take the skill test in. The value is the language's
# English name used in the LLM prompt.
SUPPORTED_TEST_LANGUAGES = {
    "en": "English",
    "tamil": "Tamil",
    "hindi": "Hindi",
}

_LANGUAGE_RULES = {
    "en": "English.",
    "tamil": "Tamil (தமிழ்). Write every question, every answer option and every "
        "worker-facing label in Tamil. Keep technical terms professional and commonly understood.",
    "hindi": "Hindi (हिन्दी). Write every question, every answer option and every "
        "worker-facing label in Hindi. Keep technical terms professional and commonly understood.",
}

PASS_SCORE = 60.0
REJECTED_RETRY_DAYS = 7

BADGE_LABELS = {
    BADGE_GOLD: "Gold Verified",
    BADGE_PRO: "Verified Pro",
    BADGE_BEGINNER: "Beginner",
    BADGE_REJECTED: "Rejected",
}

DEFAULT_IMAGE_URL = None

# ---------------------------------------------------------------------------
# Gemini helpers
# ---------------------------------------------------------------------------


def _get_gemini_client() -> Optional[genai.Client]:
    if not settings.GEMINI_API_KEY:
        return None
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def gemini_available() -> bool:
    return bool(settings.GEMINI_API_KEY)


def _parse_ai_json(text: str):
    """Extract JSON from a Gemini response, tolerating fences/truncation.

    Returns whatever top-level JSON shape was produced (object or array).
    """
    cleaned = (text or "").strip()
    for prefix in ("```json", "```"):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3].rstrip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass
    start = cleaned.find("{")
    if start == -1:
        raise ValueError("No JSON object found in AI response")
    cleaned = cleaned[start:]
    for _ in range(12):
        for candidate in (cleaned, cleaned.rstrip() + "}"):
            try:
                return json.loads(candidate)
            except json.JSONDecodeError:
                continue
        idx = cleaned.rfind(",")
        if idx == -1:
            break
        cleaned = cleaned[:idx]
    raise ValueError("Could not parse AI response as JSON")


def _generate_json(prompt: str, temperature: float = 0.7):
    """Run a Gemini call that must return JSON (object or array)."""
    client = _get_gemini_client()
    if not client:
        raise ValueError("Gemini API not configured")
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=prompt,
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=4096,
        ),
    )
    return _parse_ai_json(response.text or "")


def _profession_key(profession: str) -> str:
    p = (profession or "").lower().strip()
    for key in ["electrician", "plumber", "carpenter", "ac technician", "cleaner", "painter", "mason"]:
        if key in p:
            return key
    for token in ["electric", "electrical", "wiring"]:
        if token in p:
            return "electrician"
    for token in ["plumbing", "pipe", "drain", "water", "tap", "bathroom"]:
        if token in p:
            return "plumber"
    for token in ["carpentry", "wood", "furniture"]:
        if token in p:
            return "carpenter"
    for token in ["ac", "air condition", "hvac", "cooling", "refrigeration"]:
        if token in p:
            return "ac technician"
    for token in ["clean", "housekeeping", "maid"]:
        if token in p:
            return "cleaner"
    for token in ["paint"]:
        if token in p:
            return "painter"
    for token in ["mason", "brick", "tile", "construction"]:
        if token in p:
            return "mason"
    return "general"


_PROFESSION_TOPICS = {
    "electrician": "wiring, MCBs and fuses, earthing, switchboards and sockets, capacitors, "
        "live/neutral/earth wire identification, short circuits, replacing switches and fans",
    "plumber": "leaking pipes and taps, PVC/PPR pipes, isolation and non-return valves, water pressure, "
        "drains and blockages, geysers/water heaters, washer vs cartridge tap repair",
    "carpenter": "wood joints (mortise/tenon, dovetail), measuring and cutting, doors and hinges, "
        "furniture assembly and repair, termite damage, mitre cuts, kitchen worktops",
    "ac technician": "refrigerant levels and gauges, compressors, capacitors and contactors, coils and drains, "
        "cooling faults, R-410A/R-32 gas, deep cleaning, thermostat/sensor and PCB",
    "cleaner": "deep cleaning, disinfecting high-touch surfaces, mould and stains, glass and floor care, "
        "safe chemical use, work-at-height safety, cleaning order (top to bottom)",
    "painter": "surface preparation, priming, paint application and finish coats, cracks and damp patches, "
        "colour matching, straight paint lines, washable finishes",
    "mason": "brick walls, mortar mix ratios, plastering, curing, tiling and grouting, waterproofing, "
        "levels and plumb lines, expansion joints",
    "general": "trade tools, safety practices, diagnosing faults, repair steps, quality checks",
}


def _profession_guide(profession: str) -> str:
    """Short list of on-topic subjects for the given profession (used in AI prompts)."""
    return _PROFESSION_TOPICS.get(_profession_key(profession), _PROFESSION_TOPICS["general"])


# Keyword lists used to validate that every generated question is genuinely about
# the selected profession. A question is accepted only when its text mentions at
# least one of these trade-specific terms; otherwise it is regenerated from the
# deterministic (on-topic) local bank before it is ever shown to the worker.
_PROFESSION_KEYWORDS = {
    "electrician": [
        "wire", "wiring", "mcb", "fuse", "earthing", "earth", "switchboard", "socket", "capacitor",
        "live", "neutral", "short circuit", "switch", "fan", "voltage", "current", "electric",
        "circuit", "insulation", "load", "terminal", "regulator", "tester", "conduit", "power",
    ],
    "plumber": [
        "pipe", "tap", "valve", "water", "pressure", "drain", "blockage", "clog", "geyser",
        "heater", "washer", "cartridge", "leak", "plumbing", "joint", "pvc", "ppr", "trap",
        "bathroom", "sink", "sewage", "aerator", "stopcock", "gasket", "fitting", "sump",
    ],
    "carpenter": [
        "wood", "joint", "mortise", "tenon", "dovetail", "measure", "cut", "hinge", "door",
        "furniture", "termite", "mitre", "worktop", "shelf", "drawer", "laminate", "board",
        "chisel", "saw", "pocket screw", "pilot hole", "wardrobe", "cabinet", "timber",
    ],
    "ac technician": [
        "ac", "air conditioner", "air-condition", "refrigerant", "gas", "compressor", "capacitor",
        "contactor", "coil", "drain", "cooling", "thermostat", "sensor", "pcb", "hvac",
        "freon", "r-410a", "r410a", "r-32", "r32", "condenser", "evaporator", "defrost", "filter",
    ],
    "cleaner": [
        "clean", "cleaning", "disinfect", "surface", "mould", "mold", "stain", "glass", "floor",
        "chemical", "ppe", "vacuum", "sweep", "mop", "sanitise", "sanitize", "bathroom",
        "kitchen", "grime", "degreaser", "microfibre", "microfiber", "squeegee", "polish",
    ],
    "painter": [
        "paint", "painting", "primer", "coat", "emulsion", "roller", "brush", "wall", "ceiling",
        "crack", "damp", "moisture", "finish", "colour", "color", "sheen", "peel", "sand",
        "masking", "texture", "sealer", "primer", "acrylic", "lime wash",
    ],
    "mason": [
        "brick", "mortar", "plaster", "plastering", "cure", "curing", "tile", "grout",
        "waterproof", "level", "plumb", "wall", "concrete", "cement", "slab", "expansion joint",
        "boundary", "mason", "trowel", "stone", "cladding",
    ],
    "general": [
        "tool", "safety", "customer", "estimate", "measure", "quality", "repair", "job",
        "work", "professional", "ppe", "ladder", "clean",
    ],
}

# Real, hands-on faults a candidate is likely to meet on the job. Used to make the
# fallback interview questions concrete and profession-specific.
_PROFESSION_FAULTS = {
    "electrician": [
        "an MCB that trips whenever a room's AC is running",
        "a ceiling fan that does not start",
        "lights that glow dimly at about 140 V instead of 230 V",
        "a burnt terminal inside a switchboard",
    ],
    "plumber": [
        "a leaking pipe joint under the kitchen sink",
        "a low-pressure kitchen tap caused by a clogged aerator or cartridge",
        "a blocked bathroom drain",
        "a geyser leaking from the bottom",
    ],
    "carpenter": [
        "a sagging wardrobe door on worn hinges",
        "a cracked chair leg",
        "termite damage in a wooden door frame",
        "a loose shelf bracket in a hollow drywall",
    ],
    "ac technician": [
        "a split AC that cools for ten minutes and then stops",
        "a frozen indoor coil caused by low gas or airflow blockage",
        "an AC that leaks water indoors from a clogged drain",
        "a compressor that will not start",
    ],
    "cleaner": [
        "black mould on bathroom tiles",
        "greasy stains on a kitchen chimney and cabinets",
        "water rings and stains on a fabric sofa",
        "streaks on large glass windows and mirrors",
    ],
    "painter": [
        "paint peeling near a window sill",
        "damp patches on a bedroom ceiling",
        "an uneven emulsion finish on a large wall",
        "cracks in a wall that need to be repaired before painting",
    ],
    "mason": [
        "vertical cracks in a boundary wall",
        "bricks that are not aligning with the string line",
        "a bathroom floor that needs waterproofing before tiling",
        "plaster that keeps cracking after drying",
    ],
    "general": [
        "a common fault in your trade",
        "a job where the first diagnosis was wrong",
        "a customer who wants extra work outside the agreed scope",
        "a situation where a repair needed rework",
    ],
}

# Profession-specific criteria the AI practical evaluator must score against.
_PRACTICAL_CRITERIA = {
    "electrician": "wiring quality and neatness, proper insulation and termination, MCB and switchboard "
        "installation, earthing, and electrical safety compliance",
    "plumber": "pipe alignment and joints, leak-free fittings, correct valve and tap installation, "
        "drainage flow, neatness and finishing",
    "carpenter": "cutting accuracy and measurements, joint quality and alignment, finishing, "
        "and furniture assembly quality",
    "ac technician": "installation neatness, refrigerant line management, drain line routing, "
        "electrical connections and safety, and overall workmanship",
    "cleaner": "thoroughness of cleaning, attention to detail, streak-free and residue-free surfaces, "
        "and use of correct products",
    "painter": "paint finish and coverage, straight edges and lines, surface preparation, "
        "wall quality and uniform coats",
    "mason": "level and plumb alignment, mortar joint consistency, tiling and grouting quality, "
        "waterproofing and finishing",
    "general": "overall work quality, neatness, tool usage and professional finish",
}


def _practical_criteria(profession: str) -> str:
    """Profession-specific focus areas for practical work evaluation."""
    return _PRACTICAL_CRITERIA.get(_profession_key(profession), _PRACTICAL_CRITERIA["general"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Local question bank (fallback / offline mode)
# ---------------------------------------------------------------------------


def _mcq(question: str, options: list, correct: int, difficulty: str) -> dict:
    return {
        "id": f"q_{uuid.uuid4().hex[:8]}",
        "type": "mcq",
        "question": question,
        "options": options,
        "correct_index": correct,
        "difficulty": difficulty,
        "time_limit": QUESTION_TIME_LIMITS["mcq"],
    }


def _scenario(question: str, options: Optional[list], correct: Optional[int], difficulty: str) -> dict:
    return {
        "id": f"q_{uuid.uuid4().hex[:8]}",
        "type": "scenario",
        "question": question,
        "options": options,
        "correct_index": correct,
        "difficulty": difficulty,
        "time_limit": QUESTION_TIME_LIMITS["scenario"],
    }


def _short(question: str, difficulty: str) -> dict:
    return {
        "id": f"q_{uuid.uuid4().hex[:8]}",
        "type": "short_answer",
        "question": question,
        "options": [],
        "correct_index": None,
        "difficulty": difficulty,
        "time_limit": QUESTION_TIME_LIMITS["short_answer"],
    }


def _image(question: str, options: list, correct: int, difficulty: str, image_url: Optional[str] = None) -> dict:
    return {
        "id": f"q_{uuid.uuid4().hex[:8]}",
        "type": "image",
        "question": question,
        "options": options,
        "correct_index": correct,
        "difficulty": difficulty,
        "time_limit": QUESTION_TIME_LIMITS["image"],
        "image_url": image_url,
    }


# Profession-specific banks. Each attempt randomly samples a fresh set so the
# same set is never reused twice.
_LOCAL_BANKS = {
    "electrician": {
        "mcq": [
            ("What does an MCB trip indicate in a household circuit?", ["Overload or short circuit", "Low voltage all the time", "Normal operation", "Earth leakage only"], 0),
            ("Which wire colour is LIVE in standard Indian wiring?", ["Red/Brown", "Black", "Green", "Blue"], 0),
            ("What is the safe current rating of a typical 1.5 sq mm copper wire?", ["6–8 A", "15–20 A", "30–40 A", "Above 50 A"], 0),
            ("What should you check FIRST when a fan is not starting?", ["Change the capacitor", "Check if power is reaching the regulator/terminals", "Replace the entire motor", "Rewire the whole house"], 1),
            ("Which tool is used to test whether a wire is live?", ["Tester screwdriver", "Hammer", "Spanner", "Hacksaw"], 0),
            ("What is the purpose of earthing in electrical installations?", ["Protect against electric shock", "Increase voltage", "Reduce electricity bill", "Improve fan speed"], 0),
            ("A 1000W iron at 230V draws approximately how much current?", ["~4.3 A", "~2 A", "~10 A", "~0.5 A"], 0),
            ("What should you do before opening any switchboard?", ["Switch off the main supply and verify no power", "Open immediately", "Wet your hands for safety", "Use metal tools"], 0),
        ],
        "scenario": [
            ("A customer says the MCB of one room keeps tripping only when the AC is on. What is your first diagnostic step?", ["Check for overload on that circuit and measure the AC's starting current", "Replace the MCB immediately", "Blame the AC company", "Suggest a full rewire"], 0),
            ("You find exposed live wires behind a switchboard in a house with small children. What do you do?", ["Switch off supply, insulate/tighten the joints and advise proper covering", "Leave it, it is not your job", "Tell the customer to use it carefully", "Charge extra to look at it"], 0),
            ("During a light fitting, the bulb glows dim and the tester shows ~140V instead of 230V. What is likely wrong?", ["A loose neutral connection causing voltage drop", "The bulb is too powerful", "Nothing is wrong", "The switch is reversed"], 0),
        ],
        "short": [
            ("Explain how you would safely replace a two-way switch.", "hard"),
            ("Why should a washing machine be connected through an isolated socket?", "medium"),
            ("Describe the steps to trace a short circuit inside a wall without breaking the whole wall.", "hard"),
            ("How do you calculate the load before installing a new AC circuit?", "medium"),
        ],
        "image": [
            ("This image shows a burnt switchboard terminal. What is the most likely cause and your repair plan?", ["Loose connection leading to overheating", "Too much paint", "Normal wear", "Cheap switch"], 0),
            ("Look at this picture. Which safety rule is being violated in this wiring setup?", ["Working without insulating gloves on live wires", "Too many cables is fine", "Nothing wrong", "Colour coding is correct"], 0),
        ],
    },
    "plumber": {
        "mcq": [
            ("Which valve is used to shut off the water supply to a single tap?", ["Isolation valve", "Non-return valve", "Pressure relief valve", "Gate valve on the main line"], 0),
            ("What is the most common cause of a low-pressure kitchen tap?", ["Clogged aerator or cartridge", "Too much water", "Pipe colour", "Tap is too new"], 0),
            ("Which jointing method is best for PVC drain pipes?", ["Solvent cement", "Lead caulking", "Only tape", "Nails"], 0),
            ("A geyser is leaking from the bottom. What is most likely faulty?", ["Heating element seal or tank", "The tap handle", "The shower head", "Nothing"], 0),
            ("What tool is used to tighten a compression fitting?", ["Adjustable spanner", "Hammer", "Screwdriver", "Hacksaw"], 0),
            ("What does a vent pipe in a drainage system do?", ["Releases sewer gas and balances pressure", "Increases water pressure", "Adds oxygen to water", "Cools the pipes"], 0),
            ("Which material is commonly used for concealed water lines in modern homes?", ["PPR pipes", "GI pipes only", "Rubber tubes", "Glass pipes"], 0),
            ("What should you do first when a drain is blocked?", ["Use a plunger and identify the blockage point", "Open the wall", "Pour acid on everything", "Call an excavator"], 0),
        ],
        "scenario": [
            ("A customer's ceiling shows a damp patch directly under the bathroom. What is your first diagnostic step?", ["Inspect the bathroom floor/wall joints and water lines for leakage", "Repaint the ceiling", "Wait for rain", "Replace the entire floor"], 0),
            ("A tap sprays water from the handle when opened fully. What is wrong?", ["Worn-out cartridge/O-ring", "The handle is loose only", "Water pressure too low", "Nothing"], 0),
            ("While fixing a leak under the sink, you cannot shut the main valve because it is jammed. What do you do?", ["Attempt to close it safely; if not, isolate using a stopcock upstream and inform customer", "Leave the leak", "Break the valve with force", "Cut the pipe immediately"], 0),
        ],
        "short": [
            ("Explain how you would repair a leaking pipe joint without replacing the whole pipe.", "medium"),
            ("Describe the process of fixing a clogged bathroom drain step by step.", "medium"),
            ("How do you test a newly installed pipe line for leaks?", "hard"),
            ("Why is a non-return valve needed in a water heater installation?", "hard"),
        ],
        "image": [
            ("This image shows a corroded pipe joint with white crust. What does it indicate and how do you fix it?", ["Hard water leakage over time; replace joint/gasket", "Paint is peeling", "Nothing", "Pipe is new"], 0),
            ("Look at this picture of a washbasin trap. What is wrong with this installation?", ["Missing/incorrect trap causing smell", "Looks perfect", "Too shiny", "Wrong colour"], 0),
        ],
    },
    "carpenter": {
        "mcq": [
            ("Which joint is strongest for a table leg to top?", ["Mortise and tenon", "Butt joint", "Butterfly joint only decorative", "Simple nail joint"], 0),
            ("What is the purpose of pocket screws?", ["Quick, hidden strong joints", "Decoration", "Forcing wood to bend", "None"], 0),
            ("Which wood is hardest to work with?", ["Teak", "Balsa", "Pine", "MDF"], 0),
            ("What tool would you use to cut a precise 45° mitre?", ["Mitre saw", "Hammer", "Chisel only", "Hand drill"], 0),
            ("What causes wood to warp?", ["Moisture imbalance", "Too many nails", "Sunlight only", "Age alone"], 0),
            ("What is the standard height of a kitchen worktop?", ["~900 mm", "~500 mm", "~1200 mm", "~1500 mm"], 0),
            ("Which fastener is best for joining particle board?", ["Screw with pilot hole", "Nail", "Staple only", "Glue only"], 0),
            ("What should you check before cutting a laminated board?", ["Blade direction to avoid chipping", "Colour of the board", "Room temperature", "Nothing"], 0),
        ],
        "scenario": [
            ("A wardrobe door is sagging on its hinges. What is the correct fix?", ["Reinforce hinge fixing with plugs/screws and align the door", "Add more clothes", "Glue the door shut", "Replace the whole wardrobe"], 0),
            ("A customer wants a custom shelf but the wall is hollow drywall. What mounting do you use?", ["Hollow wall anchors or a stud-mounted bracket", "Nails only", "Super glue", "Heavy concrete nails directly"], 0),
            ("You find termite damage in a wooden door frame. What do you report?", ["Assess extent, recommend treatment + replacement of affected part", "Paint over it", "Say it is fine", "Only clean it"], 0),
        ],
        "short": [
            ("How do you ensure a drawer slides smoothly and stays aligned?", "medium"),
            ("Describe how you would fix a cracked chair leg.", "hard"),
            ("Explain the process of installing a wooden door and frame.", "hard"),
            ("What safety precautions do you take while using a circular saw?", "medium"),
        ],
        "image": [
            ("This image shows a broken shelf bracket joint. What is the best repair?", ["New bracket/hinge with proper anchors", "Add tape", "Paint over", "Nothing"], 0),
            ("Look at this image of a cabinet joint. What construction technique is shown and is it correct?", ["Dovetail joint — strong and correct", "Butt joint — too weak", "Nail joint", "Glue only"], 0),
        ],
    },
    "ac technician": {
        "mcq": [
            ("What does an AC 'low gas' symptom look like?", ["Warm air with frozen coils", "Extra cool air", "No sound at all", "Water leaking only"], 0),
            ("Which gauge reading indicates the AC is low on refrigerant?", ["Low suction pressure", "High discharge pressure", "No pressure", "Equal pressure"], 0),
            ("What is the correct pressure range for R-410A refrigerant?", ["~120-150 psig on low side (depending on conditions)", "0-10 psig always", "Over 500 psig", "Negative pressure"], 0),
            ("Why does an AC leak water indoors?", ["Clogged drain line or dirty coil", "Too much gas", "High fan speed", "Cold weather only"], 0),
            ("What safety equipment must you wear while servicing an AC?", ["Gloves + goggles", "Nothing", "Only a cap", "Sandals"], 0),
            ("What does a capacitor do in an AC?", ["Provides start/run torque to compressor and fan motors", "Filters the air", "Adds refrigerant", "Reduces noise"], 0),
            ("Which component controls the indoor temperature in a split AC?", ["Thermostat/sensor + PCB", "The remote battery", "The drain pipe", "The outdoor coil"], 0),
            ("What should you check when the compressor does not start?", ["Capacitor, contactor, power supply", "Only the remote", "The wall colour", "Nothing"], 0),
        ],
        "scenario": [
            ("A customer says their split AC cools for 10 minutes then stops. What is your first check?", ["Check for ice formation, drain clog, and sensor faults", "Replace the whole unit", "Add more gas", "Change the remote"], 0),
            ("During gas charging, the low side pressure is normal but the air is still warm. What could be wrong?", ["Clogged filter/coil or faulty reversing valve/compressor valve", "Nothing", "Too much gas is always fine", "Fan speed is high"], 0),
            ("You find the outdoor unit is vibrating loudly. What is the likely cause?", ["Loose compressor mounts or unbalanced fan", "Too much cooling", "The neighbour's unit", "Remote signal"], 0),
        ],
        "short": [
            ("Explain the steps to do a deep clean of a split AC.", "medium"),
            ("How do you diagnose a refrigerant leak and seal it?", "hard"),
            ("Describe how you would safely top up R-32/R-410A gas.", "hard"),
            ("Why is it important to check the pressure before and after cleaning coils?", "medium"),
        ],
        "image": [
            ("This image shows a heavily iced indoor coil. What is the cause and remedy?", ["Airflow blockage / low gas; clean and check charge", "Coil is too new", "No issue", "Fan is fast"], 0),
            ("Look at this image of an AC drain pipe dripping. What maintenance is needed?", ["Flush the drain line and clean the tray", "Nothing", "Add gas", "Replace the filter only"], 0),
        ],
    },
    "cleaner": {
        "mcq": [
            ("Which cleaning solution is best for a greasy kitchen chimney?", ["Degreaser + warm water", "Plain cold water", "Floor cleaner", "Bleach on everything"], 0),
            ("What is the correct order for cleaning a room?", ["Top to bottom, dry to wet", "Bottom to top", "Wet to dry only", "Random"], 0),
            ("Which cloth should you use on a glass mirror?", ["Microfibre", "Sanding cloth", "Newspaper rough side is fine but microfibre is best", "Sponge"], 0),
            ("How do you sanitise high-touch surfaces?", ["Disinfectant with proper contact time", "Water only", "Dry cloth", "Perfume spray"], 0),
            ("What PPE should a cleaner wear when using strong chemicals?", ["Gloves + mask + goggles", "Nothing", "Only shoes", "Cap"], 0),
            ("Which method removes stains from a sofa fabric?", ["Test a small area then use upholstery cleaner", "Scrub with bleach", "Steam only at max heat", "Leave it"], 0),
            ("What should you do before polishing a wooden floor?", ["Vacuum/dust to remove grit", "Wet it fully", "Apply wax on dust", "Nothing"], 0),
            ("What is the best way to avoid streaks on windows?", ["Squeegee + microfibre, dry edge-to-edge", "More soap", "One cloth reuse", "Paper towels only"], 0),
        ],
        "scenario": [
            ("A customer wants the bathroom cleaned but there is black mould on the tiles. What products and steps do you use?", ["Mould remover/bleach-based, ventilate, scrub, rinse, prevent re-growth", "Just wipe with water", "Ignore it", "Paint over it"], 0),
            ("You are cleaning a home and the customer's pet is allergic to strong chemicals. What do you do?", ["Use pet-safe/eco products and confirm with the customer", "Use the strongest chemical", "Skip the room", "Charge double"], 0),
            ("After deep cleaning, the customer notices a water stain on the sofa that was already there. How do you respond?", ["Explain it was pre-existing, offer a spot treatment", "Argue", "Blame the family", "Ignore"], 0),
        ],
        "short": [
            ("Describe the professional steps for a full home deep clean.", "medium"),
            ("How do you clean and deodorise a washing-machine drum?", "hard"),
            ("What safety steps do you follow while working at height (fan/lamp cleaning)?", "hard"),
            ("Explain how you would sanitise a kitchen after a guest stays.", "medium"),
        ],
        "image": [
            ("This image shows grime inside a kitchen cabinet. What is the correct cleaning sequence?", ["Empty, vacuum, degrease, wipe, dry, replace", "Wipe once", "Paint over", "Skip"], 0),
            ("Look at this image of a stained toilet bowl. What product and technique removes the ring?", ["Acid-free toilet cleaner + pumice/scrub", "Just flush", "Bleach on the seat", "Nothing"], 0),
        ],
    },
    "painter": {
        "mcq": [
            ("What is the recommended number of coats for emulsion on a prepared wall?", ["2 coats", "10 coats", "1 thin coat", "None"], 0),
            ("What does a primer do before painting?", ["Improves adhesion and seals surface", "Adds colour", "Thins the paint", "Nothing"], 0),
            ("Which paint finish is most washable for kitchen walls?", ["Satin/eggshell washable emulsion", "Flat matte only", "Chalk paint", "Any"], 0),
            ("What causes paint to bubble on a wall?", ["Moisture or poor surface prep", "Too little paint", "Cold weather only", "The brand"], 0),
            ("Which tool is used for sharp wall edges?", ["Brush + masking tape", "Roller only", "Spray only", "Bare hands"], 0),
            ("What is the correct surface prep step before repainting?", ["Clean, patch, sand, prime", "Paint directly", "Wash with oil", "Nothing"], 0),
            ("What does 'weatherproof exterior paint' resist?", ["Rain, UV, and mild fungus", "Nothing", "Only heat", "Only noise"], 0),
            ("How long should you wait between emulsion coats?", ["As per manufacturer (usually 4-6 hours)", "10 seconds", "1 week", "Never"], 0),
        ],
        "scenario": [
            ("A customer has damp patches on the bedroom ceiling. What do you do before painting?", ["Identify the moisture source, treat damp, then prime with damp-proof primer", "Paint over directly", "Ignore it", "Only paint the patch"], 0),
            ("You notice the previous paint is peeling over a large area. What is your process?", ["Scrape, sand, prime the area, then repaint", "Paint over the peel", "Only dust it", "Tell them to repaint in a month"], 0),
            ("The customer wants a dark accent wall but the room gets no light. What do you advise?", ["Advise on finish/sheen and lighting, but follow their choice", "Refuse to paint", "Paint it white instead", "Charge extra without asking"], 0),
        ],
        "short": [
            ("Describe the step-by-step process of painting a room from prep to finish.", "medium"),
            ("How do you achieve a perfectly straight line between two paint colours?", "hard"),
            ("What factors determine how much paint is required for a room?", "medium"),
            ("Explain how to repair cracks in a wall before painting.", "hard"),
        ],
        "image": [
            ("This image shows paint peeling near a window sill. What is the cause?", ["Moisture condensation — treat and seal before repaint", "Too many coats", "Wrong roller", "Nothing"], 0),
            ("Look at this image of a textured wall finish. What technique was likely used?", ["Roller/brush stippling texture", "Spray flat", "Stencil only", "Airbrush"], 0),
        ],
    },
    "mason": {
        "mcq": [
            ("What is the standard mix ratio for general brick mortar (cement:sand)?", ["1:4 to 1:6", "1:20", "1:1", "2:10"], 0),
            ("What is the standard thickness of a single brick?", ["~100 mm", "~5 mm", "~300 mm", "~50 mm"], 0),
            ("Why are bricks soaked in water before laying?", ["For better bond (absorb moisture balance)", "To make them heavier", "To clean colour", "No reason"], 0),
            ("What is a 'plumb line' used for?", ["Checking vertical alignment", "Cutting bricks", "Mixing mortar", "Measuring angle only"], 0),
            ("Which tool levels a surface?", ["Spirit level", "Trowel", "Hammer", "Hose"], 0),
            ("What is the purpose of expansion joints in a wall?", ["Allow movement and prevent cracks", "Make it look nice", "Add strength only", "Drain water"], 0),
            ("What is the ideal curing period for fresh concrete?", ["7-14 days", "1 hour", "1 day", "1 month"], 0),
            ("What should you check before building a wall over a slab?", ["Load-bearing capacity / structural drawings", "The colour of bricks", "Nothing", "Only the weather"], 0),
        ],
        "scenario": [
            ("A customer's boundary wall has vertical cracks. What do you do?", ["Inspect foundation/soil, repair and add control joints", "Plaster over it", "Paint it", "Ignore it"], 0),
            ("While laying a wall, the bricks are not aligning with the string line. What do you do?", ["Stop, recheck the line and level, correct before mortar sets", "Keep going", "Blame the bricks", "Add more mortar"], 0),
            ("A bathroom floor needs waterproofing before tiling. What is your process?", ["Clean, apply waterproof membrane, test, then tile", "Tile directly", "Add more sand", "Skip it"], 0),
        ],
        "short": [
            ("Describe how you would build a brick wall from marking to finishing.", "medium"),
            ("How do you make a waterproof RCC terrace slab?", "hard"),
            ("Explain how to check the level of a floor with a water level.", "hard"),
            ("What causes plaster to crack and how do you prevent it?", "medium"),
        ],
        "image": [
            ("This image shows a cracked plaster wall. What repair process do you follow?", ["Chip out, clean, bond, patch with plaster, cure", "Paint over", "Just sand", "Nothing"], 0),
            ("Look at this image of a tiling job. What is wrong with the grout lines?", ["Uneven spacing — use spacers and realign", "Perfect job", "Too clean", "Nothing"], 0),
        ],
    },
    "general": {
        "mcq": [
            ("What should you do before starting any repair at a customer's home?", ["Confirm the problem, switch off power/water, and use proper tools", "Start immediately", "Ask for advance payment", "Nothing"], 0),
            ("Which is an essential safety habit for every technician?", ["Use the right PPE and isolate energy sources", "Work quickly without checking", "Avoid safety gear", "Rush the job"], 0),
            ("What should you do if a task is beyond your skill?", ["Honestly inform the customer and suggest an expert", "Try anyway", "Hide it", "Charge more"], 0),
            ("How should you leave the work area after a job?", ["Clean, and explain the work done", "As it was", "Messy", "Leave tools behind"], 0),
            ("What is the first thing to do when you arrive at a customer's home?", ["Introduce yourself and confirm the job scope", "Start working", "Ask for payment", "Call a friend"], 0),
            ("Which tool is essential for measuring before cutting?", ["Tape measure", "Hammer", "Screwdriver", "Paint brush"], 0),
            ("What is the correct way to carry a ladder?", ["Balanced, carrying the middle with proper posture", "Dragging it", "Overhead", "With one hand running"], 0),
            ("Why is it important to give an estimate before starting?", ["Customer clarity and trust", "It delays work", "Not needed", "Only for show"], 0),
        ],
        "scenario": [
            ("A customer asks you to do a job that is not in the agreed scope. What do you do?", ["Explain the extra cost and get approval first", "Just do it free", "Refuse rudely", "Start and decide later"], 0),
            ("You accidentally damage a customer's item during a repair. What do you do?", ["Inform immediately and offer a solution", "Hide it", "Blame someone else", "Leave"], 0),
            ("The customer is not satisfied with the finish. What is your response?", ["Ask what to improve and fix it professionally", "Argue", "Ignore", "Ask for payment anyway"], 0),
        ],
        "short": [
            ("Describe how you plan a day with multiple customer jobs.", "medium"),
            ("How do you handle a customer who wants a discount on every service?", "hard"),
            ("Explain how you would document your work for the customer.", "medium"),
            ("What steps do you take to ensure quality on every job?", "hard"),
        ],
        "image": [
            ("This image shows a technician working without safety gloves near sharp metal. What should change?", ["Use gloves and correct PPE", "Nothing", "Work faster", "Use more force"], 0),
            ("Look at this picture of a messy work area. What is the professional standard?", ["Clean as you go and leave it tidy", "It's fine", "Leave everything", "Only clean at the end if asked"], 0),
        ],
    },
}


def _sample_local_questions(profession: str, count: int = 10) -> list:
    """Build a unique 10-question set from the local bank.

    The set is returned already ORDERED by difficulty so the frontend can show
    questions 1-3 easy, 4-7 medium and 8-10 hard. Questions are never shuffled.
    """
    key = _profession_key(profession)
    bank = _LOCAL_BANKS.get(key, _LOCAL_BANKS["general"])

    def pick(items, n):
        return random.sample(items, min(len(items), n))

    mcqs = pick(bank["mcq"], 3)
    scenarios = pick(bank["scenario"], 3)
    shorts = pick(bank["short"], 3)
    images = pick(bank["image"], 1)

    questions = []

    # 1-3 easy
    for i in range(min(2, len(mcqs))):
        q, opts, ci = mcqs[i]
        questions.append(_mcq(q, opts, ci, "easy"))
    if scenarios:
        q, opts, ci = scenarios[0]
        questions.append(_scenario(q, opts, ci, "easy"))

    # 4-7 medium
    if len(mcqs) >= 3:
        q, opts, ci = mcqs[2]
        questions.append(_mcq(q, opts, ci, "medium"))
    if len(scenarios) >= 2:
        q, opts, ci = scenarios[1]
        questions.append(_scenario(q, opts, ci, "medium"))
    if images:
        q, opts, ci = images[0]
        questions.append(_image(q, opts, ci, "medium"))
    if shorts:
        questions.append(_short(shorts[0][0], "medium"))

    # 8-10 hard
    if len(scenarios) >= 3:
        q, opts, ci = scenarios[2]
        questions.append(_scenario(q, opts, ci, "hard"))
    if len(shorts) >= 2:
        questions.append(_short(shorts[1][0], "hard"))
    if len(shorts) >= 3:
        questions.append(_short(shorts[2][0], "hard"))

    # Top up to `count` if a bank ran short, borrowing remaining items.
    if len(questions) < count:
        used_ids = {q["id"] for q in questions}
        extras = []
        for q, opts, ci in mcqs:
            if len(extras) >= count - len(questions):
                break
            extra = _mcq(q, opts, ci, "medium")
            if extra["id"] not in used_ids:
                extras.append(extra)
                used_ids.add(extra["id"])
        for q, d in shorts:
            if len(extras) >= count - len(questions):
                break
            extra = _short(q, d)
            if extra["id"] not in used_ids:
                extras.append(extra)
                used_ids.add(extra["id"])
        random.shuffle(extras)
        questions.extend(extras)

    return questions[:count]


# ---------------------------------------------------------------------------
# Skill test generation (Gemini, with local fallback)
# ---------------------------------------------------------------------------

SKILL_TEST_PROMPT = """SELECTED PROFESSION: {profession}

You are a senior trade examiner for the OneDW worker platform. Create a technical assessment for a worker whose profession is "{profession}".

Relevant topics for {profession}: {topics}

STRICT RULES:
- Write the entire assessment in: {language_rule}
- EVERY question must be a hands-on technical question about {profession} work: a specific tool, material, component, fault, repair step, measurement or safety practice used in {profession} work.
- Each question MUST clearly reference something from the relevant topics above (e.g. for a Plumber: leaking pipes/taps, PVC/PPR pipes, valves, water pressure, drains, geysers, washer vs cartridge repair).
- NEVER generate generic customer-service, behavioural, sales or soft-skill questions (for example "how do you manage a customer asking for a discount", "how would you greet a customer", "time management") unless the question is directly about a {profession} technical task.
- If in doubt about whether a question is {profession}-specific, rewrite it so it clearly involves {profession} tools, materials, components or faults.

Generate EXACTLY 10 questions as a JSON array with this fixed slot structure (difficulty is set by slot position — 1-3 easy, 4-7 medium, 8-10 hard):
- Slots 1-3 (EASY): 3 multiple-choice questions (MCQ), each with 4 options.
- Slots 4-5 (MEDIUM): 2 MCQ, each with 4 options.
- Slot 6 (MEDIUM): 1 image-based question (describe a real {profession} fault, tool or work scene in the question text; set "image_url" to null — the image will be generated from the question separately).
- Slot 7 (MEDIUM): 1 scenario-based question with 3 options.
- Slot 8 (HARD): 1 scenario-based question with 3 options.
- Slots 9-10 (HARD): 2 short-answer questions (NO options, correct_index null).

Rules:
- MCQ and image questions need 4 options each and a correct option index.
- Scenario questions have 3 options each and a correct option index.
- Short answer questions have NO options (empty array) and correct_index null.
- Time limits by type: MCQ 20, image 40, scenario 45, short_answer 60.
- Question 1 must be the easiest and question 10 the hardest — every question must be progressively harder than the previous one.
- Never reuse common or generic questions.

Return ONLY a JSON array like:
[
  {{
    "id": "q1",
    "type": "mcq",
    "question": "...",
    "options": ["a", "b", "c", "d"],
    "correct_index": 0,
    "difficulty": "easy",
    "time_limit": 20,
    "image_url": null
  }}
]
No markdown, no extra text."""


def _reorder_progressive(questions: list, count: int = 10) -> list:
    """Return questions ordered easy (1-3), medium (4-7), hard (8-10).

    Uses the LLM difficulty tags when present; otherwise falls back to slot
    position. Existing order is preserved within each difficulty band so the
    strongest questions stay in front.
    """
    if not questions:
        return questions
    easy, medium, hard = [], [], []
    for q in questions:
        d = str(q.get("difficulty") or "").lower()
        if d in ("easy", "beginner"):
            easy.append(q)
        elif d in ("hard", "advanced", "expert"):
            hard.append(q)
        else:
            medium.append(q)

    def fill(bucket, n, fallback_d):
        out, rest = bucket[:n], bucket[n:]
        need = n - len(out)
        if need > 0 and rest:
            out.extend(rest[:need])
            rest = rest[need:]
        if len(out) < n and medium:
            take = min(len(medium), n - len(out))
            out.extend(medium[:take])
            medium[:] = medium[take:]
        if len(out) < n and easy and fallback_d != "easy":
            take = min(len(easy), n - len(out))
            out.extend(easy[:take])
            easy[:] = easy[take:]
        if len(out) < n and hard and fallback_d != "hard":
            take = min(len(hard), n - len(out))
            out.extend(hard[:take])
            hard[:] = hard[take:]
        for q in out:
            q["difficulty"] = fallback_d
        return out

    ordered = []
    ordered += fill(easy, 3, "easy")
    ordered += fill(medium, 4, "medium")
    ordered += fill(hard, 3, "hard")
    return ordered[:count]


def _local_question_pool(profession: str) -> list:
    """Flat, profession-specific pool of full question dicts for regeneration."""
    key = _profession_key(profession)
    bank = _LOCAL_BANKS.get(key, _LOCAL_BANKS["general"])
    pool = []
    for q, opts, ci in bank["mcq"]:
        pool.append(_mcq(q, opts, ci, "medium"))
    for q, opts, ci in bank["scenario"]:
        pool.append(_scenario(q, opts, ci, "medium"))
    for q, opts, ci in bank["image"]:
        pool.append(_image(q, opts, ci, "medium"))
    for q, d in bank["short"]:
        pool.append(_short(q, d))
    return pool


def _on_topic(text: str, profession: str) -> bool:
    """True when a question text clearly mentions the profession's key terms.

    "general" always passes — it has no trade vocabulary to enforce.
    """
    key = _profession_key(profession)
    if key == "general":
        return True
    keywords = _PROFESSION_KEYWORDS.get(key, _PROFESSION_KEYWORDS["general"])
    lowered = (text or "").lower()
    return any(kw in lowered for kw in keywords)


def _ensure_profession_questions(profession: str, questions: list, language: str = "en") -> list:
    """Validate every question against the selected profession and replace any
    off-topic one with an on-topic question from the deterministic local bank,
    preserving the original slot and difficulty. Guarantees the worker never sees
    a question from another trade or a generic soft-skill question.

    Non-English tests skip the keyword replacement: the keyword dictionary is
    English-only, and the local bank only contains English questions, so we trust
    the LLM's profession-specific output and only keep the structure stable.
    """
    profession = profession or "general technician"
    if language != "en":
        fixed = []
        for i, q in enumerate(questions):
            q = dict(q)
            q["id"] = f"q_{i + 1}"
            q["language"] = language
            fixed.append(q)
        return fixed
    pool = _local_question_pool(profession)
    random.shuffle(pool)
    replacements = iter(pool)
    fixed = []
    for i, q in enumerate(questions):
        q = dict(q)
        q["id"] = f"q_{i + 1}"
        q["language"] = language
        if _on_topic(q.get("question", ""), profession):
            fixed.append(q)
            continue
        logger.info(f"Off-topic {profession} question replaced at slot {i + 1}")
        fallback = None
        for candidate in replacements:
            if candidate["type"] == q.get("type"):
                fallback = dict(candidate)
                break
        if fallback is None:
            fallback = dict(next(replacements, _short(f"Describe the safe way to complete a {profession} job you do every day.", "hard")))
        fallback["id"] = f"q_{i + 1}"
        fallback["difficulty"] = q.get("difficulty") or "medium"
        fallback["language"] = language
        fixed.append(fallback)
    return fixed


# Per-profession question-set cache so regenerating a test is instant.
# Keyed by profession key; holds (generated_at_utc, questions). 6h TTL.
_QUESTION_CACHE_TTL = timedelta(hours=6)
_QUESTION_CACHE: dict = {}


def _cached_questions(profession: str, language: str = "en") -> Optional[list]:
    entry = _QUESTION_CACHE.get((_profession_key(profession or "general"), language))
    if not entry:
        return None
    generated_at, questions = entry
    if datetime.now(timezone.utc) - generated_at > _QUESTION_CACHE_TTL:
        return None
    return copy.deepcopy(questions)


def _cache_questions(profession: str, language: str, questions: list) -> None:
    _QUESTION_CACHE[(_profession_key(profession or "general"), language)] = (
        datetime.now(timezone.utc),
        copy.deepcopy(questions),
    )


def generate_skill_test_questions(profession: str, language: str = "en") -> list:
    """Generate a fresh question set. Uses Gemini; falls back to the local bank.

    The returned list is always validated to be on-topic for the profession and
    ordered easy -> medium -> hard (1-3 easy, 4-7 medium, 8-10 hard). When a
    non-English language is requested and Gemini is available, every question and
    option is written in that language.

    Generated sets are cached per profession + language so repeat attempts (e.g. after a
    client-side timeout or on retry) return instantly instead of hitting the
    AI/rate-limited pipeline again.
    """
    language = language if language in SUPPORTED_TEST_LANGUAGES else "en"
    cached = _cached_questions(profession, language)
    if cached is not None:
        logger.info(f"Using cached skill-test question set for '{profession}' ({language})")
        return cached

    questions = None
    if gemini_available():
        try:
            prompt = SKILL_TEST_PROMPT.format(
                profession=profession or "general technician",
                topics=_profession_guide(profession or "general technician"),
                language_rule=_LANGUAGE_RULES.get(language, _LANGUAGE_RULES["en"]),
            )
            result = _generate_json(prompt, temperature=1.0)
            questions = result if isinstance(result, list) else result.get("questions", [])
            if isinstance(questions, list) and questions:
                normalized = []
                for i, q in enumerate(questions[:10]):
                    qtype = str(q.get("type", "mcq")).lower()
                    if qtype not in QUESTION_TIME_LIMITS:
                        qtype = "mcq"
                    options = q.get("options") or []
                    if not isinstance(options, list):
                        options = []
                    image_url = q.get("image_url")
                    if qtype == "image" and (not image_url or not str(image_url).startswith("http")):
                        image_url = None
                    normalized.append({
                        "id": str(q.get("id") or f"q_{i + 1}"),
                        "type": qtype,
                        "question": str(q.get("question") or ""),
                        "options": options,
                        "correct_index": q.get("correct_index") if qtype in ("mcq", "image", "scenario") else None,
                        "difficulty": str(q.get("difficulty") or "medium"),
                        "time_limit": int(q.get("time_limit") or QUESTION_TIME_LIMITS[qtype]),
                        "image_url": image_url if qtype == "image" else None,
                        "language": language,
                    })
                if len(normalized) >= 8:
                    questions = normalized
                else:
                    questions = None
        except Exception as e:
            logger.warning(f"Gemini question generation failed, using local bank: {e}")
            questions = None
    if questions is None:
        questions = _sample_local_questions(profession)
        for q in questions:
            q["language"] = "en"
    questions = _ensure_profession_questions(profession or "general technician", questions, language)
    questions = _reorder_progressive(questions)
    _attach_question_images(questions, profession or "general technician")
    _cache_questions(profession, language, questions)
    return questions


def public_questions(questions: list) -> list:
    """Strip correct_index before sending questions to the worker frontend."""
    return [
        {k: v for k, v in q.items() if k != "correct_index"}
        for q in questions
    ]


# ---------------------------------------------------------------------------
# Skill-test image generation (must match the finalized question)
# ---------------------------------------------------------------------------

# Curated, profession-relevant images (Unsplash photos already used across the
# OneDW marketplace seed for these exact trades). Used when an image cannot be
# AI-generated or its relevance cannot be verified — NEVER random stock.
_CURATED_PROFESSION_IMAGES = {
    "electrician": [
        "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1558449028-b53a39d100fc?w=640&h=480&fit=crop&q=80",
    ],
    "plumber": [
        "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=640&h=480&fit=crop&q=80",
    ],
    "carpenter": [
        "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1416339442236-8ceb164046f8?w=640&h=480&fit=crop&q=80",
    ],
    "ac technician": [
        "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1504215680853-026ed2a45def?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1562281302-809108fd533c?w=640&h=480&fit=crop&q=80",
    ],
    "cleaner": [
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1558317374-067fb5f30001?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=640&h=480&fit=crop&q=80",
    ],
    "painter": [
        "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1517816428104-797678c7cf0c?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1501426026826-31c667bdf23d?w=640&h=480&fit=crop&q=80",
    ],
    "mason": [
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1503596476-1c12a0109428?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1545552987-720aa18145ca?w=640&h=480&fit=crop&q=80",
    ],
    "general": [
        "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=640&h=480&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=640&h=480&fit=crop&q=80",
    ],
}


def _profession_image_pool(profession: str) -> list:
    key = _profession_key(profession)
    return _CURATED_PROFESSION_IMAGES.get(key, _CURATED_PROFESSION_IMAGES["general"])


def _image_prompt_for_question(question: dict, profession: str) -> str:
    qtext = question.get("question") or ""
    return (
        f"Photorealistic image for a professional {profession or 'technician'} trade exam on the OneDW platform. "
        f"PROFESSION: {profession or 'technician'}. "
        f"QUESTION: {qtext} "
        f"The image MUST depict the exact {profession or 'technician'} situation, tool, material, component or fault "
        f"described in the question. It must match the profession (for a plumber show plumbing pipes/taps/fittings, "
        f"for an electrician show wiring/MCBs/switchboards, for a carpenter show wood/tools/furniture, etc.). "
        "Realistic scene, natural lighting, no text, no watermarks, no diagrams, no close-up faces."
    )


def _image_gen_available() -> bool:
    return bool(settings.GEMINI_API_KEY) and bool(settings.GEMINI_IMAGE_MODEL)


# Models confirmed unavailable for this API key (e.g. 404 model-not-found / 403).
# Cached so we don't waste a request on every skill-test generation.
_UNUSABLE_IMAGE_MODELS: set = set()

# When the vision API rate-limits us (429 RESOURCE_EXHAUSTED) we stop running
# per-image relevance validations for a while and fall straight back to the
# curated profession pool (which is on-topic by construction). This keeps the
# skill-test generation fast on free-tier keys.
_VISION_THROTTLED_UNTIL: Optional[datetime] = None
_VISION_THROTTLE_SECONDS = 300


def _set_vision_throttled() -> None:
    """Record that the vision/relevance API is rate-limiting us for a while."""
    global _VISION_THROTTLED_UNTIL
    _VISION_THROTTLED_UNTIL = datetime.now(timezone.utc) + timedelta(seconds=_VISION_THROTTLE_SECONDS)


def _vision_is_throttled() -> bool:
    global _VISION_THROTTLED_UNTIL
    if _VISION_THROTTLED_UNTIL is None:
        return False
    if datetime.now(timezone.utc) > _VISION_THROTTLED_UNTIL:
        _VISION_THROTTLED_UNTIL = None
        return False
    return True


def _generate_question_image(question: dict, profession: str) -> Optional[str]:
    """Generate an image for the finalized question and store it locally. Returns a /uploads URL or None."""
    if not _image_gen_available():
        return None
    model = settings.GEMINI_IMAGE_MODEL
    if model in _UNUSABLE_IMAGE_MODELS:
        logger.info(f"Image model {model} already known unavailable; skipping generation for question {question.get('id')}")
        return None
    client = _get_gemini_client()
    if not client:
        return None
    prompt = _image_prompt_for_question(question, profession)
    try:
        resp = client.models.generate_images(
            model=model,
            prompt=prompt,
            config=types.GenerateImagesConfig(number_of_images=1, aspect_ratio="4:3"),
        )
        img = resp.generated_images[0].image
        data = img.image_bytes
        if not data:
            logger.warning(f"Image generation returned no bytes for question {question.get('id')}")
            return None
        folder = Path(settings.UPLOAD_DIR) / "assessment"
        folder.mkdir(parents=True, exist_ok=True)
        filename = f"skillimg_{uuid.uuid4().hex[:12]}.png"
        (folder / filename).write_bytes(data)
        logger.info(
            f"Generated skill-test image {filename} ({len(data)} bytes) "
            f"for question {question.get('id')} (model={model})"
        )
        return f"/uploads/assessment/{filename}"
    except Exception as e:
        err_text = str(e)
        if "NOT_FOUND" in err_text or "PERMISSION_DENIED" in err_text or "403" in err_text:
            _UNUSABLE_IMAGE_MODELS.add(model)
            logger.warning(f"Image model {model} is not usable on this API key; disabling future attempts: {e}")
        else:
            logger.warning(f"Image generation failed for question {question.get('id')}: {e}")
        return None


def _validate_image_relevance(image_ref: str, question: dict, profession: str) -> bool:
    """Ask the vision model whether the image matches the question.

    Deliberately tolerant: if the vision model is unavailable, the image is
    ACCEPTED so the flow never blocks — the curated pool is on-topic by
    construction and generated images are on-topic by prompt.
    """
    if _vision_is_throttled():
        return True
    client = _get_gemini_client()
    if not client:
        return True
    prompt = (
        "You are validating whether a photo shown to a trade candidate matches an exam question. "
        f"PROFESSION: {profession or 'general technician'}\n"
        f"QUESTION: {question.get('question') or ''}\n"
        "Reply with EXACTLY one lowercase word: 'true' if the image clearly relates to the question and the "
        "profession (shows the trade, its tools, materials, or the specific fault described), otherwise 'false' "
        "if it is unrelated, a random landscape, a decorative stock graphic, a portrait, or generic."
    )
    try:
        if str(image_ref).startswith("http"):
            part = types.Part.from_uri(file_uri=image_ref, mime_type="image/jpeg")
        else:
            path = Path(image_ref)
            if not path.exists():
                logger.warning(f"Relevance check skipped, local image missing: {image_ref}")
                return False
            part = types.Part.from_bytes(data=path.read_bytes(), mime_type="image/jpeg")
        resp = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[prompt, part],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=64),
        )
        verdict = (resp.text or "").strip().lower()
        ok = verdict.startswith("true")
        logger.info(f"Image relevance validation for question {question.get('id')}: '{verdict}' relevant={ok}")
        return ok
    except Exception as e:
        err_text = str(e)
        if any(tok in err_text for tok in ("429", "RESOURCE_EXHAUSTED", "quota")):
            _set_vision_throttled()
            logger.warning(
                f"Image relevance validation throttled for question {question.get('id')}: {e}; "
                f"falling back to curated images for {_VISION_THROTTLE_SECONDS}s"
            )
        else:
            logger.warning(f"Image relevance validation skipped for question {question.get('id')}: {e}")
        return True


def _resolve_question_image(question: dict, profession: str, index: int = 0) -> str:
    """Generate a relevant image for the finalized question; validate and regenerate if needed.

    Priority: (1) AI-generated image validated relevant, (2) curated profession
    image validated relevant, (3) a curated profession image cycled by slot index
    as a last resort. Random or unrelated images are never returned.
    """
    qid = question.get("id")
    pool = _profession_image_pool(profession)
    max_attempts = max(1, int(getattr(settings, "GEMINI_IMAGE_MAX_ATTEMPTS", 2) or 2))
    for attempt in range(1, max_attempts + 1):
        url = _generate_question_image(question, profession)
        if url:
            if _validate_image_relevance(url, question, profession):
                logger.info(f"Question {qid}: AI image accepted on attempt {attempt}: {url}")
                return url
            logger.warning(f"Question {qid}: AI image rejected as irrelevant on attempt {attempt}; regenerating")
    for idx, url in enumerate(pool):
        if _validate_image_relevance(url, question, profession):
            logger.info(f"Question {qid}: using curated relevant image #{idx}: {url}")
            return url
    chosen = pool[index % len(pool)] if pool else None
    logger.warning(f"Question {qid}: relevance validation unavailable; using curated profession image: {chosen}")
    return chosen


def _attach_question_images(questions: list, profession: str) -> None:
    """Resolve a relevant image_url for every image-type question (after the question is finalized).

    Curated images are cycled by the question's slot index so the same image is
    never reused for two different questions.
    """
    for i, q in enumerate(questions):
        if q.get("type") != "image":
            q["image_url"] = None
            continue
        q["image_url"] = _resolve_question_image(q, profession, index=i)


# ---------------------------------------------------------------------------
# Skill test evaluation
# ---------------------------------------------------------------------------

def _grade_short_answers_gemini(profession: str, questions: list, answers: list) -> dict:
    """Ask Gemini to grade short-answer/scenario text responses."""
    if not gemini_available():
        return {}
    items = []
    for q, a in zip(questions, answers):
        if q.get("type") == "short_answer" and a.get("answer"):
            items.append({"id": q["id"], "question": q["question"], "answer": a["answer"]})
    if not items:
        return {}
    prompt = (
        "You are a trade examiner for OneDW. Grade each short answer from 0 to 100. "
        "Be strict: a generic or very short answer scores low. Return a JSON object mapping question id to a score, e.g. "
        '{"q1": 80, "q2": 45}. Only short answers are included. No markdown, only JSON.\n'
        "Profession: " + (profession or "general") + "\n" + json.dumps(items, ensure_ascii=False)
    )
    try:
        result = _generate_json(prompt, temperature=0.2)
        scores = {}
        for k, v in result.items():
            try:
                scores[str(k)] = max(0.0, min(100.0, float(v)))
            except (TypeError, ValueError):
                continue
        return scores
    except Exception as e:
        logger.warning(f"Short-answer grading failed: {e}")
        return {}


def _heuristic_answer_score(q: dict, a: dict) -> float:
    """Deterministic score for text answers when Gemini is unavailable."""
    text = (a.get("answer") or "").strip()
    if not text:
        return 0.0
    words = len(text.split())
    if words >= 40:
        return 85.0
    if words >= 20:
        return 70.0
    if words >= 8:
        return 55.0
    return 35.0


def evaluate_skill_test(session: SkillTestSession, answers: list, anti_cheat: dict) -> dict:
    """Score a submitted skill test and record anti-cheating analytics."""
    questions = session.questions or []
    answer_map = {}
    for a in answers:
        if a.get("question_id"):
            answer_map[str(a["question_id"])] = a

    per_question = []
    correct_count = 0
    total_weight = 0.0

    time_per_q = anti_cheat.get("time_per_question") or []
    time_map = {}
    for t in time_per_q:
        if t.get("question_id"):
            time_map[str(t["question_id"])] = t.get("time_taken")

    short_scores = _grade_short_answers_gemini(session.profession, questions, answers)

    for q in questions:
        qid = q["id"]
        a = answer_map.get(qid, {})
        qtype = q.get("type", "mcq")
        limit = int(q.get("time_limit") or QUESTION_TIME_LIMITS.get(qtype, 30))
        taken = time_map.get(qid)
        weight = 1.0
        base = 0.0

        if qtype in ("mcq", "image", "scenario"):
            if a.get("skipped"):
                base = 0.0
            elif a.get("selected_option") is not None:
                correct_index = q.get("correct_index")
                if correct_index is not None and int(a["selected_option"]) == int(correct_index):
                    base = 100.0
                    correct_count += 1
                else:
                    base = 0.0
            # overtime penalty
            if taken is not None and isinstance(taken, (int, float)) and taken > limit + 5:
                base = max(0.0, base - 20)
        else:
            if a.get("skipped") or not a.get("answer"):
                base = 0.0
            else:
                base = short_scores.get(qid, _heuristic_answer_score(q, a))
                weight = 1.2

        total_weight += weight
        per_question.append({
            "question_id": qid,
            "type": qtype,
            "difficulty": q.get("difficulty"),
            "time_taken": taken,
            "time_limit": limit,
            "selected_option": a.get("selected_option"),
            "answer": a.get("answer"),
            "skipped": bool(a.get("skipped")),
            "score": round(base * weight, 2),
        })

    score = round((sum(p["score"] for p in per_question) / (total_weight * 100.0)) * 100.0, 2) if total_weight else 0.0
    score = max(0.0, min(100.0, score))

    tab_switch = int(anti_cheat.get("tab_switch_count") or 0)
    warnings = int(anti_cheat.get("warnings_issued") or 0)
    skipped = int(anti_cheat.get("skipped_count") or 0)
    suspicious = anti_cheat.get("suspicious_fast_answers") or []

    # Anti-cheat penalties
    if tab_switch >= 3:
        session.failed = True
        score = 0.0
    elif tab_switch >= 2:
        score = max(0.0, score - 15)
    elif tab_switch >= 1:
        score = max(0.0, score - 5)
    score -= skipped * 2
    score = max(0.0, min(100.0, score))

    session.answers = answers
    session.score = score
    session.tab_switch_count = tab_switch
    session.warnings_issued = warnings
    session.time_per_question = time_per_q
    session.skipped_count = skipped
    session.suspicious_fast_answers = suspicious
    session.status = "failed" if session.failed else "submitted"
    session.submitted_at = _utcnow()

    analytics = {
        "tab_switch_count": tab_switch,
        "warnings_issued": warnings,
        "skipped_count": skipped,
        "time_per_question": time_per_q,
        "suspicious_fast_answers": suspicious,
        "correct_count": correct_count,
        "total_questions": len(questions),
        "failed": session.failed,
    }
    return {"score": score, "correct_count": correct_count, "total": len(questions), "analytics": analytics}


# ---------------------------------------------------------------------------
# Practical assessment (Gemini Vision)
# ---------------------------------------------------------------------------

PRACTICAL_PROMPT = """You are a senior trade supervisor evaluating a {profession}'s submitted work for the OneDW platform. Below are the uploaded work media (images and/or videos).

Judge the work strictly against these {profession} criteria: {criteria}

Evaluate the worker's practical skill. Return a JSON object with EXACTLY these fields (no markdown, no extra text):
{{
  "work_quality": 0-100,
  "tool_usage": 0-100,
  "safety_equipment": 0-100,
  "professional_finish": 0-100,
  "fake_image_detection": "A description of whether any image appears AI-generated, stock, irrelevant or manipulated",
  "fake_video_detection": "A description of whether any video appears fake, repurposed or unrelated",
  "fraud_risk": "low" | "medium" | "high",
  "notes": "Overall assessment and specific observations",
  "overall_score": 0-100
}}

If no media is provided, set overall_score to 0 and note it. Be strict and realistic for {profession} work in India. Return ONLY the JSON."""


def _local_media_path(url: str) -> Optional[Path]:
    """Map a /uploads/... URL to a local file path."""
    if not url:
        return None
    path_part = url.split("/uploads/", 1)[-1]
    candidate = Path(settings.UPLOAD_DIR) / path_part
    return candidate if candidate.exists() else None


def _evaluate_media_parts(client: genai.Client, media_urls: list, profession: str) -> Optional[dict]:
    """Send images/videos to Gemini for evaluation."""
    contents = [PRACTICAL_PROMPT.format(
        profession=profession or "general technician",
        criteria=_practical_criteria(profession or "general technician"),
    )]
    parts: list = []
    for item in media_urls:
        url = item.get("url") or item.get("path") or ""
        mtype = (item.get("type") or "").lower()
        local = _local_media_path(url)
        if not local:
            continue
        try:
            if mtype == "video":
                uploaded = client.files.upload(path=str(local))
                parts.append(types.Part.from_uri(file_uri=uploaded.uri, mime_type=uploaded.mime_type))
            else:
                ext = local.suffix.lower().lstrip(".")
                mime_map = {"png": "image/png", "webp": "image/webp", "gif": "image/gif", "jpg": "image/jpeg", "jpeg": "image/jpeg"}
                mime = mime_map.get(ext, "image/jpeg")
                parts.append(types.Part.from_bytes(data=local.read_bytes(), mime_type=mime))
        except Exception as e:
            logger.warning(f"Skipping media {url}: {e}")
    if not parts:
        return None
    response = client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[contents[0], *parts],
        config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=4096),
    )
    return _parse_ai_json(response.text or "")


def _heuristic_practical_score(media_urls: list) -> float:
    images = [m for m in media_urls if (m.get("type") or "image").lower() != "video"]
    videos = [m for m in media_urls if (m.get("type") or "").lower() == "video"]
    if not images and not videos:
        return 0.0
    score = 45.0
    score += min(25.0, len(images) * 8.0)
    score += min(20.0, len(videos) * 10.0)
    return round(min(90.0, score), 2)


async def evaluate_practical(verification: WorkerVerification, media_urls: list) -> dict:
    """Evaluate a worker's practical media submission and store the result."""
    if not media_urls:
        raise BadRequestException(message="Please upload at least one work photo or video")

    client = _get_gemini_client()
    evaluation = None
    score = None
    if client:
        try:
            evaluation = _evaluate_media_parts(client, media_urls, verification.profession)
            if evaluation:
                try:
                    score = float(evaluation.get("overall_score") or 0.0)
                except (TypeError, ValueError):
                    score = None
                evaluation.setdefault("overall_score", score if score is not None else 0.0)
        except Exception as e:
            logger.warning(f"Practical evaluation failed: {e}")

    if score is None:
        score = _heuristic_practical_score(media_urls)
        if evaluation is None:
            evaluation = {
                "work_quality": 0, "tool_usage": 0, "safety_equipment": 0,
                "professional_finish": 0,
                "fake_image_detection": "Not evaluated (AI unavailable)",
                "fake_video_detection": "Not evaluated (AI unavailable)",
                "fraud_risk": "unknown",
                "notes": "Heuristic scoring used because AI evaluation was unavailable.",
                "overall_score": score,
            }

    assessment = await PracticalAssessment.find_one(PracticalAssessment.verification_id == verification.id)
    if assessment is None:
        assessment = PracticalAssessment(
            verification_id=verification.id,
            worker_id=verification.worker_id,
        )
    assessment.media_urls = media_urls
    assessment.evaluation = evaluation
    assessment.score = score
    assessment.status = "submitted"
    assessment.submitted_at = _utcnow()
    await assessment.save()

    verification.practical_score = score
    verification.step = "interview"
    await verification.save()

    return {
        "score": score,
        "evaluation": evaluation,
        "media_urls": media_urls,
    }


# ---------------------------------------------------------------------------
# Voice interview
# ---------------------------------------------------------------------------

INTERVIEW_OPENING_PROMPT = """SELECTED PROFESSION: {profession}

You are a professional technical interviewer for the OneDW worker platform, hiring a {profession}.

Relevant topics for {profession}: {topics}

Ask ONE single opening interview question that tests real, hands-on {profession} technical knowledge — for example how they would diagnose or repair a specific {profession} fault. The question must be a {profession}-specific technical question (tools, materials, faults, repair steps, safety). Do NOT ask generic customer-service or behavioural questions.

Keep it under 30 words and conversational. Return a JSON object: {{"question": "..."}}"""

INTERVIEW_FOLLOWUP_PROMPT = """SELECTED PROFESSION: {profession}

You are a professional technical interviewer for the OneDW worker platform, hiring a {profession}.

Relevant topics for {profession}: {topics}

Here is the conversation so far:

{history}

The worker's LAST answer is the most important. Ask ONE intelligent follow-up question that digs deeper into that exact answer. Probe their technical reasoning: how they would verify their diagnosis, which specific {profession} tool or part they would use, what would confirm their solution, or what could go wrong. The follow-up MUST:
- Be a {profession}-specific technical question.
- Reference the specific thing the worker just said (never repeat the opening question and never drift to generic topics).
- Challenge the answer where appropriate (for example, if the worker says they will replace a washer, ask how they know the fault is the washer and not the cartridge valve).

Keep it under 30 words and conversational. Return a JSON object: {{"question": "..."}}"""

INTERVIEW_EVAL_PROMPT = """You are a senior interviewer evaluating a {profession} on the OneDW platform. Relevant topics for {profession}: {topics}. Here is the full interview exchange:

{history}

Evaluate the worker on these five dimensions from 0 to 100:
- communication
- confidence
- technical_knowledge
- logical_thinking
- problem_solving

Return a JSON object with EXACTLY these fields (no markdown, no extra text):
{{
  "communication": 0-100,
  "confidence": 0-100,
  "technical_knowledge": 0-100,
  "logical_thinking": 0-100,
  "problem_solving": 0-100,
  "overall_score": 0-100,
  "summary": "2-3 sentence feedback",
  "recommendation": "hire" | "consider" | "reject"
}}"""


def _fallback_interview_questions(profession: str) -> list:
    """Profession-aware fallback questions used when Gemini is unavailable.

    Concrete and hands-on: the fault questions are drawn from the real faults a
    candidate is likely to meet in that trade (never generic soft-skill prompts).
    """
    profession = profession or "general technician"
    faults = _PROFESSION_FAULTS.get(_profession_key(profession), _PROFESSION_FAULTS["general"])
    return [
        f"Tell me about your experience working as a {profession}.",
        f"What safety precautions do you take on every {profession} job?",
        f"Imagine a customer reports {faults[0]}. Walk me through exactly how you would diagnose and fix it.",
        f"If a previous repair you did got reported as a recurring problem, how would you inspect it, fix it properly and win back the customer's trust?",
    ]


MAX_INTERVIEW_EXCHANGES = 4

AUDIO_TRANSCRIBE_PROMPT = (
    "Transcribe the following speech verbatim. Return ONLY the plain text transcription "
    "of what the speaker said, no commentary, no punctuation embellishment."
)


def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/webm") -> Optional[str]:
    """Speech-to-text for the MediaRecorder voice fallback. Returns None on failure.

    Prefers Groq Whisper (generous free tier, no shared quota) when configured,
    otherwise falls back to Gemini.
    """
    if settings.GROQ_API_KEY:
        text = _transcribe_audio_groq(audio_bytes, mime_type)
        if text:
            return text
        logger.warning("Groq transcription failed, falling back to Gemini")

    return _transcribe_audio_gemini(audio_bytes, mime_type)


def _transcribe_audio_groq(audio_bytes: bytes, mime_type: str = "audio/webm") -> Optional[str]:
    try:
        import httpx

        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        ext = (mime_type or "audio/webm").split("/")[-1] or "webm"
        files = {
            "file": (f"voice.{ext}", audio_bytes, mime_type or "audio/webm"),
            "model": (None, settings.GROQ_WHISPER_MODEL),
            "response_format": (None, "json"),
            "language": (None, "en"),
        }
        resp = httpx.post(
            url,
            headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
            files=files,
            timeout=60.0,
        )
        if resp.status_code != 200:
            logger.warning(
                f"Groq transcription failed ({resp.status_code}): {resp.text[:300]}"
            )
            return None
        data = resp.json()
        text = (data.get("text") or "").strip()
        logger.info(
            f"Groq transcription completed ({len(audio_bytes)} bytes, {mime_type}) -> {len(text)} chars"
        )
        return text or None
    except Exception as e:
        logger.warning(f"Groq transcription error ({len(audio_bytes)} bytes): {e}")
        return None


def _transcribe_audio_gemini(audio_bytes: bytes, mime_type: str = "audio/webm") -> Optional[str]:
    client = _get_gemini_client()
    if not client:
        logger.warning("Audio transcription unavailable: Gemini not configured")
        return None
    try:
        part = types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
        resp = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=[AUDIO_TRANSCRIBE_PROMPT, part],
            config=types.GenerateContentConfig(temperature=0.0, max_output_tokens=2048),
        )
        text = (resp.text or "").strip()
        logger.info(f"Audio transcription completed ({len(audio_bytes)} bytes, {mime_type}) -> {len(text)} chars")
        return text or None
    except Exception as e:
        logger.warning(f"Audio transcription failed ({len(audio_bytes)} bytes, {mime_type}): {e}")
        return None


def _interview_history(interview: VoiceInterview) -> str:
    lines = []
    for ex in interview.exchanges or []:
        lines.append(f"Interviewer: {ex.get('ai_question', '')}")
        if ex.get("worker_answer"):
            lines.append(f"Worker: {ex.get('worker_answer', '')}")
    return "\n".join(lines)


def _gemini_interview_json(prompt: str, temperature: float = 0.6) -> Optional[dict]:
    if not gemini_available():
        return None
    try:
        return _generate_json(prompt, temperature=temperature)
    except Exception as e:
        logger.warning(f"Interview Gemini call failed: {e}")
        return None


async def start_interview(verification: WorkerVerification) -> dict:
    interview = await VoiceInterview.find_one(VoiceInterview.verification_id == verification.id)
    if interview is None:
        interview = VoiceInterview(
            verification_id=verification.id,
            worker_id=verification.worker_id,
            profession=verification.profession,
            exchanges=[],
            status="in_progress",
            started_at=_utcnow(),
        )
        await interview.insert()

    if not interview.exchanges:
        question = None
        res = _gemini_interview_json(
            INTERVIEW_OPENING_PROMPT.format(
                profession=verification.profession,
                topics=_profession_guide(verification.profession),
            )
        )
        if res and res.get("question"):
            question = res["question"]
        else:
            question = _fallback_interview_questions(verification.profession)[0]
        interview.exchanges = [{"ai_question": question, "worker_answer": None, "mode": None}]
        await interview.save()

    return {
        "interview_id": interview.id,
        "exchanges": interview.exchanges,
        "done": len(interview.exchanges) >= MAX_INTERVIEW_EXCHANGES,
        "current_question": interview.exchanges[-1]["ai_question"],
    }


async def respond_interview(verification: WorkerVerification, answer: str, mode: str) -> dict:
    interview = await VoiceInterview.find_one(VoiceInterview.verification_id == verification.id)
    if interview is None:
        await start_interview(verification)
        interview = await VoiceInterview.find_one(VoiceInterview.verification_id == verification.id)

    if not answer or not answer.strip():
        raise BadRequestException(message="Please provide an answer")

    exchanges = list(interview.exchanges or [])
    last = exchanges[-1]
    last["worker_answer"] = answer.strip()
    last["mode"] = mode or "text"

    done = len(exchanges) >= MAX_INTERVIEW_EXCHANGES
    question = None
    if not done:
        history = "\n".join(
            f"Interviewer: {ex['ai_question']}\nWorker: {ex.get('worker_answer') or ''}"
            for ex in exchanges
        )
        res = _gemini_interview_json(
            INTERVIEW_FOLLOWUP_PROMPT.format(
                profession=verification.profession,
                topics=_profession_guide(verification.profession),
                history=history,
            )
        )
        if res and res.get("question"):
            question = res["question"]
        else:
            idx = min(len(exchanges), len(_fallback_interview_questions(verification.profession)) - 1)
            question = _fallback_interview_questions(verification.profession)[idx]
        exchanges.append({"ai_question": question, "worker_answer": None, "mode": None})

    interview.exchanges = exchanges
    if done:
        interview.status = "completed"
        interview.submitted_at = _utcnow()
    await interview.save()

    if done:
        evaluation = await _evaluate_interview(verification, interview)
        return {
            "done": True,
            "interview_score": evaluation.get("overall_score"),
            "evaluation": evaluation,
            "exchanges": interview.exchanges,
        }

    return {
        "done": False,
        "current_question": question,
        "exchanges": interview.exchanges,
    }


async def _evaluate_interview(verification: WorkerVerification, interview: VoiceInterview) -> dict:
    history = _interview_history(interview)
    evaluation = None
    res = _gemini_interview_json(
        INTERVIEW_EVAL_PROMPT.format(
            profession=verification.profession,
            topics=_profession_guide(verification.profession),
            history=history,
        ),
        temperature=0.3,
    )
    if res:
        evaluation = res
    else:
        # Heuristic: base score on answer length + consistency
        answers = [ex.get("worker_answer") or "" for ex in interview.exchanges or []]
        lengths = [len(a.split()) for a in answers if a.strip()]
        avg_words = sum(lengths) / len(lengths) if lengths else 0
        base = min(85.0, 30.0 + avg_words * 3.0)
        evaluation = {
            "communication": base,
            "confidence": base,
            "technical_knowledge": base,
            "logical_thinking": base,
            "problem_solving": base,
            "overall_score": round(base, 2),
            "summary": "Interview evaluated using heuristic scoring (AI unavailable).",
            "recommendation": "hire" if base >= 60 else "consider",
        }

    dims = ["communication", "confidence", "technical_knowledge", "logical_thinking", "problem_solving"]
    score = evaluation.get("overall_score")
    if score is None:
        try:
            vals = [float(evaluation.get(d, 0) or 0) for d in dims]
            score = sum(vals) / len(vals)
        except (TypeError, ValueError):
            score = 0.0
    score = max(0.0, min(100.0, float(score)))

    interview.evaluation = evaluation
    interview.score = score
    interview.status = "completed"
    interview.submitted_at = _utcnow()
    await interview.save()

    verification.interview_score = score
    verification.step = "completed"
    await verification.save()
    return evaluation


# ---------------------------------------------------------------------------
# Trust score / badge / training recommendations
# ---------------------------------------------------------------------------


async def compute_documents_score(worker: Worker) -> float:
    """Documents = 10% of trust. Aadhaar verified is the main signal."""
    score = 0.0
    if worker.aadhaar_verified:
        score += 60.0
    else:
        score += 20.0
    cert_count = await Certificate.find(Certificate.worker_id == worker.id).count()
    score += min(25.0, cert_count * 8.0)
    if worker.aadhaar_number_hash:
        score += 15.0
    return round(min(100.0, score), 2)


async def compute_experience_score(worker: Worker) -> float:
    """Experience & certificates = 5% of trust."""
    score = min(60.0, (worker.experience_years or 0) * 10.0)
    cert_count = await Certificate.find(Certificate.worker_id == worker.id).count()
    score += min(40.0, cert_count * 10.0)
    return round(min(100.0, score), 2)


def assign_badge(score: float) -> str:
    if score >= 90:
        return BADGE_GOLD
    if score >= 75:
        return BADGE_PRO
    if score >= 60:
        return BADGE_BEGINNER
    return BADGE_REJECTED


async def compute_trust_score(verification: WorkerVerification, worker: Worker) -> float:
    docs = await compute_documents_score(worker)
    exp = await compute_experience_score(worker)
    technical = verification.technical_score or 0.0
    practical = verification.practical_score or 0.0
    interview = verification.interview_score or 0.0
    trust = (
        technical * 0.35
        + practical * 0.30
        + interview * 0.20
        + docs * 0.10
        + exp * 0.05
    )
    return round(max(0.0, min(100.0, trust)), 2)


TRAINING_PROMPT = """Based on a {profession}'s verification results, recommend focused training. Scores: Technical {technical}/100, Practical {practical}/100, Interview {interview}/100, Documents {documents}/100. Return a JSON array of 2-3 specific, actionable training recommendations in India, each with a title and description. Format: [{{"title": "...", "description": "..."}}]. No markdown, only JSON."""


def generate_training_recommendations(verification: WorkerVerification) -> list:
    if gemini_available():
        try:
            res = _generate_json(
                TRAINING_PROMPT.format(
                    profession=verification.profession,
                    technical=round(verification.technical_score or 0),
                    practical=round(verification.practical_score or 0),
                    interview=round(verification.interview_score or 0),
                    documents=round(verification.documents_score or 0),
                ),
                temperature=0.4,
            )
            items = res if isinstance(res, list) else res.get("recommendations", [])
            if isinstance(items, list) and items:
                return [
                    {
                        "title": str(it.get("title") or "Training"),
                        "description": str(it.get("description") or ""),
                    }
                    for it in items[:3]
                    if isinstance(it, dict)
                ]
        except Exception as e:
            logger.warning(f"Training recommendation generation failed: {e}")
    weak = []
    if (verification.technical_score or 0) < 70:
        weak.append({"title": "Technical Skills Refresh", "description": "Review core trade fundamentals and safety standards for your profession."})
    if (verification.practical_score or 0) < 70:
        weak.append({"title": "Hands-on Practice", "description": "Complete supervised practice sessions and document real work."})
    if (verification.interview_score or 0) < 70:
        weak.append({"title": "Communication & Interviews", "description": "Practice explaining your work process clearly to customers."})
    if not weak:
        weak.append({"title": "Advanced Certification", "description": "Pursue an advanced trade certification to specialise further."})
    return weak


# ---------------------------------------------------------------------------
# Certificate generation (QR + PDF)
# ---------------------------------------------------------------------------

def _generate_qr(data: str, out_path: Path) -> Optional[str]:
    try:
        import qrcode
        from PIL import Image as PILImage
        img = qrcode.make(data, box_size=8)
        img = img.convert("RGB") if isinstance(img, PILImage.Image) else img
        img.save(str(out_path), format="PNG")
        return str(out_path)
    except Exception as e:
        logger.warning(f"QR generation failed: {e}")
        return None


def _generate_certificate_pdf(
    cert_no: str,
    worker_name: str,
    profession: str,
    trust_score: float,
    badge: str,
    issued_at: datetime,
    qr_path: Optional[str],
) -> str:
    """Generate a professional certificate PDF and return the public URL."""
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor

    base = Path(settings.UPLOAD_DIR) / "certificates"
    base.mkdir(parents=True, exist_ok=True)
    filename = f"onedw_cert_{cert_no}.pdf"
    filepath = base / filename

    width, height = landscape(A4)
    c = canvas.Canvas(str(filepath), pagesize=landscape(A4))

    # border
    c.setStrokeColor(HexColor("#1d4ed8"))
    c.setLineWidth(6)
    c.rect(12 * mm, 12 * mm, width - 24 * mm, height - 24 * mm)
    c.setStrokeColor(HexColor("#f59e0b"))
    c.setLineWidth(2)
    c.rect(16 * mm, 16 * mm, width - 32 * mm, height - 32 * mm)

    c.setFillColor(HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 40)
    c.drawCentredString(width / 2, height - 45 * mm, "OneDW Verified Professional")

    c.setFillColor(HexColor("#64748b"))
    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 56 * mm, "Certificate of AI Skill Verification")

    badge_label = BADGE_LABELS.get(badge, badge.title())
    badge_hex = {"gold": "#d97706", "pro": "#0284c7", "beginner": "#16a34a"}.get(badge, "#dc2626")
    c.setFillColor(HexColor(badge_hex))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 72 * mm, badge_label)

    c.setFillColor(HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 30)
    c.drawCentredString(width / 2, height - 95 * mm, worker_name)

    c.setFillColor(HexColor("#475569"))
    c.setFont("Helvetica", 16)
    c.drawCentredString(width / 2, height - 108 * mm, f"Profession: {profession}")

    c.drawCentredString(width / 2, height - 120 * mm, f"Overall Trust Score: {round(trust_score, 1)} / 100")

    c.setFont("Helvetica", 13)
    c.setFillColor(HexColor("#64748b"))
    c.drawCentredString(width / 2, height - 140 * mm, f"Certificate ID: {cert_no}")
    c.drawCentredString(width / 2, height - 150 * mm, f"Issued: {issued_at.strftime('%d %B %Y')}")

    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, 30 * mm, "This certificate is issued by OneDW after AI technical, practical and interview verification.")
    c.drawCentredString(width / 2, 22 * mm, "Verify authenticity by scanning the QR code.")

    if qr_path and Path(qr_path).exists():
        c.drawImage(str(qr_path), width - 62 * mm, 18 * mm, width=44 * mm, height=44 * mm)

    c.save()
    return f"/uploads/certificates/{filename}"


async def generate_certificate(verification: WorkerVerification, worker: Worker) -> dict:
    """Create QR + PDF and persist the VerificationCertificate row."""
    cert_no = "ONEDW-{}-{}".format(
        datetime.now().strftime("%Y%m"),
        uuid.uuid4().hex[:8].upper(),
    )
    issued_at = _utcnow()
    verify_url = f"{settings.API_V1_PREFIX}/verification/verify/{cert_no}"

    cert_dir = Path(settings.UPLOAD_DIR) / "certificates"
    cert_dir.mkdir(parents=True, exist_ok=True)
    qr_path = _generate_qr(verify_url, cert_dir / f"qr_{cert_no}.png")

    pdf_url = _generate_certificate_pdf(
        cert_no=cert_no,
        worker_name=worker.name,
        profession=verification.profession,
        trust_score=verification.trust_score or 0.0,
        badge=verification.badge or "",
        issued_at=issued_at,
        qr_path=qr_path,
    )
    qr_url = f"/uploads/certificates/qr_{cert_no}.png" if qr_path else None

    cert = await VerificationCertificate.find_one(VerificationCertificate.verification_id == verification.id)
    if cert is None:
        cert = VerificationCertificate(
            verification_id=verification.id,
            worker_id=verification.worker_id,
            certificate_no=cert_no,
        )
    cert.worker_name = worker.name
    cert.profession = verification.profession
    cert.trust_score = verification.trust_score or 0.0
    cert.badge = verification.badge or ""
    cert.issued_at = issued_at
    cert.qr_code_url = qr_url
    cert.pdf_url = pdf_url
    cert.is_active = True
    await cert.save()

    return {
        "certificate_no": cert.certificate_no,
        "worker_name": cert.worker_name,
        "profession": cert.profession,
        "trust_score": cert.trust_score,
        "badge": cert.badge,
        "issued_at": cert.issued_at.isoformat() if cert.issued_at else None,
        "qr_code_url": cert.qr_code_url,
        "pdf_url": cert.pdf_url,
    }


# ---------------------------------------------------------------------------
# Verification lifecycle helpers
# ---------------------------------------------------------------------------


async def get_active_verification(worker_id: str) -> Optional[WorkerVerification]:
    all_v = await WorkerVerification.find(
        WorkerVerification.worker_id == worker_id,
        WorkerVerification.status == "in_progress",
    ).to_list()
    if not all_v:
        return None
    return max(all_v, key=lambda v: v.attempt_number or 0)


async def get_latest_verification(worker_id: str) -> Optional[WorkerVerification]:
    all_v = await WorkerVerification.find(WorkerVerification.worker_id == worker_id).to_list()
    if not all_v:
        return None
    return max(all_v, key=lambda v: v.created_at or datetime.min)


async def create_verification(worker: Worker) -> WorkerVerification:
    """Create a new verification attempt, honouring the rejected retry cooldown."""
    latest = await get_latest_verification(worker.id)
    if latest and latest.badge == BADGE_REJECTED:
        if latest.retry_available_at and latest.retry_available_at > _utcnow():
            raise BadRequestException(
                message="You must wait before retaking the verification. Please try again after {}.".format(
                    latest.retry_available_at.strftime("%d %b %Y")
                )
            )

    attempt = 1
    if latest:
        attempt = latest.attempt_number + 1

    verification = WorkerVerification(
        worker_id=worker.id,
        attempt_number=attempt,
        profession=worker.profession or "General Technician",
        status="in_progress",
        step="documents",
        admin_status="pending",
        started_at=_utcnow(),
    )
    await verification.insert()
    return verification


async def get_skill_test_session(verification_id: str) -> Optional[SkillTestSession]:
    return await SkillTestSession.find_one(SkillTestSession.verification_id == verification_id)


async def create_skill_test_session(verification: WorkerVerification, worker: Worker, language: str = "en") -> SkillTestSession:
    session = SkillTestSession(
        verification_id=verification.id,
        worker_id=worker.id,
        profession=verification.profession,
        status="started",
        started_at=_utcnow(),
    )
    await session.insert()
    return session


async def complete_verification(verification: WorkerVerification, worker: Worker) -> dict:
    """Finalise the attempt: trust score, badge, certificate, worker status."""
    docs = await compute_documents_score(worker)
    exp = await compute_experience_score(worker)
    verification.documents_score = docs
    verification.experience_score = exp

    trust = await compute_trust_score(verification, worker)
    verification.trust_score = trust
    verification.badge = assign_badge(trust)
    verification.status = "completed"
    verification.submitted_at = _utcnow()
    verification.training_recommendations = generate_training_recommendations(verification)

    if verification.badge == BADGE_REJECTED:
        verification.retry_available_at = _utcnow() + timedelta(days=REJECTED_RETRY_DAYS)
        worker.verification_status = "rejected"
    else:
        worker.verification_status = "completed"

    worker.trust_score = trust
    worker.verification_badge = verification.badge
    await worker.save()

    certificate = None
    if verification.badge != BADGE_REJECTED:
        certificate = await generate_certificate(verification, worker)

    await verification.save()

    return {
        "verification_id": verification.id,
        "status": verification.status,
        "badge": verification.badge,
        "trust_score": trust,
        "technical_score": verification.technical_score,
        "practical_score": verification.practical_score,
        "interview_score": verification.interview_score,
        "documents_score": docs,
        "experience_score": exp,
        "training_recommendations": verification.training_recommendations,
        "retry_available_at": verification.retry_available_at.isoformat() if verification.retry_available_at else None,
        "certificate": certificate,
    }


# ---------------------------------------------------------------------------
# Public helpers used by admin / serialization
# ---------------------------------------------------------------------------

async def serialize_verification(verification: WorkerVerification, include_stages: bool = False) -> dict:
    worker = await Worker.find_one(Worker.id == verification.worker_id)
    user = await User.find_one(User.id == worker.user_id) if worker else None
    data = {
        "id": verification.id,
        "worker_id": verification.worker_id,
        "worker_name": worker.name if worker else None,
        "avatar": worker.avatar if worker else None,
        "email": user.email if user else None,
        "profession": verification.profession,
        "attempt_number": verification.attempt_number,
        "status": verification.status,
        "step": verification.step,
        "technical_score": verification.technical_score,
        "practical_score": verification.practical_score,
        "interview_score": verification.interview_score,
        "documents_score": verification.documents_score,
        "experience_score": verification.experience_score,
        "trust_score": verification.trust_score,
        "badge": verification.badge,
        "admin_status": verification.admin_status,
        "admin_notes": verification.admin_notes,
        "document_media": verification.document_media,
        "skill_test_anti_cheat": verification.skill_test_anti_cheat,
        "training_recommendations": verification.training_recommendations,
        "started_at": verification.started_at.isoformat() if verification.started_at else None,
        "submitted_at": verification.submitted_at.isoformat() if verification.submitted_at else None,
        "retry_available_at": verification.retry_available_at.isoformat() if verification.retry_available_at else None,
        "created_at": verification.created_at.isoformat() if verification.created_at else None,
        "is_demo": verification.is_demo,
    }
    if include_stages:
        skill_test = await SkillTestSession.find_one(SkillTestSession.verification_id == verification.id)
        practical = await PracticalAssessment.find_one(PracticalAssessment.verification_id == verification.id)
        interview = await VoiceInterview.find_one(VoiceInterview.verification_id == verification.id)
        cert = await VerificationCertificate.find_one(VerificationCertificate.verification_id == verification.id)
        data["skill_test"] = {
            "id": skill_test.id if skill_test else None,
            "status": skill_test.status if skill_test else None,
            "score": skill_test.score if skill_test else None,
            "questions": skill_test.questions if skill_test else [],
            "answers": skill_test.answers if skill_test else [],
            "tab_switch_count": skill_test.tab_switch_count if skill_test else 0,
            "warnings_issued": skill_test.warnings_issued if skill_test else 0,
            "time_per_question": skill_test.time_per_question if skill_test else [],
            "skipped_count": skill_test.skipped_count if skill_test else 0,
            "suspicious_fast_answers": skill_test.suspicious_fast_answers if skill_test else [],
            "failed": skill_test.failed if skill_test else False,
            "submitted_at": skill_test.submitted_at.isoformat() if skill_test and skill_test.submitted_at else None,
        } if skill_test else None
        data["practical"] = {
            "id": practical.id if practical else None,
            "media_urls": practical.media_urls if practical else [],
            "evaluation": practical.evaluation if practical else {},
            "score": practical.score if practical else None,
            "submitted_at": practical.submitted_at.isoformat() if practical and practical.submitted_at else None,
        } if practical else None
        data["interview"] = {
            "id": interview.id if interview else None,
            "exchanges": interview.exchanges if interview else [],
            "evaluation": interview.evaluation if interview else {},
            "score": interview.score if interview else None,
            "status": interview.status if interview else None,
            "submitted_at": interview.submitted_at.isoformat() if interview and interview.submitted_at else None,
        } if interview else None
        data["certificate"] = {
            "certificate_no": cert.certificate_no if cert else None,
            "qr_code_url": cert.qr_code_url if cert else None,
            "pdf_url": cert.pdf_url if cert else None,
            "issued_at": cert.issued_at.isoformat() if cert and cert.issued_at else None,
        } if cert else None
    return data


async def serialize_worker_verification_brief(worker: Worker) -> Optional[dict]:
    """Lightweight verification summary attached to worker list/detail responses."""
    latest = await get_latest_verification_plain(worker)
    if latest is None:
        return None
    return {
        "status": latest.status,
        "admin_status": latest.admin_status,
        "badge": latest.badge,
        "trust_score": latest.trust_score,
        "step": latest.step,
        "submitted_at": latest.submitted_at.isoformat() if latest.submitted_at else None,
        "is_demo": latest.is_demo,
    }


async def get_latest_verification_plain(worker: Worker) -> Optional[WorkerVerification]:
    verifications = await WorkerVerification.find(WorkerVerification.worker_id == worker.id).to_list()
    verifications = [v for v in verifications if v.status == "completed"]
    if not verifications:
        return None
    return max(verifications, key=lambda v: v.created_at or datetime.min)
