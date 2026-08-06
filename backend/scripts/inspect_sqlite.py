import sqlite3

conn = sqlite3.connect(r'C:\Users\mayan\Downloads\frd\backend\onedw.db')
cur = conn.cursor()

cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = [r[0] for r in cur.fetchall()]
print('SQLite tables:', tables)

for t in tables:
    cur.execute(f'PRAGMA table_info({t})')
    cols = cur.fetchall()
    print(f'  {t}: {[c[1] for c in cols]}')
    cur.execute(f'SELECT COUNT(*) FROM {t}')
    print(f'    count={cur.fetchone()[0]}')

conn.close()
