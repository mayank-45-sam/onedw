from app.db.database import SessionLocal
from app.models.category import Category
from app.models.service import Service
from sqlalchemy import func

with SessionLocal() as db:
    cats = db.query(Category).all()
    print('categories', len(cats))
    for c in cats[:10]:
        print(c.id, c.name, c.slug, c.service_count, c.image, c.icon)
    services = db.query(Service).all()
    print('services', len(services))
    for s in services[:10]:
        print(s.id, s.name, s.category_id)
    cnt = db.query(func.count(Category.id)).scalar()
    print('cat count', cnt)
