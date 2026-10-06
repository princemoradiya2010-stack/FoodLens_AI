from nutrition.goals import DAILY_GOALS


def generate_recommendations(summary, meal_type="unknown"):

    recommendations = []

    calories = float(summary.get("total_calories", 0) or 0)
    protein = float(summary.get("total_protein", 0) or 0)
    carbs = float(summary.get("total_carbs", 0) or 0)
    fat = float(summary.get("total_fat", 0) or 0)

    # Protein recommendation
    if protein < DAILY_GOALS["protein"] * 0.7:

        if meal_type == "breakfast":
            recommendations.append(
                "Your protein intake is low. Consider adding paneer, dal, chana, or curd to breakfast."
            )

        elif meal_type in ["morning snacks", "afternoon snacks"]:
            recommendations.append(
                "Your protein intake is low. Consider a protein-rich snack such as chana, paneer, or curd."
            )

        elif meal_type == "lunch":
            recommendations.append(
                "Your protein intake is low. Consider adding dal, chana, paneer, or another protein-rich food to lunch."
            )

        elif meal_type == "dinner":
            recommendations.append(
                "Your protein intake is low. Consider adding dal, paneer, chana, or another protein-rich food to dinner."
            )

        else:
            recommendations.append(
                "Your protein intake is low. Consider adding dal, chana, paneer, or another protein-rich food."
            )

    # Calories
    if calories > DAILY_GOALS["calories"]:
        recommendations.append(
            "Your calorie intake is already above your daily goal. Consider a lighter next meal."
        )

    # Carbohydrates
    if carbs > DAILY_GOALS["carbs"] * 1.2:
        recommendations.append(
            "Your carbohydrate intake is high. Consider adding more vegetables and protein instead of extra rice or roti."
        )

    # Fat
    if fat > DAILY_GOALS["fat"] * 1.2:
        recommendations.append(
            "Your fat intake is high. Consider choosing a lower-fat meal and reducing fried or creamy foods."
        )

    # Balanced
    if not recommendations:
        recommendations.append(
            "Your nutrition is currently within a reasonable range. Keep your next meal balanced."
        )

    return recommendations