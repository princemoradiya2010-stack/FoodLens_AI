from nutrition.nutrition_data import NUTRITION_DATA

food = "chapati"

data = NUTRITION_DATA[food]

print("Food:", food)
print("Serving:", data["serving"])
print("Calories:", data["calories"], "kcal")
print("Protein:", data["protein"], "g")
print("Carbs:", data["carbs"], "g")
print("Fat:", data["fat"], "g")