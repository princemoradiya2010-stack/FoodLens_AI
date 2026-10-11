"""
FoodLens AI - Demo User & 7-Day Meal History Seeder
Seeds:
- Demo User: 'prince' (prince@foodlens.ai / password123)
  Metrics: Weight 78kg, Height 179cm, Age 20, Goal: Stable Weight (maintenance)
- 7 days of realistic Indian meal history (today down to 6 days ago)
"""
from datetime import datetime, timedelta
import os

from nutrition.target_calculator import calculate_nutrition_targets

DEMO_USERNAME = "prince"
DEMO_EMAIL = "prince@foodlens.ai"
DEMO_PASSWORD = "password123"
DEMO_WEIGHT = 78.0
DEMO_HEIGHT = 179.0
DEMO_AGE = 20
DEMO_GENDER = "male"
DEMO_ACTIVITY = "moderate"
DEMO_GOAL = "maintenance"

# Sample 7-day meal schedules with staple Indian items recognized by FoodLens
SEEDED_MEAL_DAYS = [
    # Day -6
    [
        {"meal_type": "breakfast", "time": "08:30", "items": [{"food": "idli", "quantity": 2, "calories": 160, "protein": 5, "carbs": 32, "fat": 1}, {"food": "sambar", "quantity": 1, "calories": 120, "protein": 4, "carbs": 20, "fat": 2}]},
        {"meal_type": "lunch", "time": "13:00", "items": [{"food": "dal", "quantity": 1, "calories": 180, "protein": 9, "carbs": 26, "fat": 4}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "paneer", "quantity": 1, "calories": 260, "protein": 18, "carbs": 6, "fat": 19}]},
        {"meal_type": "afternoon snacks", "time": "16:45", "items": [{"food": "chana", "quantity": 1, "calories": 160, "protein": 8, "carbs": 24, "fat": 3}]},
        {"meal_type": "dinner", "time": "20:30", "items": [{"food": "khichdi", "quantity": 1, "calories": 310, "protein": 11, "carbs": 52, "fat": 6}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]}
    ],
    # Day -5
    [
        {"meal_type": "breakfast", "time": "08:15", "items": [{"food": "besan chilla", "quantity": 2, "calories": 280, "protein": 14, "carbs": 36, "fat": 8}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]},
        {"meal_type": "lunch", "time": "13:15", "items": [{"food": "rajma", "quantity": 1, "calories": 240, "protein": 13, "carbs": 38, "fat": 4}, {"food": "rice", "quantity": 1, "calories": 210, "protein": 4, "carbs": 44, "fat": 1}, {"food": "roti", "quantity": 1, "calories": 120, "protein": 3, "carbs": 24, "fat": 1}]},
        {"meal_type": "afternoon snacks", "time": "17:00", "items": [{"food": "makhana", "quantity": 1, "calories": 140, "protein": 4, "carbs": 26, "fat": 2}]},
        {"meal_type": "dinner", "time": "20:45", "items": [{"food": "dal", "quantity": 1, "calories": 180, "protein": 9, "carbs": 26, "fat": 4}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "paneer", "quantity": 1, "calories": 240, "protein": 16, "carbs": 5, "fat": 17}]}
    ],
    # Day -4
    [
        {"meal_type": "breakfast", "time": "08:45", "items": [{"food": "poha", "quantity": 1, "calories": 250, "protein": 6, "carbs": 45, "fat": 5}, {"food": "buttermilk", "quantity": 1, "calories": 60, "protein": 3, "carbs": 6, "fat": 2}]},
        {"meal_type": "lunch", "time": "13:30", "items": [{"food": "chana masala", "quantity": 1, "calories": 260, "protein": 12, "carbs": 38, "fat": 6}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]},
        {"meal_type": "afternoon snacks", "time": "16:30", "items": [{"food": "sprouts", "quantity": 1, "calories": 150, "protein": 10, "carbs": 22, "fat": 2}]},
        {"meal_type": "dinner", "time": "20:15", "items": [{"food": "paneer bhurji", "quantity": 1, "calories": 290, "protein": 19, "carbs": 8, "fat": 20}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "dal", "quantity": 1, "calories": 160, "protein": 8, "carbs": 24, "fat": 3}]}
    ],
    # Day -3
    [
        {"meal_type": "breakfast", "time": "09:00", "items": [{"food": "oats", "quantity": 1, "calories": 240, "protein": 9, "carbs": 40, "fat": 5}, {"food": "boiled egg", "quantity": 2, "calories": 140, "protein": 12, "carbs": 2, "fat": 9}]},
        {"meal_type": "lunch", "time": "13:00", "items": [{"food": "dal fry", "quantity": 1, "calories": 200, "protein": 10, "carbs": 28, "fat": 5}, {"food": "rice", "quantity": 1, "calories": 210, "protein": 4, "carbs": 44, "fat": 1}, {"food": "roti", "quantity": 1, "calories": 120, "protein": 3, "carbs": 24, "fat": 1}, {"food": "salad", "quantity": 1, "calories": 50, "protein": 2, "carbs": 10, "fat": 0.5}]},
        {"meal_type": "afternoon snacks", "time": "17:15", "items": [{"food": "roasted chana", "quantity": 1, "calories": 170, "protein": 9, "carbs": 26, "fat": 3}]},
        {"meal_type": "dinner", "time": "20:30", "items": [{"food": "moong dal", "quantity": 1, "calories": 180, "protein": 10, "carbs": 27, "fat": 3}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "paneer", "quantity": 1, "calories": 220, "protein": 15, "carbs": 5, "fat": 16}]}
    ],
    # Day -2
    [
        {"meal_type": "breakfast", "time": "08:30", "items": [{"food": "dosa", "quantity": 1, "calories": 220, "protein": 5, "carbs": 38, "fat": 6}, {"food": "sambar", "quantity": 1, "calories": 120, "protein": 4, "carbs": 20, "fat": 2}]},
        {"meal_type": "lunch", "time": "13:30", "items": [{"food": "biryani", "quantity": 1, "calories": 380, "protein": 12, "carbs": 60, "fat": 10}, {"food": "raita", "quantity": 1, "calories": 90, "protein": 5, "carbs": 7, "fat": 4}]},
        {"meal_type": "afternoon snacks", "time": "16:45", "items": [{"food": "makhana", "quantity": 1, "calories": 130, "protein": 4, "carbs": 24, "fat": 2}]},
        {"meal_type": "dinner", "time": "20:45", "items": [{"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "dal", "quantity": 1, "calories": 180, "protein": 9, "carbs": 26, "fat": 4}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]}
    ],
    # Day -1 (Yesterday)
    [
        {"meal_type": "breakfast", "time": "08:20", "items": [{"food": "besan chilla", "quantity": 2, "calories": 270, "protein": 13, "carbs": 35, "fat": 7}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]},
        {"meal_type": "lunch", "time": "13:00", "items": [{"food": "paneer curry", "quantity": 1, "calories": 300, "protein": 18, "carbs": 10, "fat": 21}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "rice", "quantity": 1, "calories": 190, "protein": 4, "carbs": 40, "fat": 1}]},
        {"meal_type": "afternoon snacks", "time": "16:30", "items": [{"food": "buttermilk", "quantity": 1, "calories": 60, "protein": 3, "carbs": 6, "fat": 2}, {"food": "almonds", "quantity": 1, "calories": 120, "protein": 4, "carbs": 4, "fat": 10}]},
        {"meal_type": "dinner", "time": "20:15", "items": [{"food": "moong dal khichdi", "quantity": 1, "calories": 320, "protein": 12, "carbs": 54, "fat": 6}, {"food": "salad", "quantity": 1, "calories": 50, "protein": 2, "carbs": 10, "fat": 0.5}]}
    ],
    # Day 0 (Today)
    [
        {"meal_type": "breakfast", "time": "08:45", "items": [{"food": "idli", "quantity": 2, "calories": 160, "protein": 5, "carbs": 32, "fat": 1}, {"food": "sambar", "quantity": 1, "calories": 120, "protein": 4, "carbs": 20, "fat": 2}, {"food": "curd", "quantity": 1, "calories": 100, "protein": 6, "carbs": 8, "fat": 5}]},
        {"meal_type": "lunch", "time": "13:15", "items": [{"food": "dal", "quantity": 1, "calories": 190, "protein": 10, "carbs": 27, "fat": 4}, {"food": "roti", "quantity": 2, "calories": 240, "protein": 6, "carbs": 48, "fat": 2}, {"food": "paneer", "quantity": 1, "calories": 270, "protein": 18, "carbs": 6, "fat": 19}]},
        {"meal_type": "afternoon snacks", "time": "16:40", "items": [{"food": "roasted chana", "quantity": 1, "calories": 170, "protein": 9, "carbs": 26, "fat": 3}]}
    ]
]


def ensure_demo_user_seeded():
    """
    Ensure the demo user 'prince' exists with 78kg stable weight metrics,
    and seed last 1 week of realistic meal logs if not present.
    """
    from backend.database import (
        get_user_by_email_or_username,
        create_user,
        save_meal,
        get_all_meals,
        get_connection,
        _run_execute
    )

    existing = get_user_by_email_or_username(DEMO_USERNAME)
    if not existing:
        existing = get_user_by_email_or_username(DEMO_EMAIL)

    targets = calculate_nutrition_targets(
        weight_kg=DEMO_WEIGHT,
        goal=DEMO_GOAL,
        height_cm=DEMO_HEIGHT,
        age=DEMO_AGE,
        gender=DEMO_GENDER,
        activity_level=DEMO_ACTIVITY
    )
    goals = targets["daily_goals"]

    if not existing:
        profile_data = {
            "weight": DEMO_WEIGHT,
            "height": DEMO_HEIGHT,
            "age": DEMO_AGE,
            "gender": DEMO_GENDER,
            "activity_level": DEMO_ACTIVITY,
            "goal": DEMO_GOAL,
            "target_calories": goals["calories"],
            "target_protein": goals["protein"],
            "target_carbs": goals["carbs"],
            "target_fat": goals["fat"]
        }
        user = create_user(DEMO_USERNAME, DEMO_EMAIL, DEMO_PASSWORD, profile_data)
        user_id = user["id"]
        print(f"[FoodLens Demo] Created demo user '{DEMO_USERNAME}' with {DEMO_WEIGHT}kg {DEMO_GOAL} targets!")
    else:
        user_id = existing["id"]

    # Check if meals already exist for this user
    user_meals = get_all_meals(user_id=user_id)
    if len(user_meals) >= 10:
        return user_id

    # Seed 7 days of meals
    now = datetime.now()
    total_meals_added = 0

    conn = get_connection()

    for day_offset, day_meals in enumerate(SEEDED_MEAL_DAYS):
        # day_offset 0 -> 6 days ago, day_offset 6 -> today
        days_ago = 6 - day_offset
        target_date = now - timedelta(days=days_ago)
        date_str_base = target_date.strftime("%Y-%m-%d")

        for meal in day_meals:
            meal_time = meal["time"]
            iso_timestamp = f"{date_str_base}T{meal_time}:00"
            meal_type = meal["meal_type"]
            items = meal["items"]

            total_cals = sum(it.get("calories", 0) for it in items)
            total_pro = sum(it.get("protein", 0) for it in items)
            total_carb = sum(it.get("carbs", 0) for it in items)
            total_fat = sum(it.get("fat", 0) for it in items)

            # Insert meal directly with historical timestamp
            insert_meal_sql = """
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
            params = (user_id, iso_timestamp, meal_type, total_cals, total_pro, total_carb, total_fat)

            from backend.database import IS_POSTGRES
            if IS_POSTGRES:
                insert_meal_sql += " RETURNING id"
                cursor = _run_execute(conn, insert_meal_sql, params)
                meal_id = cursor.fetchone()["id"]
            else:
                cursor = _run_execute(conn, insert_meal_sql, params)
                meal_id = cursor.lastrowid

            # Insert meal items
            for it in items:
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
                _run_execute(conn, item_sql, (
                    meal_id,
                    it["food"],
                    it.get("quantity", 1),
                    it.get("calories", 0),
                    it.get("protein", 0),
                    it.get("carbs", 0),
                    it.get("fat", 0)
                ))

            total_meals_added += 1

    conn.commit()
    conn.close()
    print(f"[FoodLens Demo] Seeded {total_meals_added} historical meals across the last 7 days for user '{DEMO_USERNAME}'!")
    return user_id


if __name__ == "__main__":
    from backend.database import create_tables
    create_tables()
    ensure_demo_user_seeded()
