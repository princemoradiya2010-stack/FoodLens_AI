import sqlite3
from pathlib import Path

DATABASE_PATH = Path("foodlens.db")

connection = sqlite3.connect(DATABASE_PATH)

rows = connection.execute("""
    SELECT
        id,
        meal_date,
        meal_type,
        total_calories,
        total_protein,
        total_carbs,
        total_fat
    FROM meals
    ORDER BY id DESC
""").fetchall()

print("\nSAVED MEALS:\n")

for row in rows:
    print(
        f"ID: {row[0]} | "
        f"Date: {row[1]} | "
        f"Type: {row[2]} | "
        f"Calories: {row[3]} | "
        f"Protein: {row[4]} | "
        f"Carbs: {row[5]} | "
        f"Fat: {row[6]}"
    )

connection.close()