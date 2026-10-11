from nutrition.goals import DAILY_GOALS


def generate_recommendations(summary, meal_type="unknown", goals=None, user_goal="weight_loss", user_weight=70.0):
    """
    Generate tailored nutrition recommendations based on the person's daily intake,
    customized targets, specific goal (weight loss, weight gain, maintenance), and meal type.
    """
    if goals is None:
        goals = DAILY_GOALS

    target_calories = float(goals.get("calories", 2000))
    target_protein = float(goals.get("protein", 60))
    target_carbs = float(goals.get("carbs", 250))
    target_fat = float(goals.get("fat", 65))

    calories = float(summary.get("total_calories", 0) or 0)
    protein = float(summary.get("total_protein", 0) or 0)
    carbs = float(summary.get("total_carbs", 0) or 0)
    fat = float(summary.get("total_fat", 0) or 0)

    recommendations = []
    goal_mode = str(user_goal or "weight_loss").lower().strip()

    # ----------------------------------------------------
    # 1. Goal-Specific Caloric Guidance
    # ----------------------------------------------------
    remaining_calories = target_calories - calories

    if goal_mode in ("weight_loss", "fat_loss", "loss", "cut"):
        if remaining_calories > 400:
            recommendations.append(
                f"Weight Loss Focus: You have {round(remaining_calories)} kcal left in your daily deficit budget. "
                "Keep portions moderate and focus on high-volume, low-calorie foods."
            )
        elif 0 <= remaining_calories <= 400:
            recommendations.append(
                f"Weight Loss Target: You are within {round(remaining_calories)} kcal of your daily limit. "
                "For your next meal, choose light options like cucumber salad, vegetable soup, or buttermilk (chaas)."
            )
        else:
            surplus = round(abs(remaining_calories))
            recommendations.append(
                f"Calorie Alert: You are {surplus} kcal above your weight loss target today. "
                "For remaining meals, avoid calorie-dense sauces, fried foods, and sweetened drinks; drink plenty of water."
            )

    elif goal_mode in ("weight_gain", "muscle_gain", "gain", "bulk"):
        if remaining_calories > 600:
            recommendations.append(
                f"Weight Gain Focus: You still need {round(remaining_calories)} kcal to reach your growth surplus. "
                "Add nutrient-dense foods like peanut butter, banana shake, paneer, mixed nuts, or an extra roti."
            )
        elif 0 <= remaining_calories <= 600:
            recommendations.append(
                f"Weight Gain Progress: You have {round(remaining_calories)} kcal left to hit your surplus target. "
                "A wholesome bedtime snack like warm milk with almonds or curd with fruits will complete your goal."
            )
        else:
            recommendations.append(
                "Great job! You have reached your calorie surplus target for weight gain today. Ensure adequate sleep for recovery."
            )

    else:  # maintenance
        if remaining_calories > 300:
            recommendations.append(
                f"Maintenance: You have {round(remaining_calories)} kcal remaining to maintain your current weight stably."
            )
        elif remaining_calories < -200:
            recommendations.append(
                "Maintenance: Calorie intake is slightly higher than baseline. Keep your next meal light with fresh veggies."
            )

    # ----------------------------------------------------
    # 2. Protein Recommendations
    # ----------------------------------------------------
    protein_deficit = target_protein - protein

    if protein < target_protein * 0.7:
        if goal_mode in ("weight_loss", "fat_loss"):
            protein_note = (
                f"Your protein intake ({round(protein)}g) is below your target ({round(target_protein)}g). "
                "In a calorie deficit, high protein is vital to protect muscle. "
            )
        elif goal_mode in ("weight_gain", "muscle_gain"):
            protein_note = (
                f"Your protein intake ({round(protein)}g) is below your target ({round(target_protein)}g). "
                "Protein is required to turn your surplus into muscle mass. "
            )
        else:
            protein_note = f"Your protein intake is low ({round(protein)}g / {round(target_protein)}g target). "

        # Meal context food items
        if meal_type == "breakfast":
            recommendations.append(
                protein_note + "Consider adding paneer bhurji, besan chilla, boiled eggs, sprouts, or curd to breakfast."
            )
        elif meal_type in ["morning snacks", "afternoon snacks"]:
            recommendations.append(
                protein_note + "Snack on roasted chana, roasted makhana, paneer cubes, or Greek yogurt/curd."
            )
        elif meal_type == "lunch":
            recommendations.append(
                protein_note + "Boost your lunch with a large bowl of dal, chana masala, rajma, paneer, or soy chunks."
            )
        elif meal_type == "dinner":
            recommendations.append(
                protein_note + "Incorporate moong dal, paneer tikka, tofu, or egg curry into dinner."
            )
        else:
            recommendations.append(
                protein_note + "Add protein-rich Indian staples like dal, chana, paneer, or sprouts."
            )
    elif protein >= target_protein:
        recommendations.append(
            f"Protein Target Hit: Outstanding! You reached {round(protein)}g of protein today, satisfying your daily needs."
        )

    # ----------------------------------------------------
    # 3. Carbohydrates & Fat Distribution
    # ----------------------------------------------------
    if carbs > target_carbs * 1.25:
        if goal_mode in ("weight_loss", "fat_loss"):
            recommendations.append(
                f"Carbohydrates are high ({round(carbs)}g vs {round(target_carbs)}g target). "
                "For weight loss, substitute excess rice/roti with cucumber salads and green sabzi."
            )
        else:
            recommendations.append(
                f"Carbohydrate intake is high ({round(carbs)}g). Balance your upcoming meal with more lean protein."
            )

    if fat > target_fat * 1.25:
        recommendations.append(
            f"Fat intake is high ({round(fat)}g vs {round(target_fat)}g target). "
            "Choose steamed, baked, or lightly sautéed dishes; avoid deep-fried foods like pakoras or heavy cream curries."
        )

    # ----------------------------------------------------
    # 4. Balanced Fallback
    # ----------------------------------------------------
    if not recommendations:
        if goal_mode in ("weight_loss", "fat_loss"):
            recommendations.append(
                "Your nutrition is right on track for your weight loss goal! Keep staying hydrated and active."
            )
        elif goal_mode in ("weight_gain", "muscle_gain"):
            recommendations.append(
                "Your nutrition is well aligned for steady weight and muscle gain. Keep up the consistent eating!"
            )
        else:
            recommendations.append(
                "Your nutrition is nicely balanced for maintenance. Great job maintaining healthy dietary habits!"
            )

    return recommendations