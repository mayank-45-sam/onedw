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

_U = "https://images.unsplash.com"
_Q = "w=400&h=300&fit=crop&q=80"


def _ensure_upload_dirs():
    """Create all upload subdirectories so static mount never fails."""
    folders = ["profile", "problem", "portfolio", "certificate", "service", "category", "general", "avatars",
               "verification", "assessment", "voice", "certificates"]
    base = Path(settings.UPLOAD_DIR)
    for f in folders:
        (base / f).mkdir(parents=True, exist_ok=True)


SERVICE_IMAGE_MAP = {
    # ── Plumbing ──
    "Pipe Repair":            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
    "Drain Cleaning":         f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
    "Faucet Installation":    f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
    "Toilet Repair":          f"{_U}/photo-1607472586893-edb57bdc0e39?{_Q}",
    "Water Tank Cleaning":    f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
    "Bathroom Fitting":       f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
    "Geyser Installation":    f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    "Kitchen Sink Repair":    f"{_U}/photo-1558618666-fcd25c85f82e?{_Q}",
    # ── Electrical ──
    "Wiring Repair":          f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
    "Switch Board Repair":    f"{_U}/photo-1513506003901-1e6a229e2d15?{_Q}",
    "Fan Installation":       f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
    "Light Installation":     f"{_U}/photo-1497366216548-37526070297c?{_Q}",
    "MCB Tripping Fix":       f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    "Generator Service":      f"{_U}/photo-1620714223084-8fcacc6dfd8d?{_Q}",
    "Inverter Installation":  f"{_U}/photo-1504280390367-361c6d9f38f4?{_Q}",
    # ── AC Repair ──
    "AC Servicing":           f"{_U}/photo-1621905252507-b35492cc74b4?{_Q}",
    "AC Installation":        f"{_U}/photo-1585771724684-38269d6639fd?{_Q}",
    "AC Gas Refill":          f"{_U}/photo-1562281302-809108fd533c?{_Q}",
    "AC Repair":              f"{_U}/photo-1504215680853-026ed2a45def?{_Q}",
    "AC Deep Cleaning":       f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
    # ── Cleaning ──
    "Deep Home Cleaning":     f"{_U}/photo-1581578731548-c64695cc6952?{_Q}",
    "Bathroom Cleaning":      f"{_U}/photo-1628177142898-93e36e4e3a50?{_Q}",
    "Kitchen Cleaning":       f"{_U}/photo-1527515637462-cff94eecc1ac?{_Q}",
    "Sofa Cleaning":          f"{_U}/photo-1584820927498-cfe5211fd8bf?{_Q}",
    "Carpet Cleaning":        f"{_U}/photo-1497366811353-6870744d04b2?{_Q}",
    "Office Cleaning":        f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    "Window Cleaning":        f"{_U}/photo-1558317374-067fb5f30001?{_Q}",
    # ── Home Painting ──
    "Room Painting":          f"{_U}/photo-1589939705384-5185137a7f0f?{_Q}",
    "Full Home Painting":     f"{_U}/photo-1562281302-809108fd533c?{_Q}",
    "Exterior Painting":      f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
    "Texture Work":           f"{_U}/photo-1560448204-e02f11c3d0e2?{_Q}",
    "Waterproof Painting":    f"{_U}/photo-1517816428104-797678c7cf0c?{_Q}",
    "Wood Polish":            f"{_U}/photo-1416339442236-8ceb164046f8?{_Q}",
    # ── Carpentry ──
    "Furniture Repair":       f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
    "Door Installation":      f"{_U}/photo-1504148455328-c376907d081c?{_Q}",
    "Shelf Installation":     f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
    "Wardrobe Repair":        f"{_U}/photo-1595515106969-1ce29566ff1c?{_Q}",
    "Window Frame Repair":    f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
    "Custom Woodwork":        f"{_U}/photo-1416339442236-8ceb164046f8?{_Q}",
    # ── Pest Control ──
    "General Pest Control":   f"{_U}/photo-1574362848149-11496d93a7c7?{_Q}",
    "Termite Treatment":      f"{_U}/photo-1615963244664-5b845b2025ee?{_Q}",
    "Mosquito Fogging":       f"{_U}/photo-1506748686214-e9df14d4d9d0?{_Q}",
    "Bed Bug Treatment":      f"{_U}/photo-1585320806297-9794b3e4eeae?{_Q}",
    "Rat Control":            f"{_U}/photo-1574362848149-11496d93a7c7?{_Q}",
    # ── Appliance Repair ──
    "Mixer Grinder Repair":   f"{_U}/photo-1556909114-f6e7ad7d3136?{_Q}",
    "Iron Repair":            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
    "Water Purifier Service": f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
    "Microwave Repair":       f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
    "Fan Repair":             f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    "Printer Repair":         f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
    # ── Refrigerator Repair ──
    "Fridge Not Cooling":     f"{_U}/photo-1571175443880-49e1d25b2bc5?{_Q}",
    "Fridge Gas Charging":    f"{_U}/photo-1584568694244-14fbdf83bd30?{_Q}",
    "Compressor Repair":      f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
    "Fridge Thermostat Fix":  f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    "Water Dispenser Repair": f"{_U}/photo-1501426026826-31c667bdf23d?{_Q}",
    # ── Washing Machine Repair ──
    "WM Not Draining":        f"{_U}/photo-1626806787461-102c1bfaaea1?{_Q}",
    "WM Drum Repair":         f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
    "WM Spin Fix":            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
    "WM Belt Replacement":    f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
    "WM Full Service":        f"{_U}/photo-1626806787461-102c1bfaaea1?{_Q}",
    # ── TV Repair ──
    "LED TV Repair":          f"{_U}/photo-1593784991095-a205069470b6?{_Q}",
    "Smart TV Software Fix":  f"{_U}/photo-1517816428104-797678c7cf0c?{_Q}",
    "TV Wall Mounting":       f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
    "Home Theatre Setup":     f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
    "TV Panel Replacement":   f"{_U}/photo-1593784991095-a205069470b6?{_Q}",
    # ── RO Water Purifier ──
    "RO Service":             f"{_U}/photo-1562281302-809108fd533c?{_Q}",
    "RO Filter Change":       f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
    "RO Installation":        f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
    "RO Leak Repair":         f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
    "UV Bulb Replacement":    f"{_U}/photo-1562281302-809108fd533c?{_Q}",
    # ── CCTV Installation ──
    "CCTV Camera Installation": f"{_U}/photo-1557862921-37829c790f19?{_Q}",
    "CCTV Camera Repair":     f"{_U}/photo-1527515545081-5db817172677?{_Q}",
    "DVR Setup":              f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
    "Night Vision Camera":    f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
    "CCTV Annual Maintenance": f"{_U}/photo-1557862921-37829c790f19?{_Q}",
    # ── Interior Design ──
    "Living Room Design":     f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
    "Bedroom Design":         f"{_U}/photo-1616486338812-3dadae4b4ace?{_Q}",
    "Modular Kitchen":        f"{_U}/photo-1616594039964-ae9021a400a0?{_Q}",
    "Space Planning":         f"{_U}/photo-1524758631624-e2822e304c36?{_Q}",
    "False Ceiling":          f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
    # ── Home Shifting ──
    "Local Shifting":         f"{_U}/photo-1600518464441-9154a4dea21b?{_Q}",
    "Office Shifting":        f"{_U}/photo-1586528116311-ad8dd3c8310d?{_Q}",
    "Single Room Shifting":   f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
    "Packing Only":           f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
    "Furniture Moving":       f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
    # ── Gardening ──
    "Garden Maintenance":     f"{_U}/photo-1416879595882-3373a0480b5b?{_Q}",
    "Lawn Mowing":            f"{_U}/photo-1585320806297-9794b3e4eeae?{_Q}",
    "Planting Service":       f"{_U}/photo-1466692476868-aef1dfb1e735?{_Q}",
    "Garden Cleanup":         f"{_U}/photo-1523348837708-15d4a09cfac2?{_Q}",
    "Irrigation Setup":       f"{_U}/photo-1416879595882-3373a0480b5b?{_Q}",
    # ── Beauty at Home ──
    "Full Body Massage":      f"{_U}/photo-1560066984-138dadb4c035?{_Q}",
    "Facial & Cleanup":       f"{_U}/photo-1570172619644-dfd03ed5d881?{_Q}",
    "Hair Styling":           f"{_U}/photo-1522337360788-8b13dee7a37e?{_Q}",
    "Manicure & Pedicure":    f"{_U}/photo-1604654894610-df63bc536371?{_Q}",
    "Waxing Service":         f"{_U}/photo-1516975080664-ed2fc6a32937?{_Q}",
    "Bridal Makeup":          f"{_U}/photo-1487412720507-e7ab37603c6f?{_Q}",
    # ── Spa & Massage ──
    "Swedish Massage":        f"{_U}/photo-1600334089648-b0d9d3028eb2?{_Q}",
    "Deep Tissue Massage":    f"{_U}/photo-1519823551278-64ac92734fb1?{_Q}",
    "Thai Massage":           f"{_U}/photo-1507003211169-0a1dd7228f2d?{_Q}",
    "Aromatherapy":           f"{_U}/photo-1544161515-4ab6ce6db874?{_Q}",
    "Head & Shoulder Massage": f"{_U}/photo-1600334089648-b0d9d3028eb2?{_Q}",
    # ── Cooking / Home Chef ──
    "Party Catering":         f"{_U}/photo-1556910103-1c02745aae4d?{_Q}",
    "Daily Tiffin Service":   f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
    "Special Diet Meals":     f"{_U}/photo-1512621776951-a57141f2eefd?{_Q}",
    "Festival Special Cooking": f"{_U}/photo-1555939594-58d7cb561ad1?{_Q}",
    "BBQ & Grill Service":    f"{_U}/photo-1556910103-1c02745aae4d?{_Q}",
    # ── Home Tutor ──
    "Math Tutoring":          f"{_U}/photo-1503676260728-1c00da094a0b?{_Q}",
    "Science Tutoring":       f"{_U}/photo-1532094349884-543bc11b234d?{_Q}",
    "English Speaking":       f"{_U}/photo-1456513080510-7bf3a84b82f8?{_Q}",
    "Board Exam Prep":        f"{_U}/photo-1523580846011-d3a5bc25702b?{_Q}",
    "Programming Tutor":      f"{_U}/photo-1461749280684-dccba630e2f6?{_Q}",
    # ── Babysitting ──
    "Full Day Babysitting":   f"{_U}/photo-1504439468489-c8920d796a29?{_Q}",
    "Evening Babysitting":    f"{_U}/photo-1515488042361-ee00e0ddd4e4?{_Q}",
    "Newborn Care":           f"{_U}/photo-1519689680058-324335c77eba?{_Q}",
    "Toddler Activities":     f"{_U}/photo-1503454537195-1dcabb73ffb9?{_Q}",
    "Night Babysitting":      f"{_U}/photo-1516627145497-ae6968895b74?{_Q}",
    # ── Elder Care ──
    "Senior Companion Care":  f"{_U}/photo-1579154204601-01588f351e67?{_Q}",
    "Post-Surgery Care":      f"{_U}/photo-1579684385127-1ef15d508118?{_Q}",
    "Physiotherapy at Home":  f"{_U}/photo-1576091160550-2173dba999ef?{_Q}",
    "Medication Management":  f"{_U}/photo-1584308666744-24d5c474f2ae?{_Q}",
    "Daily Routine Assistance": f"{_U}/photo-1579154204601-01588f351e67?{_Q}",
    # ── Pet Care ──
    "Dog Grooming":           f"{_U}/photo-1530281700549-e82e7bf110d6?{_Q}",
    "Pet Walking":            f"{_U}/photo-1543466835-00a7907e9de1?{_Q}",
    "Pet Bathing":            f"{_U}/photo-1601758228041-f3b2795255f1?{_Q}",
    "Pet Sitting":            f"{_U}/photo-1628009368231-7bb7cfcb0def?{_Q}",
    "Vet Visit Escort":       f"{_U}/photo-1587300003388-59208cc962cb?{_Q}",
    # ── Laundry ──
    "Wash & Fold":            f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
    "Dry Cleaning":           f"{_U}/photo-1545173168-9f1947eebb7f?{_Q}",
    "Ironing Service":        f"{_U}/photo-1527515637462-cff94eecc1ac?{_Q}",
    "Stain Removal":          f"{_U}/photo-1497366216548-37526070297c?{_Q}",
    "Curtain Cleaning":       f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
    # ── Car Wash ──
    "Exterior Car Wash":      f"{_U}/photo-1507136566006-cfc505b114fc?{_Q}",
    "Full Car Detailing":     f"{_U}/photo-1542362567-b07e54358753?{_Q}",
    "Interior Cleaning":      f"{_U}/photo-1489824904134-891ab64532f1?{_Q}",
    "Car Polishing":          f"{_U}/photo-1503376780353-7e6692767b70?{_Q}",
    "Engine Bay Cleaning":    f"{_U}/photo-1486262715619-67b85e0b08d3?{_Q}",
}


def _seed_categories_and_services(db) -> tuple[int, int]:
    """Seed 25 categories and ~140 services. Returns (cats_added, svcs_added)."""
    from app.models.category import Category
    from app.models.service import Service

    existing_slugs = {row[0] for row in db.query(Category.slug).all()}
    added_cats = 0
    added_svcs = 0

    CATEGORY_IMAGES = {
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
        "ro-water-purifier": f"{_U}/photo-1562281302-809108fd533c?{_Q}",
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
        "pet-care": f"{_U}/photo-1530281700549-e82e7bf110d6?{_Q}",
        "laundry": f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
        "car-wash": f"{_U}/photo-1507136566006-cfc505b114fc?{_Q}",
    }

    SVC_IMAGES = {
        "plumbing": [
            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
            f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
            f"{_U}/photo-1584622650111-993a426fbf0a?{_Q}",
            f"{_U}/photo-1607472586893-edb57bdc0e39?{_Q}",
            f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
            f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
            f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
            f"{_U}/photo-1558618666-fcd25c85f82e?{_Q}",
        ],
        "electrical": [
            f"{_U}/photo-1621905251918-48416bd8575a?{_Q}",
            f"{_U}/photo-1513506003901-1e6a229e2d15?{_Q}",
            f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
            f"{_U}/photo-1497366216548-37526070297c?{_Q}",
            f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
            f"{_U}/photo-1620714223084-8fcacc6dfd8d?{_Q}",
            f"{_U}/photo-1504280390367-361c6d9f38f4?{_Q}",
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
            f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
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
        ],
        "refrigerator-repair": [
            f"{_U}/photo-1571175443880-49e1d25b2bc5?{_Q}",
            f"{_U}/photo-1584568694244-14fbdf83bd30?{_Q}",
            f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
            f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
        ],
        "washing-machine-repair": [
            f"{_U}/photo-1626806787461-102c1bfaaea1?{_Q}",
            f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
            f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
        ],
        "tv-repair": [
            f"{_U}/photo-1593784991095-a205069470b6?{_Q}",
            f"{_U}/photo-1517816428104-797678c7cf0c?{_Q}",
            f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
            f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
        ],
        "ro-water-purifier": [
            f"{_U}/photo-1562281302-809108fd533c?{_Q}",
            f"{_U}/photo-1585704032915-c3400ca199e7?{_Q}",
            f"{_U}/photo-1504328345606-18bbc8c9d7d1?{_Q}",
            f"{_U}/photo-1513694203232-719a280e022f?{_Q}",
        ],
        "cctv-installation": [
            f"{_U}/photo-1557862921-37829c790f19?{_Q}",
            f"{_U}/photo-1527515545081-5db817172677?{_Q}",
            f"{_U}/photo-1588854337236-6889d631faa8?{_Q}",
            f"{_U}/photo-1558449028-b53a39d100fc?{_Q}",
        ],
        "interior-design": [
            f"{_U}/photo-1618221195710-dd6b41faaea6?{_Q}",
            f"{_U}/photo-1616486338812-3dadae4b4ace?{_Q}",
            f"{_U}/photo-1616594039964-ae9021a400a0?{_Q}",
            f"{_U}/photo-1524758631624-e2822e304c36?{_Q}",
        ],
        "home-shifting": [
            f"{_U}/photo-1600518464441-9154a4dea21b?{_Q}",
            f"{_U}/photo-1586528116311-ad8dd3c8310d?{_Q}",
            f"{_U}/photo-1504307651254-35680f356dfd?{_Q}",
            f"{_U}/photo-1621905251189-08b45d6a269e?{_Q}",
        ],
        "gardening": [
            f"{_U}/photo-1416879595882-3373a0480b5b?{_Q}",
            f"{_U}/photo-1585320806297-9794b3e4eeae?{_Q}",
            f"{_U}/photo-1466692476868-aef1dfb1e735?{_Q}",
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
        ],
        "pet-care": [
            f"{_U}/photo-1530281700549-e82e7bf110d6?{_Q}",
            f"{_U}/photo-1543466835-00a7907e9de1?{_Q}",
            f"{_U}/photo-1601758228041-f3b2795255f1?{_Q}",
            f"{_U}/photo-1628009368231-7bb7cfcb0def?{_Q}",
            f"{_U}/photo-1587300003388-59208cc962cb?{_Q}",
        ],
        "laundry": [
            f"{_U}/photo-1582735689369-4fe89db7114c?{_Q}",
            f"{_U}/photo-1545173168-9f1947eebb7f?{_Q}",
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
        "default": [
            f"{_U}/photo-1527515545081-5db817172677?{_Q}",
            f"{_U}/photo-1504674900247-0877df9cc836?{_Q}",
            f"{_U}/photo-1581578731548-c64695cc6952?{_Q}",
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
                image=SERVICE_IMAGE_MAP.get(svc_name, imgs[idx % len(imgs)]),
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
            svc.image = SERVICE_IMAGE_MAP.get(svc.name, imgs[idx % len(imgs)])

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

    # Workers — ~4 demo workers per category so every category search returns pros
    worker_data = [
        # plumbing
        ("Ravi Kumar", "Plumber", "plumbing", 4.8, 7, 35.0, (12.9716, 77.5946)),
        ("Amit Sharma", "Plumber", "plumbing", 4.2, 6, 28.0, (12.9680, 77.5880)),
        ("Vinod Raj", "Plumber", "plumbing", 3.9, 3, 22.0, (12.9740, 77.6010)),
        ("Prakash Nair", "Plumber", "plumbing", 4.7, 12, 55.0, (12.9810, 77.5960)),
        # electrical
        ("Suresh Reddy", "Electrician", "electrical", 4.6, 5, 30.0, (12.9750, 77.5980)),
        ("Manoj Kumar", "Electrician", "electrical", 4.4, 8, 40.0, (12.9690, 77.5900)),
        ("Rakesh Yadav", "Electrician", "electrical", 4.0, 4, 24.0, (12.9780, 77.5930)),
        ("Sunil Rao", "Electrician", "electrical", 4.8, 10, 50.0, (12.9860, 77.5990)),
        # cleaning
        ("Priya Sharma", "Cleaner", "cleaning", 4.9, 4, 25.0, (12.9800, 77.5850)),
        ("Lakshmi Devi", "Cleaner", "cleaning", 4.5, 6, 20.0, (12.9720, 77.5910)),
        ("Rekha Kumari", "Cleaner", "cleaning", 4.2, 2, 18.0, (12.9760, 77.5950)),
        ("Kavitha Rao", "Cleaner", "cleaning", 4.7, 5, 28.0, (12.9830, 77.5890)),
        # ac-repair
        ("Arjun Nair", "AC Tech", "ac-repair", 4.3, 3, 40.0, (12.9850, 77.5900)),
        ("Rajesh Menon", "AC Technician", "ac-repair", 4.6, 7, 50.0, (12.9730, 77.5940)),
        ("Kiran Kumar", "AC Technician", "ac-repair", 4.0, 5, 35.0, (12.9790, 77.6000)),
        ("Deepak Jain", "AC Technician", "ac-repair", 4.8, 9, 60.0, (12.9840, 77.5860)),
        # home-painting
        ("Manoj Yadav", "Painter", "home-painting", 4.5, 8, 28.0, (12.9700, 77.5920)),
        ("Suresh Kumar", "Painter", "home-painting", 4.2, 5, 22.0, (12.9770, 77.5970)),
        ("Ramesh Patel", "Painter", "home-painting", 4.6, 10, 32.0, (12.9820, 77.5870)),
        ("Vijay Chauhan", "Painter", "home-painting", 4.0, 3, 20.0, (12.9740, 77.6030)),
        # carpentry
        ("Vikram Singh", "Carpenter", "carpentry", 4.7, 6, 32.0, (12.9720, 77.5890)),
        ("Ganesh Iyer", "Carpenter", "carpentry", 4.4, 8, 28.0, (12.9790, 77.5930)),
        ("Santosh Kumar", "Carpenter", "carpentry", 4.1, 4, 24.0, (12.9750, 77.6020)),
        ("Ravi Shetty", "Carpenter", "carpentry", 4.8, 12, 45.0, (12.9840, 77.5910)),
        # pest-control
        ("Deepak Verma", "Pest Control Technician", "pest-control", 4.6, 5, 45.0, (12.9730, 77.5950)),
        ("Rahul Singh", "Pest Control Technician", "pest-control", 4.3, 4, 38.0, (12.9780, 77.5900)),
        ("Ashok Kumar", "Pest Control Technician", "pest-control", 4.5, 7, 48.0, (12.9810, 77.5980)),
        ("Nitin Gupta", "Pest Control Technician", "pest-control", 4.0, 3, 35.0, (12.9680, 77.6010)),
        # appliance-repair
        ("Anil Kumar", "Appliance Repair Technician", "appliance-repair", 4.4, 6, 38.0, (12.9740, 77.5920)),
        ("Suresh Menon", "Appliance Repair Technician", "appliance-repair", 4.6, 8, 42.0, (12.9800, 77.5960)),
        ("Praveen Kumar", "Appliance Repair Technician", "appliance-repair", 4.1, 4, 32.0, (12.9760, 77.5870)),
        ("Dinesh Rao", "Appliance Repair Technician", "appliance-repair", 4.7, 10, 48.0, (12.9830, 77.6000)),
        # refrigerator-repair
        ("Rohit Sharma", "Fridge Repair Technician", "refrigerator-repair", 4.5, 5, 36.0, (12.9710, 77.5900)),
        ("Mahesh Kumar", "Fridge Repair Technician", "refrigerator-repair", 4.2, 4, 30.0, (12.9770, 77.5960)),
        ("Surendra Yadav", "Fridge Repair Technician", "refrigerator-repair", 4.6, 7, 40.0, (12.9820, 77.5880)),
        ("Akash Verma", "Fridge Repair Technician", "refrigerator-repair", 4.0, 3, 28.0, (12.9750, 77.6020)),
        # washing-machine-repair
        ("Karan Mehta", "Washing Machine Technician", "washing-machine-repair", 4.6, 4, 34.0, (12.9720, 77.5940)),
        ("Naveen Kumar", "Washing Machine Technician", "washing-machine-repair", 4.3, 5, 30.0, (12.9790, 77.5990)),
        ("Sandeep Rao", "Washing Machine Technician", "washing-machine-repair", 4.5, 6, 36.0, (12.9740, 77.5870)),
        ("Rohan Gupta", "Washing Machine Technician", "washing-machine-repair", 4.0, 3, 26.0, (12.9810, 77.6010)),
        # tv-repair
        ("Sanjay Mishra", "TV Repair Technician", "tv-repair", 4.4, 6, 30.0, (12.9700, 77.5930)),
        ("Pankaj Kumar", "TV Repair Technician", "tv-repair", 4.6, 8, 34.0, (12.9780, 77.5900)),
        ("Tarun Rao", "TV Repair Technician", "tv-repair", 4.1, 4, 26.0, (12.9760, 77.6020)),
        ("Varun Sharma", "TV Repair Technician", "tv-repair", 4.7, 9, 40.0, (12.9830, 77.5960)),
        # ro-water-purifier
        ("Hari Prasad", "RO Technician", "ro-water-purifier", 4.5, 5, 32.0, (12.9730, 77.5910)),
        ("Sridhar Kumar", "RO Technician", "ro-water-purifier", 4.3, 6, 30.0, (12.9790, 77.5970)),
        ("Raju Naik", "RO Technician", "ro-water-purifier", 4.6, 7, 36.0, (12.9750, 77.5880)),
        ("Mohan Rao", "RO Technician", "ro-water-purifier", 4.0, 3, 26.0, (12.9810, 77.6010)),
        # cctv-installation
        ("Suresh Kamath", "CCTV Technician", "cctv-installation", 4.6, 6, 42.0, (12.9710, 77.5950)),
        ("Nikhil Kumar", "CCTV Technician", "cctv-installation", 4.3, 4, 36.0, (12.9770, 77.5900)),
        ("Arvind Rao", "CCTV Technician", "cctv-installation", 4.5, 8, 45.0, (12.9830, 77.5980)),
        ("Karthik Menon", "CCTV Technician", "cctv-installation", 4.1, 3, 32.0, (12.9690, 77.6020)),
        # interior-design
        ("Meera Krishnan", "Interior Designer", "interior-design", 4.8, 8, 80.0, (12.9820, 77.5930)),
        ("Divya Menon", "Interior Designer", "interior-design", 4.6, 6, 65.0, (12.9740, 77.5890)),
        ("Anjali Iyer", "Interior Designer", "interior-design", 4.4, 5, 55.0, (12.9780, 77.5970)),
        ("Priyanka Rao", "Interior Designer", "interior-design", 4.7, 7, 70.0, (12.9850, 77.5910)),
        # home-shifting
        ("Balaji Kumar", "Packer Mover", "home-shifting", 4.4, 6, 35.0, (12.9720, 77.5960)),
        ("Sekhar Rao", "Packer Mover", "home-shifting", 4.6, 8, 38.0, (12.9800, 77.5900)),
        ("Pradeep Kumar", "Packer Mover", "home-shifting", 4.1, 4, 30.0, (12.9750, 77.6020)),
        ("Venkatesh Naidu", "Packer Mover", "home-shifting", 4.7, 10, 42.0, (12.9830, 77.5940)),
        # gardening
        ("Ramesh Kumar", "Gardener", "gardening", 4.5, 6, 24.0, (12.9730, 77.5930)),
        ("Sudheer Yadav", "Gardener", "gardening", 4.3, 4, 20.0, (12.9790, 77.5980)),
        ("Prakash Rao", "Gardener", "gardening", 4.6, 8, 28.0, (12.9750, 77.5870)),
        ("Madhu Kumar", "Gardener", "gardening", 4.1, 3, 18.0, (12.9810, 77.6010)),
        # beauty-at-home
        ("Nisha Sharma", "Beautician", "beauty-at-home", 4.8, 6, 40.0, (12.9700, 77.5940)),
        ("Pooja Verma", "Beautician", "beauty-at-home", 4.6, 5, 35.0, (12.9780, 77.5900)),
        ("Ritu Gupta", "Beautician", "beauty-at-home", 4.4, 4, 30.0, (12.9740, 77.6020)),
        ("Neha Rao", "Beautician", "beauty-at-home", 4.7, 7, 45.0, (12.9820, 77.5960)),
        # spa-massage
        ("Kavya Nair", "Massage Therapist", "spa-massage", 4.7, 6, 50.0, (12.9720, 77.5910)),
        ("Sneha Kumar", "Massage Therapist", "spa-massage", 4.5, 4, 42.0, (12.9790, 77.5970)),
        ("Anusha Rao", "Massage Therapist", "spa-massage", 4.3, 5, 38.0, (12.9750, 77.5880)),
        ("Divya Nair", "Massage Therapist", "spa-massage", 4.8, 8, 55.0, (12.9810, 77.6000)),
        # cooking-home-chef
        ("Sangeetha Iyer", "Home Chef", "cooking-home-chef", 4.9, 8, 60.0, (12.9710, 77.5950)),
        ("Radhika Menon", "Home Chef", "cooking-home-chef", 4.7, 6, 50.0, (12.9780, 77.5900)),
        ("Latha Devi", "Home Chef", "cooking-home-chef", 4.5, 5, 45.0, (12.9740, 77.6020)),
        ("Usha Reddy", "Home Chef", "cooking-home-chef", 4.6, 7, 55.0, (12.9830, 77.5930)),
        # home-tutor
        ("Anand Kumar", "Home Tutor", "home-tutor", 4.8, 6, 50.0, (12.9730, 77.5940)),
        ("Shalini Rao", "Home Tutor", "home-tutor", 4.6, 5, 45.0, (12.9800, 77.5980)),
        ("Bharath Iyer", "Home Tutor", "home-tutor", 4.4, 4, 40.0, (12.9760, 77.5870)),
        ("Kavita Menon", "Home Tutor", "home-tutor", 4.7, 8, 55.0, (12.9820, 77.6010)),
        # babysitting
        ("Sunita Devi", "Babysitter", "babysitting", 4.8, 5, 30.0, (12.9700, 77.5920)),
        ("Mary Thomas", "Babysitter", "babysitting", 4.6, 6, 28.0, (12.9770, 77.5960)),
        ("Anita Kumar", "Babysitter", "babysitting", 4.4, 3, 25.0, (12.9750, 77.6030)),
        ("Grace D'Souza", "Babysitter", "babysitting", 4.7, 7, 32.0, (12.9830, 77.5890)),
        # elder-care
        ("Rosy Fernandez", "Elder Care Nurse", "elder-care", 4.8, 7, 45.0, (12.9720, 77.5930)),
        ("Selvi Raj", "Elder Care Attendant", "elder-care", 4.6, 6, 40.0, (12.9790, 77.5990)),
        ("Janet Joseph", "Elder Care Nurse", "elder-care", 4.5, 5, 42.0, (12.9740, 77.5870)),
        ("Lucy Mathew", "Elder Care Attendant", "elder-care", 4.7, 8, 48.0, (12.9810, 77.6000)),
        # pet-care
        ("Rakesh Patel", "Pet Caretaker", "pet-care", 4.7, 5, 35.0, (12.9730, 77.5950)),
        ("Sonu Kumar", "Dog Walker", "pet-care", 4.5, 3, 25.0, (12.9780, 77.5900)),
        ("Arun Menon", "Pet Groomer", "pet-care", 4.6, 6, 40.0, (12.9820, 77.5980)),
        ("Bindu Rao", "Pet Caretaker", "pet-care", 4.4, 4, 30.0, (12.9690, 77.6010)),
        # laundry
        ("Selvam Kumar", "Laundry Specialist", "laundry", 4.5, 5, 18.0, (12.9710, 77.5900)),
        ("Babu Rao", "Laundry Specialist", "laundry", 4.3, 4, 16.0, (12.9770, 77.5960)),
        ("Chandra Shekar", "Laundry Specialist", "laundry", 4.6, 7, 20.0, (12.9750, 77.5880)),
        ("Murugan Kumar", "Laundry Specialist", "laundry", 4.2, 3, 15.0, (12.9810, 77.6020)),
        # car-wash
        ("Antony Raj", "Car Washer", "car-wash", 4.6, 5, 30.0, (12.9720, 77.5940)),
        ("Joseph Kumar", "Car Washer", "car-wash", 4.4, 4, 26.0, (12.9790, 77.5990)),
        ("Selva Kumar", "Car Washer", "car-wash", 4.7, 6, 32.0, (12.9740, 77.5870)),
        ("Rajesh Naik", "Car Washer", "car-wash", 4.2, 3, 24.0, (12.9810, 77.6000)),
    ]

    all_cat_slugs = [
        "plumbing", "electrical", "cleaning", "ac-repair", "home-painting",
        "carpentry", "pest-control", "appliance-repair", "refrigerator-repair",
        "washing-machine-repair", "tv-repair", "ro-water-purifier", "cctv-installation",
        "interior-design", "home-shifting", "gardening", "beauty-at-home",
        "spa-massage", "cooking-home-chef", "home-tutor", "babysitting",
        "elder-care", "pet-care", "laundry", "car-wash",
    ]

    cats = {}
    for slug in all_cat_slugs:
        c = db.query(Category).filter(Category.slug == slug).first()
        if c:
            cats[slug] = c

    workers = []
    for w_idx, (wname, prof, cat_slug, rating, exp, rate, (lat, lng)) in enumerate(worker_data):
        u = User(
            email=f"worker{w_idx + 1}.{cat_slug}@demo.com",
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

    if counts.get("workers", 0) > 0:
        _seed_fraud_data(db)

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


def _seed_fraud_data(db):
    """Seed fraud data for demo workers (trust scores: 98, 90, 78, 38)."""
    from app.models.worker import Worker
    from app.models.fraud import WorkerFraudData, FraudReport, SuspiciousActivity

    now_iso = datetime.now(timezone.utc).isoformat()
    configs = [
        ("Ravi Kumar", 2.0, "low", []),
        ("Suresh Reddy", 10.0, "low", []),
        ("Priya Sharma", 22.0, "medium", []),
        ("Arjun Nair", 62.0, "high", [
            {"type": "duplicate_phone", "desc": "Phone number matches another worker account", "sev": "medium", "meta": {"detail": "Same +91-98765xxxxx found on 2 accounts"}},
            {"type": "fake_profile", "desc": "Profile image appears to be AI-generated or stolen", "sev": "high", "meta": {"detail": "Reverse image search returned no results"}},
            {"type": "suspicious_login", "desc": "Multiple logins from different cities in 1 hour", "sev": "medium", "meta": {"detail": "IP geolocation: Bangalore, Mumbai, Delhi within 60 minutes"}},
        ]),
    ]
    added = 0
    for wname, score, risk, activities in configs:
        worker = db.query(Worker).filter(Worker.name == wname).first()
        if not worker:
            continue
        existing_fd = db.query(WorkerFraudData).filter(WorkerFraudData.worker_id == worker.id).first()
        if existing_fd:
            existing_fd.fraud_score = score
            existing_fd.risk_level = risk
            existing_fd.is_disabled = False
            existing_fd.last_analysis_at = now_iso
            db.add(existing_fd)
        else:
            db.add(WorkerFraudData(
                id=str(uuid.uuid4()), worker_id=worker.id,
                fraud_score=score, is_disabled=False, risk_level=risk, last_analysis_at=now_iso,
            ))
        existing_report = db.query(FraudReport).filter(FraudReport.worker_id == worker.id).first()
        if existing_report:
            existing_report.fraud_score = score
            existing_report.risk_level = risk
            existing_report.analyzed_at = now_iso
            db.add(existing_report)
        else:
            db.add(FraudReport(
                id=str(uuid.uuid4()), worker_id=worker.id, fraud_score=score, risk_level=risk,
                reason="Heuristic analysis: high cancellation rate, complaint count, and duplicate phone.",
                confidence=max(60.0, 100.0 - score),
                recommendation="no_action" if score < 30 else "warn",
                triggered_by="seed", analyzed_at=now_iso,
            ))
        db.query(SuspiciousActivity).filter(SuspiciousActivity.worker_id == worker.id).delete()
        for act in activities:
            db.add(SuspiciousActivity(
                id=str(uuid.uuid4()), worker_id=worker.id,
                activity_type=act["type"], description=act["desc"],
                severity=act["sev"], metadata_json=act["meta"], detected_at=now_iso,
            ))
        added += 1
    if added:
        logger.info(f"Fraud data seeded for {added} workers")


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
            _seed_fraud_data(db)
            db.commit()
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
