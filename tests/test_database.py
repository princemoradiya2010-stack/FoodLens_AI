import sqlite3
from pathlib import Path


database_path = Path("foodlens.db")

print("Database exists:", database_path.exists())

connection = sqlite3.connect(database_path)

tables = connection.execute(
    "SELECT name FROM sqlite_master WHERE type='table'"
).fetchall()

print("Tables:")

for table in tables:
    print("-", table[0])

connection.close()