import sqlite3
from pathlib import Path
from datetime import datetime


BASE_DIR = Path(__file__).resolve().parent.parent

DATABASE_PATH = BASE_DIR / "foodlens.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def create_tables():

    connection = get_connection()

    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meal_date TEXT NOT NULL,
            meal_type TEXT,
            total_calories REAL DEFAULT 0,
            total_protein REAL DEFAULT 0,
            total_carbs REAL DEFAULT 0,
            total_fat REAL DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meal_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            meal_id INTEGER NOT NULL,
            food_name TEXT NOT NULL,
            quantity REAL DEFAULT 1,
            calories REAL DEFAULT 0,
            protein REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            fat REAL DEFAULT 0,

            FOREIGN KEY (meal_id)
            REFERENCES meals(id)
        )
    """)

    connection.commit()
    connection.close()

def get_current_meal_type():
    current_time = datetime.now().time()

    # Breakfast: 4:00 AM - 10:00 AM
    if current_time >= datetime.strptime("04:00", "%H:%M").time() and \
       current_time < datetime.strptime("10:00", "%H:%M").time():
        return "breakfast"

    # Morning Snacks: 10:00 AM - 11:00 AM
    elif current_time >= datetime.strptime("10:00", "%H:%M").time() and \
         current_time < datetime.strptime("11:00", "%H:%M").time():
        return "morning snacks"

    # Lunch: 11:00 AM - 3:00 PM
    elif current_time >= datetime.strptime("11:00", "%H:%M").time() and \
         current_time < datetime.strptime("15:00", "%H:%M").time():
        return "lunch"

    # Afternoon Snacks: 3:00 PM - 6:00 PM
    elif current_time >= datetime.strptime("15:00", "%H:%M").time() and \
         current_time < datetime.strptime("18:00", "%H:%M").time():
        return "afternoon snacks"

    # Dinner: 6:00 PM - 11:00 PM
    elif current_time >= datetime.strptime("18:00", "%H:%M").time() and \
         current_time < datetime.strptime("23:00", "%H:%M").time():
        return "dinner"

    # Outside defined time
    return "other"

def save_meal(meal_summary, total_nutrition, meal_type="unknown"):

    connection = get_connection()

    cursor = connection.cursor()

    meal_date = datetime.now().isoformat()

    # Save main meal
    cursor.execute("""
        INSERT INTO meals (
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        meal_date,
        meal_type,
        total_nutrition["calories"],
        total_nutrition["protein"],
        total_nutrition["carbs"],
        total_nutrition["fat"]
    ))

    meal_id = cursor.lastrowid

    # Save individual foods
    for item in meal_summary:

        cursor.execute("""
            INSERT INTO meal_items (
                meal_id,
                food_name,
                quantity,
                calories,
                protein,
                carbs,
                fat
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            meal_id,
            item["food"],
            item["quantity"],
            item["calories"],
            item["protein"],
            item["carbs"],
            item["fat"]
        ))

    connection.commit()
    connection.close()

    return meal_id

def get_all_meals():

    connection = get_connection()

    meals = connection.execute("""
        SELECT
            id,
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        FROM meals
        ORDER BY meal_date DESC
    """).fetchall()

    connection.close()

    return [dict(meal) for meal in meals]

def get_today_summary():

    connection = get_connection()

    today = datetime.now().strftime("%Y-%m-%d")

    summary = connection.execute("""
        SELECT
            COUNT(*) AS total_meals,
            COALESCE(SUM(total_calories), 0) AS total_calories,
            COALESCE(SUM(total_protein), 0) AS total_protein,
            COALESCE(SUM(total_carbs), 0) AS total_carbs,
            COALESCE(SUM(total_fat), 0) AS total_fat
        FROM meals
        WHERE substr(meal_date, 1, 10) = ?
    """, (today,)).fetchone()

    connection.close()

    return dict(summary)

def get_meal_by_id(meal_id):
    connection = get_connection()

    meal = connection.execute("""
        SELECT
            id,
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        FROM meals
        WHERE id = ?
    """, (meal_id,)).fetchone()

    if meal is None:
        connection.close()
        return None

    items = connection.execute("""
        SELECT
            id,
            food_name,
            quantity,
            calories,
            protein,
            carbs,
            fat
        FROM meal_items
        WHERE meal_id = ?
    """, (meal_id,)).fetchall()

    connection.close()

    result = dict(meal)
    result["items"] = [dict(item) for item in items]

    return result

if __name__ == "__main__":

    create_tables()
    # print("Current meal type:", get_current_meal_type())
    print("Database ready!")
    print("Database path:", DATABASE_PATH)