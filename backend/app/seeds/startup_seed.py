"""
Unified startup seed — called automatically when the server starts.

Creates tables (init_db) and populates:
  - 25 categories with Unsplash images
  - ~140 services with Unsplash images
  - Demo users (customers, workers, admin)
  - Demo bookings and coupons

Idempotent: safe to call on every restart.
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path

from loguru import logger

from app.db.database import init_db, SessionLocal
from app.core.config import settings


def _ensure_upload_dirs():
    """Create all upload subdirectories so static mount never fails."""
    folders = ["profile", "problem", "portfolio", "certificate", "service", "category", "general", "avatars"]
    base = Path(settings.UPLOAD_DIR)
    for f in folders:
        (base / f).mkdir(parents=True, exist_ok=True)


def _seed_categories_and_services(db) -> tuple[int, int]:
    """Seed 25 categories and ~140 services. Returns (cats_added, svcs_added)."""
    from app.models.category import Category
    from app.models.service import Service

    existing_slugs = {row[0] for row in db.query(Category.slug).all()}
    added_cats = 0
    added_svcs = 0

    _U = "https://images.unsplash.com"
    _Q = "w=400&h=300&fit=crop&q=80"

    CATEGORY_IMAGES = {
        "plumbing": f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
        "electrical": f"{_U}/photo-1544724107-6d5c4caaff30?{_Q}",
        "ac-repair": f"{_U}/photo-1631538537798-f090f2d10a6e?{_Q}",
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
        "beauty-at-home": f"{_U}/photo-1544161515-4ab6ce6db874?{_Q}",
        "spa-massage": f"{_U}/photo-1544161515-4ab6ce6db874?{_Q}",
        "cooking-home-chef": f"{_U}/photo-1556910103-1c02745aae4d?{_Q}",
        "home-tutor": f"{_U}/photo-1503676260728-1c00da094a0b?{_Q}",
        "babysitting": f"{_U}/photo-1504439468489-c8920d796a29?{_Q}",
        "elder-care": f"{_U}/photo-1576765608846-351a1e832a65?{_Q}",
        "pet-care": f"{_U}/photo-1587300003388-59208cc962cb?{_Q}",
        "laundry": f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
        "car-wash": f"{_U}/photo-1520340356584-f9917d7ed2f5?{_Q}",
    }

    SVC_IMAGES = {
        "plumbing": [
            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
            f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
            f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
        ],
        "electrical": [
            f"{_U}/photo-1544724107-6d5c4caaff30?{_Q}",
            f"{_U}/photo-1513506003901-1e6a229e2d15?{_Q}",
            f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
        ],
        "ac-repair": [
            f"{_U}/photo-1631538537798-f090f2d10a6e?{_Q}",
            f"{_U}/photo-1585338107529-13af1e580490?{_Q}",
            f"{_U}/photo-1562281302-809108fd533c?{_Q}",
        ],
        "cleaning": [
            f"{_U}/photo-1581578731548-c64695cc6952?{_Q}",
            f"{_U}/photo-1628177142898-93e36e4e3a50?{_Q}",
            f"{_U}/photo-1527515637462-cff94eecc1ac?{_Q}",
        ],
        "default": [
            f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
            f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
            f"{_U}/photo-1558618666-fcd25c85f82e?{_Q}",
        ],
    }

    CATEGORIES = [
        ("Plumbing", "plumbing", "wrench", "#3b82f6", "Professional plumbing services for homes and offices", [
            ("Pipe Repair", "Fix leaking or burst pipes quickly", 499, 60, True, False, ["pipe", "leak", "repair"]),
            ("Drain Cleaning", "Unclog drains and remove blockages", 399, 45, True, True, ["drain", "clog", "cleaning"]),
            ("Faucet Installation", "Install or replace faucets and fittings", 599, 40, False, False, ["faucet", "install"]),
            ("Toilet Repair", "Repair running or clogged toilets", 449, 50, False, False, ["toilet", "repair"]),
            ("Water Tank Cleaning", "Deep clean overhead and underground tanks", 699, 90, False, True, ["tank", "cleaning"]),
            ("Bathroom Fitting", "Complete bathroom fixture installation", 1299, 120, False, False, ["bathroom", "fitting"]),
            ("Geyser Installation", "Install and service water geysers", 799, 60, False, False, ["geyser", "install"]),
            ("Kitchen Sink Repair", "Fix kitchen sink drainage and leaks", 449, 45, False, False, ["kitchen", "sink"]),
        ]),
        ("Electrical", "electrical", "zap", "#f59e0b", "Licensed electricians for all your electrical needs", [
            ("Wiring Repair", "Fix faulty wiring and short circuits", 599, 60, True, False, ["wiring", "repair"]),
            ("Switch Board Repair", "Repair or replace switch boards", 399, 30, False, False, ["switch", "board"]),
            ("Fan Installation", "Install ceiling and wall fans", 299, 30, True, False, ["fan", "install"]),
            ("Light Installation", "Install lights, chandeliers, and LED panels", 349, 30, False, True, ["light", "led"]),
            ("MCB Tripping Fix", "Diagnose and fix MCB tripping issues", 499, 45, False, False, ["mcb", "electrical"]),
            ("Generator Service", "Service and repair home generators", 899, 90, False, False, ["generator", "service"]),
            ("Inverter Installation", "Install inverters and battery backup", 699, 60, False, False, ["inverter", "battery"]),
        ]),
        ("AC Repair", "ac-repair", "wind", "#0ea5e9", "Expert AC installation, servicing, and repair", [
            ("AC Servicing", "Complete AC gas check and servicing", 599, 45, True, True, ["ac", "service"]),
            ("AC Installation", "Split and window AC installation", 899, 60, True, False, ["ac", "install"]),
            ("AC Gas Refill", "Refill AC refrigerant gas", 999, 40, False, False, ["ac", "gas"]),
            ("AC Repair", "Fix cooling issues and compressor problems", 799, 60, False, True, ["ac", "repair"]),
            ("AC Deep Cleaning", "Deep clean AC filters and coils", 699, 50, False, False, ["ac", "cleaning"]),
        ]),
        ("Cleaning", "cleaning", "sparkles", "#10b981", "Professional home and office cleaning services", [
            ("Deep Home Cleaning", "Full home deep cleaning with sanitization", 1499, 180, True, True, ["home", "clean"]),
            ("Bathroom Cleaning", "Intensive bathroom and toilet cleaning", 499, 60, True, False, ["bathroom", "clean"]),
            ("Kitchen Cleaning", "Degrease and deep clean kitchen", 599, 75, False, False, ["kitchen", "clean"]),
            ("Sofa Cleaning", "Professional sofa and upholstery cleaning", 799, 90, False, True, ["sofa", "clean"]),
            ("Carpet Cleaning", "Steam clean carpets and rugs", 699, 60, False, False, ["carpet", "steam"]),
            ("Office Cleaning", "Regular and deep cleaning for offices", 1999, 240, False, False, ["office", "clean"]),
            ("Window Cleaning", "Clean windows, grills, and tracks", 599, 60, False, False, ["window", "glass"]),
        ]),
        ("Home Painting", "home-painting", "paintbrush", "#8b5cf6", "Interior and exterior painting by skilled painters", [
            ("Room Painting", "Paint a single room with primer and finish", 2499, 240, True, True, ["room", "paint"]),
            ("Full Home Painting", "Paint entire home interior", 8999, 720, True, False, ["home", "paint"]),
            ("Exterior Painting", "Paint building exterior walls", 4999, 480, False, False, ["exterior", "wall"]),
            ("Texture Work", "Apply texture finishes on walls", 1999, 180, False, False, ["texture", "wall"]),
            ("Waterproof Painting", "Waterproof paint for terraces and walls", 3499, 360, False, False, ["waterproof", "paint"]),
            ("Wood Polish", "Polish and paint wooden furniture", 999, 120, False, False, ["wood", "polish"]),
        ]),
        ("Carpentry", "carpentry", "hammer", "#d97706", "Custom woodwork, furniture repair, and installations", [
            ("Furniture Repair", "Fix broken chairs, tables, and beds", 599, 60, True, False, ["furniture", "repair"]),
            ("Door Installation", "Install wooden doors and frames", 899, 90, True, False, ["door", "install"]),
            ("Shelf Installation", "Install wall shelves and cabinets", 499, 45, False, False, ["shelf", "install"]),
            ("Wardrobe Repair", "Fix wardrobe doors, hinges, and drawers", 699, 60, False, False, ["wardrobe", "repair"]),
            ("Window Frame Repair", "Repair or replace window frames", 799, 75, False, False, ["window", "frame"]),
            ("Custom Woodwork", "Build custom wooden fixtures", 1999, 240, False, True, ["custom", "woodwork"]),
        ]),
        ("Pest Control", "pest-control", "bug", "#ef4444", "Safe and effective pest elimination for homes", [
            ("General Pest Control", "Treat cockroaches, ants, and spiders", 799, 60, True, True, ["pest", "cockroach"]),
            ("Termite Treatment", "Anti-termite treatment for wooden furniture", 1499, 120, True, False, ["termite", "treatment"]),
            ("Mosquito Fogging", "Outdoor mosquito fogging and repellent", 999, 45, False, False, ["mosquito", "fogging"]),
            ("Bed Bug Treatment", "Eliminate bed bugs from mattresses", 1299, 90, False, True, ["bed-bug", "treatment"]),
            ("Rat Control", "Trap and eliminate rats and mice", 899, 60, False, False, ["rat", "rodent"]),
        ]),
        ("Appliance Repair", "appliance-repair", "settings", "#6b7280", "Repair and service all home appliances", [
            ("Mixer Grinder Repair", "Fix mixer grinders and juicers", 399, 45, True, False, ["mixer", "grinder"]),
            ("Iron Repair", "Fix steam and dry irons", 299, 30, False, False, ["iron", "steam"]),
            ("Water Purifier Service", "Service and filter replacement for RO", 599, 45, True, True, ["ro", "purifier"]),
            ("Microwave Repair", "Fix microwave oven heating issues", 699, 60, False, False, ["microwave", "repair"]),
            ("Fan Repair", "Repair ceiling, table, and exhaust fans", 399, 40, False, False, ["fan", "repair"]),
            ("Printer Repair", "Fix printer jams and connectivity issues", 499, 45, False, False, ["printer", "repair"]),
        ]),
        ("Refrigerator Repair", "refrigerator-repair", "refrigerator", "#06b6d4", "Expert refrigerator repair and gas charging", [
            ("Fridge Not Cooling", "Fix cooling issues in fridges", 699, 60, True, True, ["fridge", "cooling"]),
            ("Fridge Gas Charging", "Refrigerant gas top-up and leak repair", 999, 45, True, False, ["fridge", "gas"]),
            ("Compressor Repair", "Fix or replace fridge compressor", 1499, 90, False, False, ["compressor", "fridge"]),
            ("Fridge Thermostat Fix", "Replace faulty thermostat sensors", 599, 40, False, False, ["thermostat", "fridge"]),
            ("Water Dispenser Repair", "Fix fridge water and ice dispenser", 599, 45, False, False, ["dispenser", "fridge"]),
        ]),
        ("Washing Machine Repair", "washing-machine-repair", "droplets", "#6366f1", "All types of washing machine repair and service", [
            ("WM Not Draining", "Fix drainage and pump issues", 599, 45, True, True, ["washing-machine", "drain"]),
            ("WM Drum Repair", "Repair or replace washing machine drum", 999, 90, False, False, ["drum", "washing-machine"]),
            ("WM Spin Fix", "Fix spin cycle and vibration issues", 499, 40, True, False, ["spin", "vibration"]),
            ("WM Belt Replacement", "Replace worn-out drive belts", 599, 45, False, False, ["belt", "replace"]),
            ("WM Full Service", "Complete washing machine deep service", 799, 60, False, True, ["washing-machine", "service"]),
        ]),
        ("TV Repair", "tv-repair", "tv", "#475569", "LED, LCD, Smart TV, and home theatre repair", [
            ("LED TV Repair", "Fix display, sound, and power issues", 799, 60, True, True, ["led", "tv"]),
            ("Smart TV Software Fix", "Fix app crashes and OS issues", 599, 45, False, False, ["smart-tv", "software"]),
            ("TV Wall Mounting", "Mount TV on wall with cable management", 499, 30, True, False, ["tv", "wall-mount"]),
            ("Home Theatre Setup", "Set up and configure home theatre systems", 999, 60, False, False, ["home-theatre", "setup"]),
            ("TV Panel Replacement", "Replace damaged TV display panels", 2999, 120, False, False, ["panel", "tv"]),
        ]),
        ("RO Water Purifier", "ro-water-purifier", "waves", "#2563eb", "RO installation, repair, and filter replacement", [
            ("RO Service", "Complete RO purifier service and check-up", 499, 45, True, True, ["ro", "service"]),
            ("RO Filter Change", "Replace RO, UF, and carbon filters", 699, 30, True, False, ["ro", "filter"]),
            ("RO Installation", "Install new RO water purifier", 799, 60, False, False, ["ro", "install"]),
            ("RO Leak Repair", "Fix water leakage from RO units", 399, 30, False, False, ["ro", "leak"]),
            ("UV Bulb Replacement", "Replace UV lamp in RO purifiers", 499, 20, False, False, ["uv", "bulb"]),
        ]),
        ("CCTV Installation", "cctv-installation", "cctv", "#dc2626", "CCTV camera installation and maintenance", [
            ("CCTV Camera Installation", "Install 2-4 camera CCTV system", 2999, 180, True, True, ["cctv", "camera"]),
            ("CCTV Camera Repair", "Fix camera, DVR, and connectivity issues", 799, 60, False, False, ["cctv", "repair"]),
            ("DVR Setup", "Set up DVR for remote viewing", 599, 60, False, False, ["dvr", "setup"]),
            ("Night Vision Camera", "Install night vision and IR cameras", 3499, 180, False, False, ["night-vision", "camera"]),
            ("CCTV Annual Maintenance", "Yearly maintenance contract for CCTV", 1999, 120, False, False, ["cctv", "maintenance"]),
        ]),
        ("Interior Design", "interior-design", "sofa", "#ec4899", "Transform your space with expert interior designers", [
            ("Living Room Design", "Complete living room interior makeover", 9999, 1440, True, True, ["living-room", "interior"]),
            ("Bedroom Design", "Bedroom interior with wardrobes and lighting", 7999, 1200, True, False, ["bedroom", "interior"]),
            ("Modular Kitchen", "Design and install modular kitchen", 14999, 2160, False, True, ["kitchen", "modular"]),
            ("Space Planning", "Optimize room layout and space utilization", 2999, 240, False, False, ["space", "planning"]),
            ("False Ceiling", "Install false ceiling with LED lighting", 4999, 480, False, False, ["ceiling", "led"]),
        ]),
        ("Home Shifting", "home-shifting", "truck", "#14b8a6", "Pack, move, and unpack with trained professionals", [
            ("Local Shifting", "Within-city home shifting with packing", 3999, 360, True, True, ["local", "shifting"]),
            ("Office Shifting", "Relocate office equipment safely", 5999, 360, True, False, ["office", "shifting"]),
            ("Single Room Shifting", "Shift a single room contents", 1499, 180, False, False, ["single-room", "shifting"]),
            ("Packing Only", "Professional packing with materials", 999, 120, False, False, ["packing", "materials"]),
            ("Furniture Moving", "Move heavy furniture safely", 1999, 120, False, True, ["furniture", "moving"]),
        ]),
        ("Gardening", "gardening", "flower2", "#22c55e", "Garden maintenance, landscaping, and plant care", [
            ("Garden Maintenance", "Regular garden trimming, weeding, and care", 699, 90, True, True, ["garden", "maintenance"]),
            ("Lawn Mowing", "Professional lawn mowing and edging", 499, 60, True, False, ["lawn", "mowing"]),
            ("Planting Service", "Plant new flowers, shrubs, and trees", 799, 90, False, False, ["planting", "flowers"]),
            ("Garden Cleanup", "Seasonal garden cleanup and composting", 599, 60, False, False, ["garden", "cleanup"]),
            ("Irrigation Setup", "Install drip irrigation and sprinkler systems", 2999, 240, False, False, ["irrigation", "sprinkler"]),
        ]),
        ("Beauty at Home", "beauty-at-home", "heart", "#d946ef", "Parlour-quality beauty services at your doorstep", [
            ("Full Body Massage", "Relaxing full body massage therapy", 1299, 60, True, True, ["massage", "body"]),
            ("Facial & Cleanup", "Gold, diamond, or fruit facial treatment", 599, 45, True, False, ["facial", "cleanup"]),
            ("Hair Styling", "Hair cut, styling, and treatment", 499, 45, False, False, ["hair", "styling"]),
            ("Manicure & Pedicure", "Complete nail care treatment", 699, 60, False, True, ["manicure", "nails"]),
            ("Waxing Service", "Full body or half body waxing", 799, 60, False, False, ["waxing", "body"]),
            ("Bridal Makeup", "Complete bridal makeup and styling", 4999, 240, False, False, ["bridal", "makeup"]),
        ]),
        ("Spa & Massage", "spa-massage", "heart-pulse", "#f472b6", "Professional therapeutic massage and spa treatments", [
            ("Swedish Massage", "Gentle full body relaxation massage", 1499, 60, True, True, ["swedish", "massage"]),
            ("Deep Tissue Massage", "Therapeutic deep tissue pain relief", 1799, 60, True, False, ["deep-tissue", "pain"]),
            ("Thai Massage", "Traditional Thai stretching massage", 1699, 75, False, True, ["thai", "stretching"]),
            ("Aromatherapy", "Essential oil aromatherapy massage", 1999, 60, False, False, ["aromatherapy", "oil"]),
            ("Head & Shoulder Massage", "Targeted tension relief massage", 599, 30, False, False, ["head", "shoulder"]),
        ]),
        ("Cooking / Home Chef", "cooking-home-chef", "chef-hat", "#f97316", "Hire a professional chef for events and daily meals", [
            ("Party Catering", "Full meal catering for events and parties", 4999, 360, True, True, ["party", "catering"]),
            ("Daily Tiffin Service", "Home-cooked meal delivery daily", 2999, 30, True, False, ["tiffin", "daily"]),
            ("Special Diet Meals", "Custom diet meals (keto, vegan, etc.)", 1999, 120, False, False, ["diet", "keto"]),
            ("Festival Special Cooking", "Festive meals and sweets preparation", 2499, 240, False, True, ["festival", "sweets"]),
            ("BBQ & Grill Service", "Outdoor BBQ and grilling setup", 3499, 180, False, False, ["bbq", "grill"]),
        ]),
        ("Home Tutor", "home-tutor", "graduation-cap", "#3b82f6", "Experienced tutors for all subjects and age groups", [
            ("Math Tutoring", "Personalized math coaching for all grades", 599, 60, True, True, ["math", "tutor"]),
            ("Science Tutoring", "Physics, Chemistry, and Biology tutoring", 599, 60, True, False, ["science", "physics"]),
            ("English Speaking", "English speaking and grammar improvement", 499, 60, False, True, ["english", "speaking"]),
            ("Board Exam Prep", "Intensive preparation for board exams", 799, 90, False, False, ["board-exam", "preparation"]),
            ("Programming Tutor", "Learn coding from beginner to advanced", 899, 60, False, False, ["programming", "coding"]),
        ]),
        ("Babysitting", "babysitting", "baby", "#f9a8d4", "Trusted and verified babysitters for your little ones", [
            ("Full Day Babysitting", "Professional childcare for a full day", 1499, 480, True, True, ["babysitting", "childcare"]),
            ("Evening Babysitting", "Evening care for 4-5 hours", 799, 240, True, False, ["babysitting", "evening"]),
            ("Newborn Care", "Specialized care for newborns", 1999, 480, False, False, ["newborn", "infant"]),
            ("Toddler Activities", "Engage toddlers with activities and play", 999, 240, False, False, ["toddler", "activities"]),
            ("Night Babysitting", "Overnight childcare service", 2499, 600, False, True, ["night", "overnight"]),
        ]),
        ("Elder Care", "elder-care", "heart-pulse", "#14b8a6", "Compassionate care services for senior citizens", [
            ("Senior Companion Care", "Daily companionship and assistance", 999, 360, True, True, ["senior", "companion"]),
            ("Post-Surgery Care", "Specialized post-operative care at home", 1499, 480, True, False, ["post-surgery", "recovery"]),
            ("Physiotherapy at Home", "Home visits by licensed physiotherapists", 899, 45, False, True, ["physiotherapy", "rehab"]),
            ("Medication Management", "Help with timely medication and reminders", 499, 60, False, False, ["medication", "reminder"]),
            ("Daily Routine Assistance", "Help with bathing, eating, and mobility", 799, 360, False, False, ["daily", "bathing"]),
        ]),
        ("Pet Care", "pet-care", "paw-print", "#eab308", "Grooming, walking, boarding, and vet visits for pets", [
            ("Dog Grooming", "Full grooming session for dogs", 799, 60, True, True, ["dog", "grooming"]),
            ("Pet Walking", "Professional dog walking service", 299, 60, True, False, ["dog", "walking"]),
            ("Pet Bathing", "Bath and coat care for cats and dogs", 499, 45, False, False, ["pet", "bath"]),
            ("Pet Sitting", "In-home pet care while you travel", 999, 480, False, True, ["pet-sitting", "travel"]),
            ("Vet Visit Escort", "Transport and accompany pet to vet", 499, 120, False, False, ["vet", "transport"]),
        ]),
        ("Laundry", "laundry", "shirt", "#38bdf8", "Doorstep pickup and delivery laundry service", [
            ("Wash & Fold", "Regular laundry washed, dried, and folded", 199, 120, True, True, ["laundry", "wash"]),
            ("Dry Cleaning", "Professional dry cleaning for delicate items", 399, 120, True, False, ["dry-cleaning", "formal"]),
            ("Ironing Service", "Professional pressing and ironing", 99, 60, False, False, ["ironing", "pressing"]),
            ("Stain Removal", "Specialized stain treatment", 299, 60, False, False, ["stain", "removal"]),
            ("Curtain Cleaning", "Deep clean curtains and sofa covers", 599, 120, False, True, ["curtain", "deep-clean"]),
        ]),
        ("Car Wash", "car-wash", "car", "#2563eb", "Doorstep car washing, detailing, and polishing", [
            ("Exterior Car Wash", "Waterless or foam exterior wash", 299, 30, True, True, ["car", "exterior"]),
            ("Full Car Detailing", "Complete interior + exterior detailing", 1499, 120, True, False, ["detailing", "interior"]),
            ("Interior Cleaning", "Deep clean car interior and dashboard", 599, 45, False, False, ["interior", "cleaning"]),
            ("Car Polishing", "Paint correction and wax coat", 799, 60, False, True, ["polishing", "wax"]),
            ("Engine Bay Cleaning", "Safe engine bay degrease and wash", 499, 30, False, False, ["engine", "bay"]),
        ]),
    ]

    for name, slug, icon, color, desc, services in CATEGORIES:
        if slug in existing_slugs:
            cat = db.query(Category).filter(Category.slug == slug).first()
        else:
            cat = Category(
                id=str(uuid.uuid4()),
                name=name,
                slug=slug,
                description=desc,
                icon=icon,
                color=color,
                image=CATEGORY_IMAGES.get(slug),
                service_count=0,
            )
            db.add(cat)
            db.flush()
            added_cats += 1

        existing_svc_slugs = {
            s[0] for s in db.query(Service.slug).filter(Service.category_id == cat.id).all()
        }

        svc_count = 0
        imgs = SVC_IMAGES.get(slug, SVC_IMAGES["default"])
        for idx, (svc_name, svc_desc, price, dur, popular, trending, tags) in enumerate(services):
            svc_slug = svc_name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-").replace("&", "and")
            svc_slug = f"{svc_slug}-{slug}"
            if svc_slug in existing_svc_slugs:
                continue

            db.add(Service(
                id=str(uuid.uuid4()),
                name=svc_name,
                slug=svc_slug,
                description=svc_desc,
                category_id=cat.id,
                image=imgs[idx % len(imgs)],
                base_price=float(price),
                duration=dur,
                rating=round(random.uniform(3.8, 5.0), 1),
                review_count=random.randint(5, 120),
                popular=popular,
                trending=trending,
                tags=tags,
            ))
            svc_count += 1

        cat.service_count = db.query(Service).filter(Service.category_id == cat.id).count()
        added_svcs += svc_count

    # Backfill any services missing images
    for name, slug, *_rest in [(c[0], c[1]) for c in CATEGORIES]:
        cat = db.query(Category).filter(Category.slug == slug).first()
        if not cat:
            continue
        null_svcs = db.query(Service).filter(Service.category_id == cat.id, Service.image.is_(None)).all()
        imgs = SVC_IMAGES.get(slug, SVC_IMAGES["default"])
        for idx, svc in enumerate(null_svcs):
            svc.image = imgs[idx % len(imgs)]

    all_cats = db.query(Category).all()
    for cat in all_cats:
        cat.service_count = db.query(Service).filter(Service.category_id == cat.id).count()

    db.commit()
    return added_cats, added_svcs


def _seed_demo_data(db) -> dict:
    """Seed demo users, workers, bookings, and coupons. Returns summary dict."""
    from app.models.user import User, UserRole
    from app.models.customer import Customer
    from app.models.worker import Worker
    from app.models.worker_location import WorkerLocation
    from app.models.category import Category
    from app.models.service import Service
    from app.models.booking import Booking
    from app.models.coupon import Coupon
    from app.models.wallet import Wallet
    from app.core.security import get_password_hash

    counts = {"users": 0, "workers": 0, "bookings": 0, "coupons": 0}

    # Check if demo data already exists
    if db.query(Category).filter(Category.slug == "plumbing").first() is None:
        return counts

    if db.query(User).filter(User.email == "alice@demo.com").first():
        return counts  # Demo data already seeded

    pw = get_password_hash("password123")
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Customers
    customers = []
    for email, name in [("alice@demo.com", "Alice Johnson"), ("bob@demo.com", "Bob Williams")]:
        u = User(email=email, phone=None, password_hash=pw, role=UserRole.CUSTOMER, is_active=True, is_verified=True)
        db.add(u)
        db.flush()
        c = Customer(user_id=u.id, name=name, address={"city": "Bangalore", "state": "Karnataka"})
        db.add(c)
        db.flush()
        customers.append(c)
        db.add(Wallet(user_id=u.id))
        counts["users"] += 1

    # Workers
    worker_data = [
        ("Ravi Kumar", "Plumber", "plumbing", 4.8, 7, 35.0, (12.9716, 77.5946)),
        ("Suresh Reddy", "Electrician", "electrical", 4.6, 5, 30.0, (12.9750, 77.5980)),
        ("Priya Sharma", "Cleaner", "cleaning", 4.9, 4, 25.0, (12.9800, 77.5850)),
        ("Arjun Nair", "AC Tech", "ac-repair", 4.3, 3, 40.0, (12.9850, 77.5900)),
    ]

    cats = {}
    for slug in ["plumbing", "electrical", "cleaning", "ac-repair"]:
        c = db.query(Category).filter(Category.slug == slug).first()
        if c:
            cats[slug] = c

    workers = []
    for wname, prof, cat_slug, rating, exp, rate, (lat, lng) in worker_data:
        u = User(
            email=f"{wname.split()[0].lower()}@demo.com",
            phone=None,
            password_hash=pw,
            role=UserRole.WORKER,
            is_active=True,
            is_verified=True,
        )
        db.add(u)
        db.flush()
        cat_id = cats[cat_slug].id if cat_slug in cats else None
        w = Worker(
            user_id=u.id,
            name=wname,
            profession=prof,
            bio=f"Experienced {prof.lower()} with {exp}+ years in Bangalore.",
            experience_years=exp,
            completed_jobs=exp * 12,
            rating=rating,
            review_count=int(rating * 10),
            hourly_rate=rate,
            is_online=True,
            category_ids=[cat_id] if cat_id else [],
        )
        db.add(w)
        db.flush()
        loc = WorkerLocation(worker_id=w.id, latitude=lat, longitude=lng)
        db.add(loc)
        workers.append(w)
        db.add(Wallet(user_id=u.id))
        counts["workers"] += 1
        counts["users"] += 1

    # Admin user
    admin_user = User(
        email="admin@demo.com",
        phone=None,
        password_hash=pw,
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin_user)
    db.flush()
    from app.models.admin import Admin
    db.add(Admin(user_id=admin_user.id, name="Admin User"))
    db.add(Wallet(user_id=admin_user.id))
    counts["users"] += 1

    # Bookings
    svcs = {}
    for slug_part in ["pipe-repair-plumbing", "switch-board-repair-electrical", "deep-home-cleaning-cleaning", "ac-servicing-ac-repair"]:
        svc = db.query(Service).filter(Service.slug == slug_part).first()
        if svc:
            svcs[slug_part] = svc

    addr = {
        "line1": "42 MG Road", "city": "Bangalore",
        "state": "Karnataka", "postalCode": "560001", "country": "India",
        "lat": 12.9758, "lng": 77.5960,
    }

    if svcs.get("pipe-repair-plumbing") and len(customers) >= 1 and len(workers) >= 1:
        b1 = Booking(
            customer_id=customers[0].id,
            worker_id=workers[0].id,
            service_id=svcs["pipe-repair-plumbing"].id,
            status="completed",
            payment_status="paid",
            payment_method="card",
            problem_description="Kitchen sink pipe is leaking badly under the cabinet.",
            problem_images=[],
            scheduled_date="2026-07-20",
            scheduled_time="10:00",
            address=addr,
            price=499,
            final_price=499,
            eta_minutes=15,
            distance_km=2.3,
        )
        db.add(b1)
        counts["bookings"] += 1

    if svcs.get("switch-fix-electrical") and len(customers) >= 2 and len(workers) >= 2:
        b2 = Booking(
            customer_id=customers[1].id,
            worker_id=workers[1].id,
            service_id=svcs["switch-fix-electrical"].id,
            status="pending",
            payment_status="unpaid",
            payment_method="upi",
            problem_description="Bedroom light switch not working -- no power to the socket.",
            problem_images=[],
            scheduled_date="2026-07-28",
            scheduled_time="14:30",
            address=addr,
            price=399,
            final_price=399,
        )
        db.add(b2)
        counts["bookings"] += 1

    # Coupons
    if not db.query(Coupon).filter(Coupon.code == "SAVE10").first():
        db.add(Coupon(
            code="SAVE10", title="Save 10%", description="10% off on any service",
            type="percent", value=10.0, max_discount=20.0, min_order=25.0,
            valid_from=now, valid_until=now + timedelta(days=90),
            usage_limit=100, is_active=True,
        ))
        db.add(Coupon(
            code="NEWUSER", title="New User 15%", description="15% off for first booking",
            type="percent", value=15.0, max_discount=30.0, min_order=20.0,
            valid_from=now, valid_until=now + timedelta(days=180),
            usage_limit=500, is_active=True,
        ))
        counts["coupons"] = 2

    db.commit()
    return counts


def run_startup_seed():
    """
    Main entry point — called from main.py lifespan.
    Creates tables and ensures all data is populated.
    """
    logger.info("Running startup seed...")

    # 1. Ensure upload directories exist
    _ensure_upload_dirs()

    # 2. Create all tables
    init_db()
    logger.info("Database tables created/verified")

    # 3. Seed categories and services
    db = SessionLocal()
    try:
        cats_added, svcs_added = _seed_categories_and_services(db)
        if cats_added or svcs_added:
            logger.info(f"Seed: {cats_added} categories, {svcs_added} services added")
        else:
            logger.info("Categories and services already populated")
    except Exception as e:
        logger.error(f"Category/service seed error: {e}")
        db.rollback()
    finally:
        db.close()

    # 4. Seed demo data
    db = SessionLocal()
    try:
        from app.models.category import Category
        cat_count = db.query(Category).count()
        if cat_count > 0:
            counts = _seed_demo_data(db)
            if any(v > 0 for v in counts.values()):
                logger.info(f"Demo seed: {counts}")
            else:
                logger.info("Demo data already populated")
        else:
            logger.warning("No categories found — skipping demo seed")
    except Exception as e:
        logger.error(f"Demo seed error: {e}")
        db.rollback()
    finally:
        db.close()

    logger.info("Startup seed complete")


if __name__ == "__main__":
    run_startup_seed()
