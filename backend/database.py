import os
import hashlib
import secrets
from pathlib import Path
from datetime import datetime

# -------------------------------------------------------
# Database Configuration
# -------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")
IS_POSTGRES = bool(DATABASE_URL and DATABASE_URL.startswith("postgres"))

BASE_DIR = Path(__file__).resolve().parent.parent
_db_env = os.getenv("DATABASE_PATH")
SQLITE_DB_PATH = Path(_db_env) if _db_env else (BASE_DIR / "foodlens.db")

if IS_POSTGRES:
    import psycopg2
    import psycopg2.extras
else:
    import sqlite3


def get_connection():
    """Return a database connection (PostgreSQL if DATABASE_URL set, else SQLite)."""
    if IS_POSTGRES:
        url = DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        return psycopg2.connect(url, connect_timeout=15)
    else:
        SQLITE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn


def _run_execute(conn, sql: str, params=()):
    """Execute SQL query handling both Postgres (%s) and SQLite (?) syntaxes."""
    if IS_POSTGRES:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute(sql, params)
        return cursor
    else:
        cursor = conn.cursor()
        # Adapt %s to ? for SQLite
        sqlite_sql = sql.replace("%s", "?")
        # Strip RETURNING id for SQLite if present
        if "RETURNING id" in sqlite_sql or "returning id" in sqlite_sql:
            sqlite_sql = sqlite_sql.replace("RETURNING id", "").replace("returning id", "").strip()
        cursor.execute(sqlite_sql, params)
        return cursor


# -------------------------------------------------------
# Password Hashing Helpers (PBKDF2-HMAC-SHA256)
# -------------------------------------------------------
def hash_password(password: str, salt: str = None) -> tuple:
    """Hash password using PBKDF2-HMAC with salt."""
    if not salt:
        salt = secrets.token_hex(16)
    pwd_bytes = password.encode("utf-8")
    salt_bytes = salt.encode("utf-8")
    key = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100000)
    return key.hex(), salt


def verify_password(password: str, stored_hash: str, salt: str) -> bool:
    """Verify password against stored PBKDF2 hash."""
    expected_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(expected_hash, stored_hash)


# -------------------------------------------------------
# Table Creation & Migrations
# -------------------------------------------------------
def create_tables():
    """Create all required tables for users, meals, and meal items."""
    conn = get_connection()

    if IS_POSTGRES:
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                weight FLOAT DEFAULT 70.0,
                height FLOAT DEFAULT 170.0,
                age INTEGER DEFAULT 25,
                gender TEXT DEFAULT 'male',
                activity_level TEXT DEFAULT 'moderate',
                goal TEXT DEFAULT 'weight_loss',
                target_calories FLOAT DEFAULT 2000,
                target_protein FLOAT DEFAULT 140,
                target_carbs FLOAT DEFAULT 220,
                target_fat FLOAT DEFAULT 55,
                created_at TEXT NOT NULL
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meals (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NULL,
                meal_date TEXT NOT NULL,
                meal_type TEXT,
                total_calories FLOAT DEFAULT 0,
                total_protein FLOAT DEFAULT 0,
                total_carbs FLOAT DEFAULT 0,
                total_fat FLOAT DEFAULT 0
            );
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
            );
        """)

        # Add user_id column to meals if upgrading older schema
        try:
            cursor.execute("ALTER TABLE meals ADD COLUMN IF NOT EXISTS user_id INTEGER;")
        except Exception:
            conn.rollback()

        conn.commit()
        cursor.close()

    else:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                weight REAL DEFAULT 70.0,
                height REAL DEFAULT 170.0,
                age INTEGER DEFAULT 25,
                gender TEXT DEFAULT 'male',
                activity_level TEXT DEFAULT 'moderate',
                goal TEXT DEFAULT 'weight_loss',
                target_calories REAL DEFAULT 2000,
                target_protein REAL DEFAULT 140,
                target_carbs REAL DEFAULT 220,
                target_fat REAL DEFAULT 55,
                created_at TEXT NOT NULL
            );
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS meals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                meal_date TEXT NOT NULL,
                meal_type TEXT,
                total_calories REAL DEFAULT 0,
                total_protein REAL DEFAULT 0,
                total_carbs REAL DEFAULT 0,
                total_fat REAL DEFAULT 0
            );
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
                FOREIGN KEY (meal_id) REFERENCES meals(id)
            );
        """)

        # Add user_id if upgrading sqlite meals table
        try:
            cursor.execute("PRAGMA table_info(meals)")
            columns = [row[1] for row in cursor.fetchall()]
            if "user_id" not in columns:
                cursor.execute("ALTER TABLE meals ADD COLUMN user_id INTEGER")
        except Exception:
            pass

        conn.commit()
        cursor.close()

    conn.close()


# -------------------------------------------------------
# User Management Functions
# -------------------------------------------------------
def create_user(username: str, email: str, password: str, profile_data: dict) -> dict:
    """Register a new user and return user record dict without password."""
    conn = get_connection()
    pwd_hash, salt = hash_password(password)
    now = datetime.now().isoformat()

    weight = float(profile_data.get("weight", 70.0))
    height = float(profile_data.get("height", 170.0))
    age = int(profile_data.get("age", 25))
    gender = str(profile_data.get("gender", "male"))
    activity = str(profile_data.get("activity_level", "moderate"))
    goal = str(profile_data.get("goal", "weight_loss"))
    target_cal = float(profile_data.get("target_calories", 2000))
    target_pro = float(profile_data.get("target_protein", 140))
    target_carb = float(profile_data.get("target_carbs", 220))
    target_fat = float(profile_data.get("target_fat", 55))

    sql = """
        INSERT INTO users (
            username, email, password_hash, salt, weight, height, age,
            gender, activity_level, goal, target_calories, target_protein,
            target_carbs, target_fat, created_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        username.strip(), email.strip().lower(), pwd_hash, salt,
        weight, height, age, gender, activity, goal,
        target_cal, target_pro, target_carb, target_fat, now
    )

    if IS_POSTGRES:
        sql += " RETURNING id"
        cursor = _run_execute(conn, sql, params)
        user_id = cursor.fetchone()["id"]
    else:
        cursor = _run_execute(conn, sql, params)
        user_id = cursor.lastrowid

    conn.commit()
    cursor.close()
    conn.close()

    return get_user_by_id(user_id)


def get_user_by_id(user_id: int):
    """Retrieve user by ID."""
    conn = get_connection()
    cursor = _run_execute(conn, "SELECT * FROM users WHERE id = %s", (user_id,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d.pop("password_hash", None)
    d.pop("salt", None)
    return d


def get_user_by_email_or_username(identifier: str):
    """Retrieve full user row by email or username (for auth)."""
    conn = get_connection()
    id_clean = identifier.strip().lower()
    sql = "SELECT * FROM users WHERE LOWER(email) = %s OR LOWER(username) = %s"
    cursor = _run_execute(conn, sql, (id_clean, id_clean))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return dict(row) if row else None


def update_user_profile(user_id: int, profile_data: dict) -> dict:
    """Update user personal metrics and target nutrition."""
    conn = get_connection()
    sql = """
        UPDATE users
        SET weight = %s,
            height = %s,
            age = %s,
            gender = %s,
            activity_level = %s,
            goal = %s,
            target_calories = %s,
            target_protein = %s,
            target_carbs = %s,
            target_fat = %s
        WHERE id = %s
    """
    params = (
        float(profile_data.get("weight", 70.0)),
        float(profile_data.get("height", 170.0)),
        int(profile_data.get("age", 25)),
        str(profile_data.get("gender", "male")),
        str(profile_data.get("activity_level", "moderate")),
        str(profile_data.get("goal", "weight_loss")),
        float(profile_data.get("target_calories", 2000)),
        float(profile_data.get("target_protein", 140)),
        float(profile_data.get("target_carbs", 220)),
        float(profile_data.get("target_fat", 55)),
        user_id
    )
    cursor = _run_execute(conn, sql, params)
    conn.commit()
    cursor.close()
    conn.close()

    return get_user_by_id(user_id)


# -------------------------------------------------------
# Meal Helper Functions
# -------------------------------------------------------
def get_current_meal_type():
    """Return the meal type string based on current server time."""
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


def save_meal(meal_summary, total_nutrition, meal_type="unknown", user_id=None):
    """Insert a meal and its food items. Returns the new meal id."""
    conn = get_connection()
    meal_date = datetime.now().isoformat()

    sql = """
        INSERT INTO meals (
            user_id,
            meal_date,
            meal_type,
            total_calories,
            total_protein,
            total_carbs,
            total_fat
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    params = (
        user_id,
        meal_date,
        meal_type,
        total_nutrition.get("calories") or 0,
        total_nutrition.get("protein") or 0,
        total_nutrition.get("carbs") or 0,
        total_nutrition.get("fat") or 0,
    )

    if IS_POSTGRES:
        sql += " RETURNING id"
        cursor = _run_execute(conn, sql, params)
        meal_id = cursor.fetchone()["id"]
    else:
        cursor = _run_execute(conn, sql, params)
        meal_id = cursor.lastrowid

    # Save individual food items
    for item in meal_summary:
        item_sql = """
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
        """
        item_params = (
            meal_id,
            item.get("food", ""),
            item.get("quantity", 1),
            item.get("calories") or 0,
            item.get("protein") or 0,
            item.get("carbs") or 0,
            item.get("fat") or 0,
        )
        _run_execute(conn, item_sql, item_params)

    conn.commit()
    cursor.close()
    conn.close()

    return meal_id


def get_all_meals(user_id=None):
    """Return all meals (optionally filtered by user_id) ordered by most recent first."""
    conn = get_connection()
    if user_id is not None:
        sql = """
            SELECT
                id,
                user_id,
                meal_date,
                meal_type,
                total_calories,
                total_protein,
                total_carbs,
                total_fat
            FROM meals
            WHERE user_id = %s
            ORDER BY meal_date DESC
        """
        cursor = _run_execute(conn, sql, (user_id,))
    else:
        sql = """
            SELECT
                id,
                user_id,
                meal_date,
                meal_type,
                total_calories,
                total_protein,
                total_carbs,
                total_fat
            FROM meals
            ORDER BY meal_date DESC
        """
        cursor = _run_execute(conn, sql)

    meals = cursor.fetchall()
    cursor.close()
    conn.close()

    return [dict(meal) for meal in meals]


def get_today_summary(user_id=None):
    """Return totals for all meals logged today (optionally filtered by user_id)."""
    conn = get_connection()
    today = datetime.now().strftime("%Y-%m-%d")

    if IS_POSTGRES:
        date_expr = "SUBSTRING(meal_date, 1, 10)"
    else:
        date_expr = "substr(meal_date, 1, 10)"

    if user_id is not None:
        sql = f"""
            SELECT
                COUNT(*) AS total_meals,
                COALESCE(SUM(total_calories), 0) AS total_calories,
                COALESCE(SUM(total_protein), 0)  AS total_protein,
                COALESCE(SUM(total_carbs), 0)    AS total_carbs,
                COALESCE(SUM(total_fat), 0)      AS total_fat
            FROM meals
            WHERE {date_expr} = %s AND user_id = %s
        """
        cursor = _run_execute(conn, sql, (today, user_id))
    else:
        sql = f"""
            SELECT
                COUNT(*) AS total_meals,
                COALESCE(SUM(total_calories), 0) AS total_calories,
                COALESCE(SUM(total_protein), 0)  AS total_protein,
                COALESCE(SUM(total_carbs), 0)    AS total_carbs,
                COALESCE(SUM(total_fat), 0)      AS total_fat
            FROM meals
            WHERE {date_expr} = %s
        """
        cursor = _run_execute(conn, sql, (today,))

    summary = cursor.fetchone()
    cursor.close()
    conn.close()

    return dict(summary) if summary else {
        "total_meals": 0,
        "total_calories": 0.0,
        "total_protein": 0.0,
        "total_carbs": 0.0,
        "total_fat": 0.0
    }


def get_meal_by_id(meal_id: int):
    """Return a single meal with all its food items, or None if not found."""
    conn = get_connection()
    cursor = _run_execute(conn, """
        SELECT
            id,
            user_id,
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
        conn.close()
        return None

    item_cursor = _run_execute(conn, """
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

    items = item_cursor.fetchall()
    cursor.close()
    item_cursor.close()
    conn.close()

    result = dict(meal)
    result["items"] = [dict(item) for item in items]
    return result


if __name__ == "__main__":
    create_tables()
    engine_name = "PostgreSQL" if IS_POSTGRES else f"SQLite ({SQLITE_DB_PATH})"
    print(f"Database ready! Engine: {engine_name}")