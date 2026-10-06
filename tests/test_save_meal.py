from backend.database import create_tables, save_meal


create_tables()


meal_summary = [
    {
        "food": "chapati",
        "quantity": 2,
        "calories": 240,
        "protein": 7,
        "carbs": 36,
        "fat": 6
    },
    {
        "food": "dal makhani",
        "quantity": 1,
        "calories": 220,
        "protein": 9,
        "carbs": 24,
        "fat": 10
    }
]


total_nutrition = {
    "calories": 460,
    "protein": 16,
    "carbs": 60,
    "fat": 16
}


meal_id = save_meal(
    meal_summary,
    total_nutrition,
    meal_type="lunch"
)


print("Meal saved successfully!")
print("Meal ID:", meal_id)