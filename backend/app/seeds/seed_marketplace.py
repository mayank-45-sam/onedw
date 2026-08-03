"""
Seed script: populates the database with 25 categories and 5-10 services each.

Run from the backend directory:
    cd backend
    .venv\Scripts\python.exe -m app.seeds.seed_marketplace
"""

import uuid
import random
from app.db.database import SessionLocal
from app.models.category import Category
from app.models.service import Service


CATEGORIES = [
    {
        "name": "Plumbing",
        "slug": "plumbing",
        "description": "Professional plumbing services for homes and offices",
        "icon": "wrench",
        "color": "#3b82f6",
        "services": [
            ("Pipe Repair", "Fix leaking or burst pipes quickly", 499, 60, True, False, ["pipe", "leak", "repair"]),
            ("Drain Cleaning", "Unclog drains and remove blockages", 399, 45, True, True, ["drain", "clog", "cleaning"]),
            ("Faucet Installation", "Install or replace faucets and fittings", 599, 40, False, False, ["faucet", "install", "fitting"]),
            ("Toilet Repair", "Repair running or clogged toilets", 449, 50, False, False, ["toilet", "repair", "flush"]),
            ("Water Tank Cleaning", "Deep clean overhead and underground tanks", 699, 90, False, True, ["tank", "cleaning", "water"]),
            ("Bathroom Fitting", "Complete bathroom fixture installation", 1299, 120, False, False, ["bathroom", "fitting", "fixture"]),
            ("Geyser Installation", "Install and service water geysers", 799, 60, False, False, ["geyser", "water-heater", "install"]),
            ("Kitchen Sink Repair", "Fix kitchen sink drainage and leaks", 449, 45, False, False, ["kitchen", "sink", "repair"]),
        ],
    },
    {
        "name": "Electrical",
        "slug": "electrical",
        "description": "Licensed electricians for all your electrical needs",
        "icon": "zap",
        "color": "#f59e0b",
        "services": [
            ("Wiring Repair", "Fix faulty wiring and short circuits", 599, 60, True, False, ["wiring", "repair", "electric"]),
            ("Switch Board Repair", "Repair or replace switch boards", 399, 30, False, False, ["switch", "board", "repair"]),
            ("Fan Installation", "Install ceiling and wall fans", 299, 30, True, False, ["fan", "ceiling", "install"]),
            ("Light Installation", "Install lights, chandeliers, and LED panels", 349, 30, False, True, ["light", "led", "install"]),
            ("MCB Tripping Fix", "Diagnose and fix MCB tripping issues", 499, 45, False, False, ["mcb", "tripping", "electrical"]),
            ("Generator Service", "Service and repair home generators", 899, 90, False, False, ["generator", "service", "power"]),
            ("Inverter Installation", "Install inverters and battery backup systems", 699, 60, False, False, ["inverter", "battery", "backup"]),
        ],
    },
    {
        "name": "AC Repair",
        "slug": "ac-repair",
        "description": "Expert AC installation, servicing, and repair",
        "icon": "wind",
        "color": "#0ea5e9",
        "services": [
            ("AC Servicing", "Complete AC gas check and servicing", 599, 45, True, True, ["ac", "service", "gas"]),
            ("AC Installation", "Split and window AC installation", 899, 60, True, False, ["ac", "install", "split"]),
            ("AC Gas Refill", "Refill AC refrigerant gas", 999, 40, False, False, ["ac", "gas", "refill"]),
            ("AC Repair", "Fix cooling issues and compressor problems", 799, 60, False, True, ["ac", "repair", "compressor"]),
            ("AC Deep Cleaning", "Deep clean AC filters and coils", 699, 50, False, False, ["ac", "deep-clean", "filter"]),
        ],
    },
    {
        "name": "Cleaning",
        "slug": "cleaning",
        "description": "Professional home and office cleaning services",
        "icon": "sparkles",
        "color": "#10b981",
        "services": [
            ("Deep Home Cleaning", "Full home deep cleaning with sanitization", 1499, 180, True, True, ["home", "deep-clean", "sanitize"]),
            ("Bathroom Cleaning", "Intensive bathroom and toilet cleaning", 499, 60, True, False, ["bathroom", "clean", "sanitize"]),
            ("Kitchen Cleaning", "Degrease and deep clean kitchen", 599, 75, False, False, ["kitchen", "clean", "degrease"]),
            ("Sofa Cleaning", "Professional sofa and upholstery cleaning", 799, 90, False, True, ["sofa", "upholstery", "clean"]),
            ("Carpet Cleaning", "Steam clean carpets and rugs", 699, 60, False, False, ["carpet", "rug", "steam-clean"]),
            ("Office Cleaning", "Regular and deep cleaning for offices", 1999, 240, False, False, ["office", "commercial", "clean"]),
            ("Window Cleaning", "Clean windows, grills, and tracks", 599, 60, False, False, ["window", "glass", "clean"]),
            ("Post-Construction Cleaning", "Remove debris and clean after renovation", 2499, 300, False, False, ["construction", "renovation", "cleanup"]),
        ],
    },
    {
        "name": "Home Painting",
        "slug": "home-painting",
        "description": "Interior and exterior painting by skilled painters",
        "icon": "paintbrush",
        "color": "#8b5cf6",
        "services": [
            ("Room Painting (per room)", "Paint a single room with primer and finish", 2499, 240, True, True, ["room", "paint", "interior"]),
            ("Full Home Painting", "Paint entire home interior", 8999, 720, True, False, ["home", "paint", "interior"]),
            ("Exterior Painting", "Paint building exterior walls", 4999, 480, False, False, ["exterior", "wall", "paint"]),
            ("Texture Work", "Apply texture finishes on walls", 1999, 180, False, False, ["texture", "wall", "finish"]),
            ("Waterproof Painting", "Waterproof paint for terraces and walls", 3499, 360, False, False, ["waterproof", "paint", "terrace"]),
            ("Wood Polish & Painting", "Polish and paint wooden furniture", 999, 120, False, False, ["wood", "polish", "furniture"]),
        ],
    },
    {
        "name": "Carpentry",
        "slug": "carpentry",
        "description": "Custom woodwork, furniture repair, and installations",
        "icon": "hammer",
        "color": "#d97706",
        "services": [
            ("Furniture Repair", "Fix broken chairs, tables, and beds", 599, 60, True, False, ["furniture", "repair", "wood"]),
            ("Door Installation", "Install wooden doors and frames", 899, 90, True, False, ["door", "install", "frame"]),
            ("Shelf Installation", "Install wall shelves and cabinets", 499, 45, False, False, ["shelf", "cabinet", "install"]),
            ("Wardrobe Repair", "Fix wardrobe doors, hinges, and drawers", 699, 60, False, False, ["wardrobe", "hinge", "repair"]),
            ("Window Frame Repair", "Repair or replace window frames", 799, 75, False, False, ["window", "frame", "repair"]),
            ("Custom Woodwork", "Build custom wooden fixtures", 1999, 240, False, True, ["custom", "woodwork", "build"]),
        ],
    },
    {
        "name": "Pest Control",
        "slug": "pest-control",
        "description": "Safe and effective pest elimination for homes",
        "icon": "bug",
        "color": "#ef4444",
        "services": [
            ("General Pest Control", "Treat cockroaches, ants, and spiders", 799, 60, True, True, ["pest", "cockroach", "ant"]),
            ("Termite Treatment", "Anti-termite treatment for wooden furniture", 1499, 120, True, False, ["termite", "wood", "treatment"]),
            ("Mosquito Fogging", "Outdoor mosquito fogging and repellent", 999, 45, False, False, ["mosquito", "fogging", "outdoor"]),
            ("Bed Bug Treatment", "Eliminate bed bugs from mattresses and furniture", 1299, 90, False, True, ["bed-bug", "mattress", "treatment"]),
            ("Rat & Rodent Control", "Trap and eliminate rats and mice", 899, 60, False, False, ["rat", "rodent", "trap"]),
        ],
    },
    {
        "name": "Appliance Repair",
        "slug": "appliance-repair",
        "description": "Repair and service all home appliances",
        "icon": "settings",
        "color": "#6b7280",
        "services": [
            ("Mixer Grinder Repair", "Fix mixer grinders and juicers", 399, 45, True, False, ["mixer", "grinder", "repair"]),
            ("Iron Repair", "Fix steam and dry irons", 299, 30, False, False, ["iron", "steam", "repair"]),
            ("Water Purifier Service", "Service and filter replacement for RO", 599, 45, True, True, ["ro", "purifier", "service"]),
            ("Microwave Repair", "Fix microwave oven heating issues", 699, 60, False, False, ["microwave", "oven", "repair"]),
            ("Fan Repair", "Repair ceiling, table, and exhaust fans", 399, 40, False, False, ["fan", "repair", "motor"]),
            ("Printer Repair", "Fix printer jams and connectivity issues", 499, 45, False, False, ["printer", "repair", "jam"]),
        ],
    },
    {
        "name": "Refrigerator Repair",
        "slug": "refrigerator-repair",
        "description": "Expert refrigerator repair and gas charging",
        "icon": "refrigerator",
        "color": "#06b6d4",
        "services": [
            ("Fridge Not Cooling", "Fix cooling issues in single and double door fridges", 699, 60, True, True, ["fridge", "cooling", "repair"]),
            ("Fridge Gas Charging", "Refrigerant gas top-up and leak repair", 999, 45, True, False, ["fridge", "gas", "refill"]),
            ("Compressor Repair", "Fix or replace fridge compressor", 1499, 90, False, False, ["compressor", "fridge", "repair"]),
            ("Fridge Thermostat Fix", "Replace faulty thermostat sensors", 599, 40, False, False, ["thermostat", "fridge", "sensor"]),
            ("Water Dispenser Repair", "Fix fridge water and ice dispenser", 599, 45, False, False, ["dispenser", "fridge", "water"]),
        ],
    },
    {
        "name": "Washing Machine Repair",
        "slug": "washing-machine-repair",
        "description": "All types of washing machine repair and service",
        "icon": "droplets",
        "color": "#6366f1",
        "services": [
            ("WM Not Draining", "Fix drainage and pump issues", 599, 45, True, True, ["washing-machine", "drain", "pump"]),
            ("WM Drum Repair", "Repair or replace washing machine drum", 999, 90, False, False, ["drum", "washing-machine", "repair"]),
            ("WM Spin Fix", "Fix spin cycle and vibration issues", 499, 40, True, False, ["spin", "vibration", "fix"]),
            ("WM Belt Replacement", "Replace worn-out drive belts", 599, 45, False, False, ["belt", "washing-machine", "replace"]),
            ("WM Full Service", "Complete washing machine deep service", 799, 60, False, True, ["washing-machine", "service", "deep-clean"]),
        ],
    },
    {
        "name": "TV Repair",
        "slug": "tv-repair",
        "description": "LED, LCD, Smart TV, and home theatre repair",
        "icon": "tv",
        "color": "#475569",
        "services": [
            ("LED TV Repair", "Fix display, sound, and power issues in LED TVs", 799, 60, True, True, ["led", "tv", "repair"]),
            ("Smart TV Software Fix", "Fix app crashes and OS issues", 599, 45, False, False, ["smart-tv", "software", "fix"]),
            ("TV Wall Mounting", "Mount TV on wall with cable management", 499, 30, True, False, ["tv", "wall-mount", "install"]),
            ("Home Theatre Setup", "Set up and configure home theatre systems", 999, 60, False, False, ["home-theatre", "setup", "sound"]),
            ("TV Panel Replacement", "Replace damaged TV display panels", 2999, 120, False, False, ["panel", "tv", "replace"]),
        ],
    },
    {
        "name": "RO Water Purifier",
        "slug": "ro-water-purifier",
        "description": "RO installation, repair, and filter replacement",
        "icon": "waves",
        "color": "#2563eb",
        "services": [
            ("RO Service", "Complete RO purifier service and check-up", 499, 45, True, True, ["ro", "service", "purifier"]),
            ("RO Filter Change", "Replace RO, UF, and carbon filters", 699, 30, True, False, ["ro", "filter", "replace"]),
            ("RO Installation", "Install new RO water purifier", 799, 60, False, False, ["ro", "install", "purifier"]),
            ("RO Leak Repair", "Fix water leakage from RO units", 399, 30, False, False, ["ro", "leak", "repair"]),
            ("UV Bulb Replacement", "Replace UV lamp in RO purifiers", 499, 20, False, False, ["uv", "bulb", "replace"]),
        ],
    },
    {
        "name": "CCTV Installation",
        "slug": "cctv-installation",
        "description": "CCTV camera installation and maintenance",
        "icon": "cctv",
        "color": "#dc2626",
        "services": [
            ("CCTV Camera Installation", "Install 2-4 camera CCTV system", 2999, 180, True, True, ["cctv", "camera", "install"]),
            ("CCTV Camera Repair", "Fix camera, DVR, and connectivity issues", 799, 60, False, False, ["cctv", "repair", "dvr"]),
            ("DVR Setup & Config", "Set up DVR for remote viewing", 599, 60, False, False, ["dvr", "setup", "remote-view"]),
            ("Night Vision Camera Install", "Install night vision and IR cameras", 3499, 180, False, False, ["night-vision", "camera", "install"]),
            ("CCTV Annual Maintenance", "Yearly maintenance contract for CCTV", 1999, 120, False, False, ["cctv", "maintenance", "annual"]),
        ],
    },
    {
        "name": "Interior Design",
        "slug": "interior-design",
        "description": "Transform your space with expert interior designers",
        "icon": "sofa",
        "color": "#ec4899",
        "services": [
            ("Living Room Design", "Complete living room interior makeover", 9999, 1440, True, True, ["living-room", "interior", "design"]),
            ("Bedroom Design", "Bedroom interior with wardrobes and lighting", 7999, 1200, True, False, ["bedroom", "interior", "wardrobe"]),
            ("Modular Kitchen", "Design and install modular kitchen", 14999, 2160, False, True, ["kitchen", "modular", "design"]),
            ("Space Planning", "Optimize room layout and space utilization", 2999, 240, False, False, ["space", "planning", "layout"]),
            ("False Ceiling", "Install false ceiling with LED lighting", 4999, 480, False, False, ["ceiling", "false-ceiling", "led"]),
        ],
    },
    {
        "name": "Home Shifting",
        "slug": "home-shifting",
        "description": "Pack, move, and unpack with trained professionals",
        "icon": "truck",
        "color": "#14b8a6",
        "services": [
            ("Local Shifting", "Within-city home shifting with packing", 3999, 360, True, True, ["local", "shifting", "packing"]),
            ("Office Shifting", "Relocate office equipment safely", 5999, 360, True, False, ["office", "shifting", "relocate"]),
            ("Single Room Shifting", "Shift a single room contents", 1499, 180, False, False, ["single-room", "shifting", "pack"]),
            ("Packing Only", "Professional packing with materials", 999, 120, False, False, ["packing", "materials", "wrap"]),
            ("Furniture Moving", "Move heavy furniture safely", 1999, 120, False, True, ["furniture", "moving", "heavy"]),
            ("Storage Service", "Temporary storage for household items", 2499, 60, False, False, ["storage", "temporary", "household"]),
        ],
    },
    {
        "name": "Gardening",
        "slug": "gardening",
        "description": "Garden maintenance, landscaping, and plant care",
        "icon": "flower2",
        "color": "#22c55e",
        "services": [
            ("Garden Maintenance", "Regular garden trimming, weeding, and care", 699, 90, True, True, ["garden", "maintenance", "trim"]),
            ("Lawn Mowing", "Professional lawn mowing and edging", 499, 60, True, False, ["lawn", "mowing", "grass"]),
            ("Planting Service", "Plant new flowers, shrubs, and trees", 799, 90, False, False, ["planting", "flowers", "trees"]),
            ("Garden Cleanup", "Seasonal garden cleanup and composting", 599, 60, False, False, ["garden", "cleanup", "compost"]),
            ("Irrigation Setup", "Install drip irrigation and sprinkler systems", 2999, 240, False, False, ["irrigation", "sprinkler", "drip"]),
        ],
    },
    {
        "name": "Beauty at Home",
        "slug": "beauty-at-home",
        "description": "Parlour-quality beauty services at your doorstep",
        "icon": "heart",
        "color": "#d946ef",
        "services": [
            ("Full Body Massage", "Relaxing full body massage therapy", 1299, 60, True, True, ["massage", "body", "relax"]),
            ("Facial & Cleanup", "Gold, diamond, or fruit facial treatment", 599, 45, True, False, ["facial", "cleanup", "skin"]),
            ("Hair Styling", "Hair cut, styling, and treatment", 499, 45, False, False, ["hair", "styling", "cut"]),
            ("Manicure & Pedicure", "Complete nail care treatment", 699, 60, False, True, ["manicure", "pedicure", "nails"]),
            ("Waxing Service", "Full body or half body waxing", 799, 60, False, False, ["waxing", "body", "hair-removal"]),
            ("Bridal Makeup", "Complete bridal makeup and styling", 4999, 240, False, False, ["bridal", "makeup", "wedding"]),
        ],
    },
    {
        "name": "Spa & Massage",
        "slug": "spa-massage",
        "description": "Professional therapeutic massage and spa treatments",
        "icon": "heart-pulse",
        "color": "#f472b6",
        "services": [
            ("Swedish Massage", "Gentle full body relaxation massage", 1499, 60, True, True, ["swedish", "massage", "relax"]),
            ("Deep Tissue Massage", "Therapeutic deep tissue pain relief", 1799, 60, True, False, ["deep-tissue", "pain", "therapeutic"]),
            ("Thai Massage", "Traditional Thai stretching massage", 1699, 75, False, True, ["thai", "stretching", "traditional"]),
            ("Aromatherapy", "Essential oil aromatherapy massage", 1999, 60, False, False, ["aromatherapy", "essential-oil", "relax"]),
            ("Head & Shoulder Massage", "Targeted tension relief massage", 599, 30, False, False, ["head", "shoulder", "tension"]),
        ],
    },
    {
        "name": "Cooking / Home Chef",
        "slug": "cooking-home-chef",
        "description": "Hire a professional chef for events and daily meals",
        "icon": "chef-hat",
        "color": "#f97316",
        "services": [
            ("Party Catering", "Full meal catering for events and parties", 4999, 360, True, True, ["party", "catering", "event"]),
            ("Daily Tiffin Service", "Home-cooked meal delivery daily", 2999, 30, True, False, ["tiffin", "daily", "meal"]),
            ("Special Diet Meals", "Custom diet meals (keto, vegan, etc.)", 1999, 120, False, False, ["diet", "keto", "vegan"]),
            ("Festival Special Cooking", "Festive meals and sweets preparation", 2499, 240, False, True, ["festival", "sweets", "special"]),
            ("BBQ & Grill Service", "Outdoor BBQ and grilling setup", 3499, 180, False, False, ["bbq", "grill", "outdoor"]),
        ],
    },
    {
        "name": "Home Tutor",
        "slug": "home-tutor",
        "description": "Experienced tutors for all subjects and age groups",
        "icon": "graduation-cap",
        "color": "#3b82f6",
        "services": [
            ("Math Tutoring", "Personalized math coaching for all grades", 599, 60, True, True, ["math", "tutor", "coaching"]),
            ("Science Tutoring", "Physics, Chemistry, and Biology tutoring", 599, 60, True, False, ["science", "physics", "chemistry"]),
            ("English Speaking", "English speaking and grammar improvement", 499, 60, False, True, ["english", "speaking", "grammar"]),
            ("Board Exam Prep", "Intensive preparation for board exams", 799, 90, False, False, ["board-exam", "preparation", "intensive"]),
            ("Programming Tutor", "Learn coding from beginner to advanced", 899, 60, False, False, ["programming", "coding", "computer"]),
        ],
    },
    {
        "name": "Babysitting",
        "slug": "babysitting",
        "description": "Trusted and verified babysitters for your little ones",
        "icon": "baby",
        "color": "#f9a8d4",
        "services": [
            ("Full Day Babysitting", "Professional childcare for a full day", 1499, 480, True, True, ["babysitting", "childcare", "full-day"]),
            ("Evening Babysitting", "Evening care for 4-5 hours", 799, 240, True, False, ["babysitting", "evening", "care"]),
            ("Newborn Care", "Specialized care for newborns", 1999, 480, False, False, ["newborn", "specialized", "infant"]),
            ("Toddler Activity Supervisor", "Engage toddlers with activities and play", 999, 240, False, False, ["toddler", "activities", "play"]),
            ("Night Babysitting", "Overnight childcare service", 2499, 600, False, True, ["night", "overnight", "care"]),
        ],
    },
    {
        "name": "Elder Care",
        "slug": "elder-care",
        "description": "Compassionate care services for senior citizens",
        "icon": "heart-pulse",
        "color": "#14b8a6",
        "services": [
            ("Senior Companion Care", "Daily companionship and assistance", 999, 360, True, True, ["senior", "companion", "daily"]),
            ("Post-Surgery Care", "Specialized post-operative care at home", 1499, 480, True, False, ["post-surgery", "recovery", "care"]),
            ("Physiotherapy at Home", "Home visits by licensed physiotherapists", 899, 45, False, True, ["physiotherapy", "rehabilitation", "home"]),
            ("Medication Management", "Help with timely medication and reminders", 499, 60, False, False, ["medication", "reminder", "management"]),
            ("Daily Routine Assistance", "Help with bathing, eating, and mobility", 799, 360, False, False, ["daily", "bathing", "mobility"]),
        ],
    },
    {
        "name": "Pet Care",
        "slug": "pet-care",
        "description": "Grooming, walking, boarding, and vet visits for pets",
        "icon": "paw-print",
        "color": "#eab308",
        "services": [
            ("Dog Grooming", "Full grooming session for dogs", 799, 60, True, True, ["dog", "grooming", "bath"]),
            ("Pet Walking", "Professional dog walking service", 299, 60, True, False, ["dog", "walking", "exercise"]),
            ("Pet Bathing", "Bath and coat care for cats and dogs", 499, 45, False, False, ["pet", "bath", "coat"]),
            ("Pet Sitting", "In-home pet care while you travel", 999, 480, False, True, ["pet-sitting", "travel", "care"]),
            ("Vet Visit Escort", "Transport and accompany pet to vet", 499, 120, False, False, ["vet", "transport", "escort"]),
        ],
    },
    {
        "name": "Laundry",
        "slug": "laundry",
        "description": "Doorstep pickup and delivery laundry service",
        "icon": "shirt",
        "color": "#38bdf8",
        "services": [
            ("Wash & Fold", "Regular laundry washed, dried, and folded", 199, 120, True, True, ["laundry", "wash", "fold"]),
            ("Dry Cleaning", "Professional dry cleaning for delicate items", 399, 120, True, False, ["dry-cleaning", "delicate", "formal"]),
            ("Ironing Service", "Professional pressing and ironing", 99, 60, False, False, ["ironing", "pressing", "formal"]),
            ("Stain Removal", "Specialized stain treatment", 299, 60, False, False, ["stain", "removal", "treatment"]),
            ("Curtain & Upholstery Cleaning", "Deep clean curtains and sofa covers", 599, 120, False, True, ["curtain", "upholstery", "deep-clean"]),
        ],
    },
    {
        "name": "Car Wash",
        "slug": "car-wash",
        "description": "Doorstep car washing, detailing, and polishing",
        "icon": "car",
        "color": "#2563eb",
        "services": [
            ("Exterior Car Wash", "Waterless or foam exterior wash", 299, 30, True, True, ["car", "exterior", "wash"]),
            ("Full Car Detailing", "Complete interior + exterior detailing", 1499, 120, True, False, ["detailing", "interior", "exterior"]),
            ("Interior Cleaning", "Deep clean car interior and dashboard", 599, 45, False, False, ["interior", "cleaning", "dashboard"]),
            ("Car Polishing & Waxing", "Paint correction and wax coat", 799, 60, False, True, ["polishing", "wax", "paint"]),
            ("Engine Bay Cleaning", "Safe engine bay degrease and wash", 499, 30, False, False, ["engine", "bay", "degrease"]),
        ],
    },
]

ICONS = {
    "plumbing": "wrench",
    "electrical": "zap",
    "ac-repair": "wind",
    "cleaning": "sparkles",
    "home-painting": "paintbrush",
    "carpentry": "hammer",
    "pest-control": "bug",
    "appliance-repair": "settings",
    "refrigerator-repair": "refrigerator",
    "washing-machine-repair": "droplets",
    "tv-repair": "tv",
    "ro-water-purifier": "waves",
    "cctv-installation": "cctv",
    "interior-design": "sofa",
    "home-shifting": "truck",
    "gardening": "flower2",
    "beauty-at-home": "heart",
    "spa-massage": "heart-pulse",
    "cooking-home-chef": "chef-hat",
    "home-tutor": "graduation-cap",
    "babysitting": "baby",
    "elder-care": "heart-pulse",
    "pet-care": "paw-print",
    "laundry": "shirt",
    "car-wash": "car",
}

COLORS = {
    "plumbing": "#3b82f6",
    "electrical": "#f59e0b",
    "ac-repair": "#0ea5e9",
    "cleaning": "#10b981",
    "home-painting": "#8b5cf6",
    "carpentry": "#d97706",
    "pest-control": "#ef4444",
    "appliance-repair": "#6b7280",
    "refrigerator-repair": "#06b6d4",
    "washing-machine-repair": "#6366f1",
    "tv-repair": "#475569",
    "ro-water-purifier": "#2563eb",
    "cctv-installation": "#dc2626",
    "interior-design": "#ec4899",
    "home-shifting": "#14b8a6",
    "gardening": "#22c55e",
    "beauty-at-home": "#d946ef",
    "spa-massage": "#f472b6",
    "cooking-home-chef": "#f97316",
    "home-tutor": "#3b82f6",
    "babysitting": "#f9a8d4",
    "elder-care": "#14b8a6",
    "pet-care": "#eab308",
    "laundry": "#38bdf8",
    "car-wash": "#2563eb",
}

_U = "https://images.unsplash.com"
_Q = "w=400&h=300&fit=crop&q=80"

CATEGORY_COVER = {
    "plumbing": f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
    "electrical": f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
    "ac-repair": f"{_U}/photo-1621905252507-b35492cc74b4?{_Q}",
    "cleaning": f"{_U}/photo-1581578731548-c64695cc6952?{_Q}",
    "home-painting": f"{_U}/photo-1589939705384-5185137a7f0f?{_Q}",
    "carpentry": f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
    "pest-control": f"{_U}/photo-1574362848149-11496d93a7c7?{_Q}",
    "appliance-repair": f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
    "refrigerator-repair": f"{_U}/photo-1571175443880-49e1d25b2bc5?{_Q}",
    "washing-machine-repair": f"{_U}/photo-1626806787461-102c1bfaaea1?{_Q}",
    "tv-repair": f"{_U}/photo-1593784991095-a205069470b6?{_Q}",
    "ro-water-purifier": f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
    "cctv-installation": f"{_U}/photo-1557862921-37829c790f19?{_Q}",
    "interior-design": f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
    "home-shifting": f"{_U}/photo-1600518464441-9154a4dea21b?{_Q}",
    "gardening": f"{_U}/photo-1416879595882-3373a0480b5b?{_Q}",
    "beauty-at-home": f"{_U}/photo-1560066984-138dadb4c035?{_Q}",
    "spa-massage": f"{_U}/photo-1600334089648-b0d9d3028eb2?{_Q}",
    "cooking-home-chef": f"{_U}/photo-1556910103-1c02745aae4d?{_Q}",
    "home-tutor": f"{_U}/photo-1503676260728-1c00da094a0b?{_Q}",
    "babysitting": f"{_U}/photo-1504439468489-c8920d796a29?{_Q}",
    "elder-care": f"{_U}/photo-1579154204601-01588f351e67?{_Q}",
    "pet-care": f"{_U}/photo-1587300003388-59208cc962cb?{_Q}",
    "laundry": f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
    "car-wash": f"{_U}/photo-1507136566006-cfc505b114fc?{_Q}",
}

CATEGORY_IMAGES = {
    "plumbing": [
        f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
        f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
        f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
        f"{_U}/photo-1607472586893-edb57bdc0e39?{_Q}",
        f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
        f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
        f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    ],
    "electrical": [
        f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
        f"{_U}/photo-1513506003901-1e6a229e2d15?{_Q}",
        f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
        f"{_U}/photo-1497366216548-37526070297c?{_Q}",
        f"{_U}/photo-1504280390367-361c6d9f38f4?{_Q}",
        f"{_U}/photo-1620714223084-8fcacc6dfd8d?{_Q}",
        f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    ],
    "ac-repair": [
        f"{_U}/photo-1621905252507-b35492cc74b4?{_Q}",
        f"{_U}/photo-1585771724684-38269d6639fd?{_Q}",
        f"{_U}/photo-1562281302-809108fd533c?{_Q}",
        f"{_U}/photo-1504215680853-026ed2a45def?{_Q}",
        f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
    ],
    "cleaning": [
        f"{_U}/photo-1581578731548-c64695cc6952?{_Q}",
        f"{_U}/photo-1628177142898-93e36e4e3a50?{_Q}",
        f"{_U}/photo-1527515637462-cff94eecc1ac?{_Q}",
        f"{_U}/photo-1584820927498-cfe5211fd8bf?{_Q}",
        f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
        f"{_U}/photo-1497366811353-6870744d04b2?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1558317374-067fb5f30001?{_Q}",
    ],
    "home-painting": [
        f"{_U}/photo-1589939705384-5185137a7f0f?{_Q}",
        f"{_U}/photo-1562281302-809108fd533c?{_Q}",
        f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
        f"{_U}/photo-1560448204-e02f11c3d0e2?{_Q}",
        f"{_U}/photo-1517816428104-797678c7cf0c?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    ],
    "carpentry": [
        f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
        f"{_U}/photo-1504148455328-c376907d081c?{_Q}",
        f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
        f"{_U}/photo-1595515106969-1ce29566ff1c?{_Q}",
    ],
    "pest-control": [
        f"{_U}/photo-1574362848149-11496d93a7c7?{_Q}",
        f"{_U}/photo-1615963244664-5b845b2025ee?{_Q}",
        f"{_U}/photo-1506748686214-e9df14d4d9d0?{_Q}",
        f"{_U}/photo-1585320806297-9794b3e4eeae?{_Q}",
    ],
    "appliance-repair": [
        f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
        f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
        f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
        f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
    ],
    "refrigerator-repair": [
        f"{_U}/photo-1571175443880-49e1d25b2bc5?{_Q}",
        f"{_U}/photo-1584568694244-14fbdf83bd30?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
        f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    ],
    "washing-machine-repair": [
        f"{_U}/photo-1626806787461-102c1bfaaea1?{_Q}",
        f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
        f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
    ],
    "tv-repair": [
        f"{_U}/photo-1593784991095-a205069470b6?{_Q}",
        f"{_U}/photo-1517816428104-797678c7cf0c?{_Q}",
        f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
        f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    ],
    "ro-water-purifier": [
        f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
        f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
        f"{_U}/photo-1562281302-809108fd533c?{_Q}",
        f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
        f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
    ],
    "cctv-installation": [
        f"{_U}/photo-1557862921-37829c790f19?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
        f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
        f"{_U}/photo-1497366216548-37526070297c?{_Q}",
    ],
    "interior-design": [
        f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
        f"{_U}/photo-1616486338812-3dadae4b4ace?{_Q}",
        f"{_U}/photo-1616594039964-ae9021a400a0?{_Q}",
        f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
        f"{_U}/photo-1524758631624-e2822e304c36?{_Q}",
    ],
    "home-shifting": [
        f"{_U}/photo-1600518464441-9154a4dea21b?{_Q}",
        f"{_U}/photo-1586528116311-ad8dd3c8310d?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
        f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
        f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    ],
    "gardening": [
        f"{_U}/photo-1416879595882-3373a0480b5b?{_Q}",
        f"{_U}/photo-1585320806297-9794b3e4eeae?{_Q}",
        f"{_U}/photo-1466692476868-aef1dfb1e735?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1523348837708-15d4a09cfac2?{_Q}",
    ],
    "beauty-at-home": [
        f"{_U}/photo-1560066984-138dadb4c035?{_Q}",
        f"{_U}/photo-1570172619644-dfd03ed5d881?{_Q}",
        f"{_U}/photo-1522337360788-8b13dee7a37e?{_Q}",
        f"{_U}/photo-1604654894610-df63bc536371?{_Q}",
        f"{_U}/photo-1516975080664-ed2fc6a32937?{_Q}",
        f"{_U}/photo-1487412720507-e7ab37603c6f?{_Q}",
    ],
    "spa-massage": [
        f"{_U}/photo-1600334089648-b0d9d3028eb2?{_Q}",
        f"{_U}/photo-1519823551278-64ac92734fb1?{_Q}",
        f"{_U}/photo-1507003211169-0a1dd7228f2d?{_Q}",
        f"{_U}/photo-1544161515-4ab6ce6db874?{_Q}",
    ],
    "cooking-home-chef": [
        f"{_U}/photo-1556910103-1c02745aae4d?{_Q}",
        f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
        f"{_U}/photo-1512621776951-a57141f2eefd?{_Q}",
        f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
        f"{_U}/photo-1555939594-58d7cb561ad1?{_Q}",
    ],
    "home-tutor": [
        f"{_U}/photo-1503676260728-1c00da094a0b?{_Q}",
        f"{_U}/photo-1532094349884-543bc11b234d?{_Q}",
        f"{_U}/photo-1456513080510-7bf3a84b82f8?{_Q}",
        f"{_U}/photo-1523580846011-d3a5bc25702b?{_Q}",
        f"{_U}/photo-1461749280684-dccba630e2f6?{_Q}",
    ],
    "babysitting": [
        f"{_U}/photo-1504439468489-c8920d796a29?{_Q}",
        f"{_U}/photo-1515488042361-ee00e0ddd4e4?{_Q}",
        f"{_U}/photo-1519689680058-324335c77eba?{_Q}",
        f"{_U}/photo-1503454537195-1dcabb73ffb9?{_Q}",
        f"{_U}/photo-1516627145497-ae6968895b74?{_Q}",
    ],
    "elder-care": [
        f"{_U}/photo-1579154204601-01588f351e67?{_Q}",
        f"{_U}/photo-1579684385127-1ef15d508118?{_Q}",
        f"{_U}/photo-1576091160550-2173dba999ef?{_Q}",
        f"{_U}/photo-1584308666744-24d5c474f2ae?{_Q}",
        f"{_U}/photo-1516627145497-ae6968895b74?{_Q}",
    ],
    "pet-care": [
        f"{_U}/photo-1587300003388-59208cc962cb?{_Q}",
        f"{_U}/photo-1530281700549-e82e7bf110d6?{_Q}",
        f"{_U}/photo-1543466835-00a7907e9de1?{_Q}",
        f"{_U}/photo-1601758228041-f3b2795255f1?{_Q}",
        f"{_U}/photo-1628009368231-7bb7cfcb0def?{_Q}",
    ],
    "laundry": [
        f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
        f"{_U}/photo-1545173168-9f1947eebb7f?{_Q}",
        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
        f"{_U}/photo-1527515637462-cff94eecc1ac?{_Q}",
        f"{_U}/photo-1497366216548-37526070297c?{_Q}",
    ],
    "car-wash": [
        f"{_U}/photo-1507136566006-cfc505b114fc?{_Q}",
        f"{_U}/photo-1542362567-b07e54358753?{_Q}",
        f"{_U}/photo-1489824904134-891ab64532f1?{_Q}",
        f"{_U}/photo-1503376780353-7e6692767b70?{_Q}",
        f"{_U}/photo-1486262715619-67b85e0b08d3?{_Q}",
    ],
}


def _get_image(category_slug, index):
    imgs = CATEGORY_IMAGES.get(category_slug, [])
    if not imgs:
        return None
    return imgs[index % len(imgs)]


def seed():
    db = SessionLocal()
    try:
        existing_slugs = {c.slug for c in db.query(Category.slug).all()}
        added_cats = 0
        added_services = 0
        updated_images = 0

        for cat_data in CATEGORIES:
            slug = cat_data["slug"]

            if slug in existing_slugs:
                cat = db.query(Category).filter(Category.slug == slug).first()
                if cat and not cat.image and slug in CATEGORY_COVER:
                    cat.image = CATEGORY_COVER[slug]
            else:
                cat = Category(
                    id=str(uuid.uuid4()),
                    name=cat_data["name"],
                    slug=slug,
                    description=cat_data["description"],
                    icon=ICONS.get(slug, "brush"),
                    color=COLORS.get(slug, "#6b7280"),
                    image=CATEGORY_COVER.get(slug),
                    service_count=0,
                )
                db.add(cat)
                db.flush()
                added_cats += 1

            existing_svc_slugs = {
                s[0]
                for s in db.query(Service.slug)
                .filter(Service.category_id == cat.id)
                .all()
            }

            svc_count = 0
            for idx, svc in enumerate(cat_data["services"]):
                name, desc, price, dur, popular, trending, tags = svc
                svc_slug = name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-").replace("&", "and")
                svc_slug = f"{svc_slug}-{slug}"

                if svc_slug in existing_svc_slugs:
                    continue

                db.add(Service(
                    id=str(uuid.uuid4()),
                    name=name,
                    slug=svc_slug,
                    description=desc,
                    category_id=cat.id,
                    image=_get_image(slug, idx),
                    base_price=float(price),
                    duration=dur,
                    rating=round(random.uniform(3.8, 5.0), 1),
                    review_count=random.randint(5, 120),
                    popular=popular,
                    trending=trending,
                    tags=tags,
                ))
                svc_count += 1

            cat.service_count = db.query(Service).filter(Service.category_id == cat.id).count() + svc_count
            added_services += svc_count

        for cat_data in CATEGORIES:
            slug = cat_data["slug"]
            cat = db.query(Category).filter(Category.slug == slug).first()
            if not cat:
                continue
            null_img_svcs = (
                db.query(Service)
                .filter(Service.category_id == cat.id, Service.image.is_(None))
                .all()
            )
            for idx, svc in enumerate(null_img_svcs):
                svc.image = _get_image(slug, idx)
                updated_images += 1

        db.commit()
        print(f"Seed complete: {added_cats} categories added, {added_services} services added, {updated_images} service images backfilled.")

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
