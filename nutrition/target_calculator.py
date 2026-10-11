"""
FoodLens AI - Nutrition Target Calculator
Calculates personalized daily calorie and macronutrient targets based on:
- Weight (kg)
- Height (cm)
- Age (years)
- Gender ('male' / 'female' / 'other')
- Activity Level ('sedentary', 'light', 'moderate', 'active', 'very_active')
- Goal ('weight_loss', 'weight_gain', 'maintenance')

Uses clinical Mifflin-St Jeor formula for BMR and evidence-based macro distribution.
"""

ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,        # Little or no exercise
    "light": 1.375,          # Light exercise 1-3 days/week
    "moderate": 1.55,        # Moderate exercise 3-5 days/week
    "active": 1.725,         # Hard exercise 6-7 days/week
    "very_active": 1.9       # Very hard exercise, physical job
}

GOAL_LABELS = {
    "weight_loss": "Weight Loss (Caloric Deficit)",
    "weight_gain": "Weight Gain (Caloric Surplus)",
    "maintenance": "Weight Maintenance (Balance)"
}


def calculate_bmr(weight_kg: float, height_cm: float = 170.0, age: int = 25, gender: str = "male") -> float:
    """
    Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
    """
    weight_kg = max(30.0, float(weight_kg))
    height_cm = max(100.0, float(height_cm or 170.0))
    age = max(14, int(age or 25))
    gender = str(gender or "male").lower().strip()

    if gender == "female":
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) - 161.0
    else:
        # Male / other default
        bmr = (10.0 * weight_kg) + (6.25 * height_cm) - (5.0 * age) + 5.0

    return max(1000.0, round(bmr, 1))


def calculate_tdee(bmr: float, activity_level: str = "moderate") -> float:
    """
    Calculate Total Daily Energy Expenditure from BMR and activity level.
    """
    level = str(activity_level or "moderate").lower().strip()
    multiplier = ACTIVITY_MULTIPLIERS.get(level, 1.55)
    return round(bmr * multiplier, 1)


def calculate_nutrition_targets(
    weight_kg: float,
    goal: str = "weight_loss",
    height_cm: float = 170.0,
    age: int = 25,
    gender: str = "male",
    activity_level: str = "moderate"
) -> dict:
    """
    Calculate customized nutrition goals and macronutrient distribution.
    
    Returns:
        dict containing BMR, TDEE, calories, protein (g), carbs (g), fat (g),
        fiber (g), water (L), goal description, and personalized guidance.
    """
    weight_kg = max(30.0, float(weight_kg or 70.0))
    height_cm = max(100.0, float(height_cm or 170.0))
    age = max(14, int(age or 25))
    gender = str(gender or "male").lower().strip()
    activity_level = str(activity_level or "moderate").lower().strip()
    goal = str(goal or "weight_loss").lower().strip()

    bmr = calculate_bmr(weight_kg, height_cm, age, gender)
    tdee = calculate_tdee(bmr, activity_level)

    # 1. Calorie Target by Goal
    if goal in ("weight_loss", "fat_loss", "loss", "cut"):
        goal_key = "weight_loss"
        # Safe 20-25% deficit, typically ~500 kcal
        target_calories = max(1200.0, round(tdee - 500.0))
        # High protein to prevent muscle loss during caloric deficit: 2.0g - 2.2g per kg
        target_protein = round(weight_kg * 2.0)
        # Moderate fat: 25% of target calories (1g fat = 9 kcal)
        target_fat = round((target_calories * 0.25) / 9.0)
        # Remaining calories go to carbs (1g carb = 4 kcal)
        remaining_kcal = target_calories - (target_protein * 4.0) - (target_fat * 9.0)
        target_carbs = max(50.0, round(remaining_kcal / 4.0))

        strategy_notes = [
            f"Daily caloric deficit of ~500 kcal relative to your TDEE ({round(tdee)} kcal).",
            f"High protein ({target_protein}g) ensures you lose fat while protecting lean muscle.",
            "Prioritize high-volume foods: green vegetables, cucumber, dal, sprouts, and curd.",
            "Minimize sugary beverages, deep-fried snacks (samosas, pakoras), and refined flour."
        ]

    elif goal in ("weight_gain", "muscle_gain", "gain", "bulk"):
        goal_key = "weight_gain"
        # Lean caloric surplus of ~400-500 kcal
        target_calories = round(tdee + 450.0)
        # Ample protein for hypertrophy: 1.8g per kg
        target_protein = round(weight_kg * 1.8)
        # Healthy fat: 25% of calories
        target_fat = round((target_calories * 0.25) / 9.0)
        # High complex carbs to fuel workouts and glycogen replenishment
        remaining_kcal = target_calories - (target_protein * 4.0) - (target_fat * 9.0)
        target_carbs = max(100.0, round(remaining_kcal / 4.0))

        strategy_notes = [
            f"Daily caloric surplus of ~450 kcal above your TDEE ({round(tdee)} kcal) to promote growth.",
            f"Optimal protein ({target_protein}g) supports muscle protein synthesis and recovery.",
            "Higher carbs ({target_carbs}g) provide lasting energy for workouts.",
            "Include nutrient-dense foods: paneer, peanut butter, whole eggs, oats, bananas, and nuts."
        ]

    else:
        goal_key = "maintenance"
        target_calories = round(tdee)
        # Moderate protein: 1.5g per kg
        target_protein = round(weight_kg * 1.5)
        # Balanced fat: 28% of calories
        target_fat = round((target_calories * 0.28) / 9.0)
        # Remaining carbs
        remaining_kcal = target_calories - (target_protein * 4.0) - (target_fat * 9.0)
        target_carbs = max(80.0, round(remaining_kcal / 4.0))

        strategy_notes = [
            f"Caloric balance set to your TDEE ({round(tdee)} kcal) to maintain current weight stably.",
            f"Balanced protein ({target_protein}g) maintains muscular tone and metabolic health.",
            "Maintain consistent meal timing with a mix of complex carbs, lean protein, and healthy fats."
        ]

    # Water & Fiber
    # Approx 35ml per kg
    water_liters = round(weight_kg * 0.035, 1)
    # Approx 14g fiber per 1000 kcal
    target_fiber = round((target_calories / 1000.0) * 14.0)

    return {
        "inputs": {
            "weight_kg": weight_kg,
            "height_cm": height_cm,
            "age": age,
            "gender": gender,
            "activity_level": activity_level,
            "goal": goal_key
        },
        "bmr": bmr,
        "tdee": tdee,
        "goal_name": GOAL_LABELS.get(goal_key, "Maintenance"),
        "daily_goals": {
            "calories": target_calories,
            "protein": target_protein,
            "carbs": target_carbs,
            "fat": target_fat,
            "fiber": target_fiber,
            "water_liters": water_liters
        },
        "strategy_notes": strategy_notes
    }
