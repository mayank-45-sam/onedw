import sqlite3

conn = sqlite3.connect("onedw.db")
cursor = conn.cursor()

cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [r[0] for r in cursor.fetchall()]
print("Tables:", tables)

if "categories" in tables:
    cursor.execute("SELECT COUNT(*) FROM categories")
    count = cursor.fetchone()[0]
    print(f"Category count: {count}")
    cursor.execute("SELECT id, name, slug, service_count, image FROM categories LIMIT 5")
    for row in cursor.fetchall():
        print(f"  {row}")
else:
    print("NO categories table found!")

conn.close()
