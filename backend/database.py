import os
import psycopg2
import psycopg2.extras
from datetime import datetime


# -------------------------------------------------------
# PostgreSQL connection via DATABASE_URL environment var.
# On Render, set DATABASE_URL to your Neon connection string:
# postgresql://user:pass@host.neon.tech/neondb?sslmode=require
# -------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")


def get_connection():
    """Open and return a new PostgreSQL connection."""
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL environment variable is not set. "
            "Add your Neon PostgreSQL connection string to Render's environment variables."
        )
    conn = psycopg2.connect(DATABASE_URL)
    return conn


def get_cursor(conn):
    """Return a RealDictCursor so rows behave like dicts (same as sqlite3.Row)."""
    return conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)


def create_tables():
    """Create all required tables if they don't already exist."""
    connection = get_connection()
    cursor = get_cursor(connection)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meals (
            id SERIAL PRIMARY KEY,
            meal_date TEXT NOT NULL,
            meal_type TEXT,
            total_calories FLOAT DEFAULT 0,
            total_protein FLOAT DEFAULT 0,
            total_carbs FLOAT DEFAULT 0,
            total_fat FLOAT DEFAULT 0
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS meal_items (
            id SERIAL PRIMARY KEY,
            meal_id INTEGER NOT NULL,
            food_name TEXT NOT NULL,
            quantity FLOAT DEFAULT 1,
            calories FLOAT DEFAULT 0,
            protein FLOAT DEFAULT 0,
            carbs FLOAT DEFAULT 0,
            fat FLOAT DEFAULT 0,
            CONSTRAINT fk_meal
                FOREIGN KEY (meal_id)
                REFERENCES meals(id)
                ON DELETE CASCADE
        )
    """)

    connection.commit()
    cursor.close()
    connection.close()


def get_current_meal_type():
    current_time = datetime.now().time()

    # Breakfast: 4:00 AM - 10:00 AM
    if datetime.strptime("04:00", "%H:%M").time() <= current_time < \
       datetime.strptime("10:00", "%H:%M").time():
        return "breakfast"

    # Morning Snacks: 10:00 AM - 11:00 AM
    elif datetime.strptime("10:00", "%H:%M").time() <= current_time < \
         datetime.strptime("11:00", "%H:%M").time():
        return "morning snacks"

    # Lunch: 11:00 AM - 3:00 PM
    elif datetime.strptime("11:00", "%H:%M").time() <= current_time < \
         datetime.strptime("15:00", "%H:%M").time():
        return "lunch"

    # Afternoon Snacks: 3:00 PM - 6:00 PM
    elif datetime.strptime("15:00", "%H:%M").time() <= current_time < \
         datetime.strptime("18:00", "%H:%M").time():
        return "afternoon snacks"

    # Dinner: 6:00 PM - 11:00 PM
    elif datetime.strptime("18:00", "%H:%M").time() <= current_time < \
         datetime.strptime("23:00", "%H:%M").time():
        return "dinner"

    # Outside defined time
    return "other"


def save_meal(meal_summary, total_nutrition, meal_type="unknown"):
    """Insert a meal and its food items. Returns the new meal id."""
    connection = get_connection()
    cursor = get_cursor(connection)

    meal_date = datetime.now().isoformat()

    # Save main meal; RETURNING id replaces sqlite3's lastrowid
    cursor.execute("""
        INSERT INTO meals (
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (
        meal_date,
        meal_type,
        total_nutrition.get("calories") or 0,
        total_nutrition.get("protein") or 0,
        total_nutrition.get("carbs") or 0,
        total_nutrition.get("fat") or 0,
    ))

    meal_id = cursor.fetchone()["id"]

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
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            meal_id,
            item.get("food", ""),
            item.get("quantity", 1),
            item.get("calories") or 0,
            item.get("protein") or 0,
            item.get("carbs") or 0,
            item.get("fat") or 0,
        ))

    connection.commit()
    cursor.close()
    connection.close()

    return meal_id


def get_all_meals():
    """Return all meals ordered by most recent first."""
    connection = get_connection()
    cursor = get_cursor(connection)

    cursor.execute("""
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
    """)

    meals = cursor.fetchall()
    cursor.close()
    connection.close()

    return [dict(meal) for meal in meals]


def get_today_summary():
    """Return totals for all meals logged today (server date)."""
    connection = get_connection()
    cursor = get_cursor(connection)

    today = datetime.now().strftime("%Y-%m-%d")

    cursor.execute("""
        SELECT
            COUNT(*) AS total_meals,
            COALESCE(SUM(total_calories), 0) AS total_calories,
            COALESCE(SUM(total_protein), 0)  AS total_protein,
            COALESCE(SUM(total_carbs), 0)    AS total_carbs,
            COALESCE(SUM(total_fat), 0)      AS total_fat
        FROM meals
        WHERE SUBSTRING(meal_date, 1, 10) = %s
    """, (today,))

    summary = cursor.fetchone()
    cursor.close()
    connection.close()

    return dict(summary)


def get_meal_by_id(meal_id):
    """Return a single meal with all its food items, or None if not found."""
    connection = get_connection()
    cursor = get_cursor(connection)

    cursor.execute("""
        SELECT
            id,
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        FROM meals
        WHERE id = %s
    """, (meal_id,))

    meal = cursor.fetchone()

    if meal is None:
        cursor.close()
        connection.close()
        return None

    cursor.execute("""
        SELECT
            id,
            food_name,
            quantity,
            calories,
            protein,
            carbs,
            fat
        FROM meal_items
        WHERE meal_id = %s
    """, (meal_id,))

    items = cursor.fetchall()
    cursor.close()
    connection.close()

    result = dict(meal)
    result["items"] = [dict(item) for item in items]

    return result


if __name__ == "__main__":
    create_tables()
    print("PostgreSQL database ready!")
    print("Connected via DATABASE_URL:", DATABASE_URL[:40] + "..." if DATABASE_URL else "NOT SET")