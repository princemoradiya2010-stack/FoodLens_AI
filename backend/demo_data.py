"""
FoodLens AI - Prince Account Initializer & 2-Week Meal History Generator
Ensures the personal account for Prince is set up with his exact metrics:
- Username: 'prince'
- Password: 'password123'
- Email: 'prince@foodlens.ai'
- Metrics: Weight 78kg, Height 179cm, Age 20, Goal: Stable Weight (maintenance)
- Populates 2 weeks (14 days) of realistic Indian meals tailored to Prince's maintenance goal (~2300-2450 kcal/day).
"""
from datetime import datetime, timedelta
import os
from nutrition.nutrition_data import NUTRITION_DATA
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

# 14-day rotation of realistic Indian meals
TWO_WEEKS_MEAL_SCHEDULE = [
    # Day 0 (13 days ago)
    [
        ("breakfast", "08:30", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("chapati", 3), ("daal", 1), ("palak paneer", 1)]),
        ("snack", "17:00", [("aloo tikki", 1)]),
        ("dinner", "20:30", [("chapati", 2), ("dal tadka", 1), ("bhindi masala", 1)])
    ],
    # Day 1 (12 days ago)
    [
        ("breakfast", "09:00", [("chapati", 2), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:00", [("biryani", 1), ("kadai paneer", 1)]),
        ("snack", "17:30", [("kachori", 1)]),
        ("dinner", "20:45", [("chapati", 3), ("dal makhani", 1), ("aloo gobi", 1)])
    ],
    # Day 2 (11 days ago)
    [
        ("breakfast", "08:45", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:30", [("chapati", 3), ("dal tadka", 1), ("paneer butter masala", 1)]),
        ("snack", "17:15", [("gulab jamun", 1)]),
        ("dinner", "21:00", [("naan", 1), ("chapati", 1), ("daal", 1), ("aloo matar", 1)])
    ],
    # Day 3 (10 days ago)
    [
        ("breakfast", "09:15", [("bhatura", 2), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("chapati", 2), ("palak paneer", 1), ("dal makhani", 1)]),
        ("snack", "17:00", [("aloo tikki", 1)]),
        ("dinner", "20:30", [("biryani", 1), ("dal tadka", 1)])
    ],
    # Day 4 (9 days ago)
    [
        ("breakfast", "08:30", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:00", [("chapati", 3), ("daal", 1), ("kadai paneer", 1)]),
        ("snack", "17:30", [("jalebi", 1)]),
        ("dinner", "20:45", [("chapati", 2), ("dal makhani", 1), ("bhindi masala", 1)])
    ],
    # Day 5 (8 days ago)
    [
        ("breakfast", "09:00", [("chapati", 2), ("dal tadka", 1), ("lassi", 1)]),
        ("lunch", "13:30", [("biryani", 1), ("palak paneer", 1)]),
        ("snack", "17:15", [("kachori", 1)]),
        ("dinner", "20:30", [("chapati", 3), ("chana masala", 1), ("aloo gobi", 1)])
    ],
    # Day 6 (7 days ago)
    [
        ("breakfast", "08:45", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("naan", 2), ("paneer butter masala", 1), ("daal", 1)]),
        ("snack", "17:00", [("aloo tikki", 1)]),
        ("dinner", "21:00", [("chapati", 3), ("dal tadka", 1), ("aloo matar", 1)])
    ],
    # Day 7 (6 days ago)
    [
        ("breakfast", "09:15", [("bhatura", 1), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:00", [("chapati", 3), ("dal makhani", 1), ("kadai paneer", 1)]),
        ("snack", "17:30", [("gulab jamun", 1)]),
        ("dinner", "20:30", [("biryani", 1), ("daal", 1)])
    ],
    # Day 8 (5 days ago)
    [
        ("breakfast", "08:30", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("chapati", 3), ("daal", 1), ("palak paneer", 1), ("bhindi masala", 1)]),
        ("snack", "17:00", [("kachori", 1)]),
        ("dinner", "20:45", [("chapati", 2), ("dal tadka", 1), ("paneer butter masala", 1)])
    ],
    # Day 9 (4 days ago)
    [
        ("breakfast", "09:00", [("chapati", 2), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:30", [("biryani", 1), ("dal makhani", 1)]),
        ("snack", "17:15", [("aloo tikki", 1)]),
        ("dinner", "20:30", [("chapati", 3), ("daal", 1), ("aloo gobi", 1)])
    ],
    # Day 10 (3 days ago)
    [
        ("breakfast", "08:45", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:00", [("chapati", 3), ("kadai paneer", 1), ("dal tadka", 1)]),
        ("snack", "17:30", [("jalebi", 1)]),
        ("dinner", "21:00", [("naan", 1), ("chapati", 2), ("palak paneer", 1), ("daal", 1)])
    ],
    # Day 11 (2 days ago)
    [
        ("breakfast", "09:15", [("bhatura", 2), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("chapati", 3), ("dal makhani", 1), ("bhindi masala", 1)]),
        ("snack", "17:00", [("gulab jamun", 1)]),
        ("dinner", "20:30", [("biryani", 1), ("kadai paneer", 1)])
    ],
    # Day 12 (Yesterday)
    [
        ("breakfast", "08:30", [("poha", 1), ("lassi", 1)]),
        ("lunch", "13:00", [("chapati", 3), ("daal", 1), ("paneer butter masala", 1)]),
        ("snack", "17:15", [("aloo tikki", 1)]),
        ("dinner", "20:45", [("chapati", 2), ("dal tadka", 1), ("aloo matar", 1)])
    ],
    # Day 13 (Today)
    [
        ("breakfast", "08:45", [("chapati", 2), ("chana masala", 1), ("lassi", 1)]),
        ("lunch", "13:15", [("chapati", 3), ("dal makhani", 1), ("palak paneer", 1)])
    ]
]


def _build_meal_data(food_items):
    """Calculates meal_summary items and total nutrition dict based on NUTRITION_DATA."""
    meal_summary = []
    total_nutrition = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}

    for food_name, qty in food_items:
        nut = NUTRITION_DATA.get(food_name, {})
        cal = round(nut.get("calories", 0) * qty, 2)
        pro = round(nut.get("protein", 0) * qty, 2)
        carb = round(nut.get("carbs", 0) * qty, 2)
        fat = round(nut.get("fat", 0) * qty, 2)

        meal_summary.append({
            "food": food_name,
            "quantity": qty,
            "serving": nut.get("serving", ""),
            "calories": cal,
            "protein": pro,
            "carbs": carb,
            "fat": fat
        })
        total_nutrition["calories"] += cal
        total_nutrition["protein"] += pro
        total_nutrition["carbs"] += carb
        total_nutrition["fat"] += fat

    total_nutrition = {k: round(v, 2) for k, v in total_nutrition.items()}
    return meal_summary, total_nutrition


def seed_two_weeks_meals(user_id: int):
    """
    Seeds exactly 14 days of realistic Indian meals for the specified user.
    Uses timestamps going from 13 days ago up to today.
    """
    from backend.database import save_meal, get_connection, _run_execute

    conn = get_connection()
    # Check if meals already exist for this user
    cursor = _run_execute(conn, "SELECT COUNT(*) as cnt FROM meals WHERE user_id = %s", (user_id,))
    row = cursor.fetchone()
    count = row["cnt"] if isinstance(row, dict) else row[0]
    cursor.close()
    conn.close()

    if count >= 10:
        print(f"[FoodLens Account] User {user_id} already has {count} meals logged. Skipping re-seeding.")
        return

    today = datetime.now()
    total_meals_saved = 0

    for day_index, daily_meals in enumerate(TWO_WEEKS_MEAL_SCHEDULE):
        # day_index 0 is 13 days ago, day_index 13 is today
        day_offset = 13 - day_index
        meal_day = today - timedelta(days=day_offset)

        for meal_type, time_str, items in daily_meals:
            hour, minute = map(int, time_str.split(":"))
            meal_datetime = meal_day.replace(hour=hour, minute=minute, second=0, microsecond=0)
            meal_summary, total_nutrition = _build_meal_data(items)

            save_meal(
                meal_summary=meal_summary,
                total_nutrition=total_nutrition,
                meal_type=meal_type,
                user_id=user_id,
                meal_date=meal_datetime.isoformat()
            )
            total_meals_saved += 1

    print(f"[FoodLens Account] Successfully seeded {total_meals_saved} meals across 14 days for user {user_id}!")


def ensure_demo_user_seeded(seed_two_weeks: bool = True):
    """
    Ensure the personal account 'prince' exists with 78kg stable weight metrics,
    and populates 2 weeks of realistic meal logs.
    """
    from backend.database import (
        get_user_by_email_or_username,
        create_user,
        update_user_profile
    )

    targets = calculate_nutrition_targets(
        weight_kg=DEMO_WEIGHT,
        goal=DEMO_GOAL,
        height_cm=DEMO_HEIGHT,
        age=DEMO_AGE,
        gender=DEMO_GENDER,
        activity_level=DEMO_ACTIVITY
    )
    goals = targets["daily_goals"]

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

    existing = get_user_by_email_or_username(DEMO_USERNAME)
    if not existing:
        existing = get_user_by_email_or_username(DEMO_EMAIL)

    if not existing:
        user = create_user(DEMO_USERNAME, DEMO_EMAIL, DEMO_PASSWORD, profile_data)
        user_id = user["id"]
        print(f"[FoodLens Account] Created account '{DEMO_USERNAME}' with {DEMO_WEIGHT}kg {DEMO_GOAL} targets.")
    else:
        user_id = existing["id"]
        update_user_profile(user_id, profile_data)

    if seed_two_weeks:
        seed_two_weeks_meals(user_id)

    return user_id


if __name__ == "__main__":
    from backend.database import create_tables
    create_tables()
    ensure_demo_user_seeded(seed_two_weeks=True)
