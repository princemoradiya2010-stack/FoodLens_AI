"""
FoodLens AI - Prince Account Initializer
Ensures the personal account for Prince is set up with his exact metrics:
- Username: 'prince'
- Password: 'password123'
- Email: 'prince@foodlens.ai'
- Metrics: Weight 78kg, Height 179cm, Age 20, Goal: Stable Weight (maintenance)
- Keeps meal history completely clean (no fake seeded meals) so Prince can log real meals.
"""
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


def ensure_demo_user_seeded(clean_fake_history: bool = True):
    """
    Ensure the personal account 'prince' exists with 78kg stable weight metrics,
    and removes any dummy seeded meals so the food journal starts fresh and clean.
    """
    from backend.database import (
        get_user_by_email_or_username,
        create_user,
        update_user_profile,
        get_connection,
        _run_execute
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
        # Ensure latest 78kg stable weight targets are saved
        update_user_profile(user_id, profile_data)

    # Clean up any dummy/fake meal history so Prince starts with a clean slate
    if clean_fake_history:
        try:
            conn = get_connection()
            # Delete meal items associated with prince's meals
            _run_execute(conn, """
                DELETE FROM meal_items 
                WHERE meal_id IN (SELECT id FROM meals WHERE user_id = %s)
            """, (user_id,))
            # Delete meals
            _run_execute(conn, "DELETE FROM meals WHERE user_id = %s", (user_id,))
            conn.commit()
            conn.close()
            print(f"[FoodLens Account] Cleaned dummy history for '{DEMO_USERNAME}'. Meal log is fresh and ready for real meals.")
        except Exception as e:
            print(f"Notice: Failed to clear dummy history: {e}")

    return user_id


if __name__ == "__main__":
    from backend.database import create_tables
    create_tables()
    ensure_demo_user_seeded(clean_fake_history=True)
