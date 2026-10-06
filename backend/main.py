from pathlib import Path
from collections import Counter
from datetime import datetime

from fastapi import FastAPI, File, UploadFile
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO
from nutrition.nutrition_data import NUTRITION_DATA
from backend.database import (
    create_tables,
    save_meal,
    get_all_meals,
    get_today_summary,
    get_meal_by_id,
    get_current_meal_type
)
from nutrition.goals import DAILY_GOALS
from nutrition.recommendations import generate_recommendations
from fastapi.middleware.cors import CORSMiddleware

class SaveMealRequest(BaseModel):
    meal_type: str
    meal_summary: list
    total_nutrition: dict

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "foodlens_yolo11s_best.pt"
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(exist_ok=True)


# --------------------------------------------------
# Load model
# --------------------------------------------------

print("Loading FoodLens YOLO model...")

model = YOLO(str(MODEL_PATH))

print("Model loaded successfully!")
print("Classes:", len(model.names))


# --------------------------------------------------
# FastAPI application
# --------------------------------------------------

app = FastAPI(
    title="FoodLens AI",
    description="Indian Food Detection API",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()

# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/")
def home():
    return {
        "message": "FoodLens AI API is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": "YOLO11s",
        "classes": len(model.names)
    }

@app.get("/meals")
def get_meals():

    meals = get_all_meals()

    return {
        "total_meals": len(meals),
        "meals": meals
    }

@app.get("/summary/today")
def today_summary():
    return get_today_summary()

@app.get("/summary/progress")
def summary_progress():

    summary = get_today_summary()

    return {
        "progress": {
            "calories": {
                "current": round(float(summary["total_calories"]), 2),
                "goal": DAILY_GOALS["calories"],
                "percentage": round(
                    (summary["total_calories"] / DAILY_GOALS["calories"]) * 100, 2
                )
            },
            "protein": {
                "current": round(float(summary["total_protein"]), 2),
                "goal": DAILY_GOALS["protein"],
                "percentage": round(
                    (summary["total_protein"] / DAILY_GOALS["protein"]) * 100, 2
                )
            },
            "carbs": {
                "current": round(float(summary["total_carbs"]), 2),
                "goal": DAILY_GOALS["carbs"],
                "percentage": round(
                    (summary["total_carbs"] / DAILY_GOALS["carbs"]) * 100, 2
                )
            },
            "fat": {
                "current": round(float(summary["total_fat"]), 2),
                "goal": DAILY_GOALS["fat"],
                "percentage": round(
                    (summary["total_fat"] / DAILY_GOALS["fat"]) * 100, 2
                )
            }
        }
    }

@app.get("/meals/{meal_id}")
def get_meal(meal_id: int):
    meal = get_meal_by_id(meal_id)

    if meal is None:
        return {
            "error": "Meal not found"
        }

    return meal



@app.get("/goals")
def get_goals():
    return {
        "daily_goals": DAILY_GOALS
    }

@app.get("/recommendations/today")
def today_recommendations():

    summary = get_today_summary()
    meal_type = get_current_meal_type()

    recommendations = generate_recommendations(
        summary,
        meal_type
    )

    return {
        "meal_type": meal_type,
        "recommendations": recommendations
    }
# --------------------------------------------------
# Food detection
# --------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    # Check file type
    if not file.content_type.startswith("image/"):
        return {
            "error": "Please upload an image file."
        }

    # Save uploaded image
    file_path = UPLOAD_DIR / file.filename

    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    # Open image
    image = Image.open(file_path).convert("RGB")

    # Run YOLO
    results = model.predict(
        source=image,
        imgsz=640,
        conf=0.25,
        device=0,
        verbose=False
    )

    detections = []

    for result in results:

        if result.boxes is None:
            continue

        for box in result.boxes:

            class_id = int(box.cls[0])
            confidence = float(box.conf[0])

            food_name = model.names[class_id]

            x1, y1, x2, y2 = box.xyxy[0].tolist()

            detection = {
                "food": food_name,
                "confidence": round(confidence, 4),

                # Each detected object is initially treated as 1 serving
                "quantity": 1,

                "box": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2)
                }
            }

            # Add nutrition
            if food_name in NUTRITION_DATA:
                nutrition = NUTRITION_DATA[food_name]

                detection["nutrition"] = nutrition

            detections.append(detection)

    # Simple food list
    foods = [
        detection["food"]
        for detection in detections
    ]
    food_counts = Counter(foods)
    meal_summary = []

    for food_name, quantity in food_counts.items():

        if food_name not in NUTRITION_DATA:
            continue

        nutrition = NUTRITION_DATA[food_name]

        meal_summary.append({
            "food": food_name,
            "quantity": quantity,
            "serving": nutrition["serving"],
            "calories": nutrition["calories"] * quantity,
            "protein": round(nutrition["protein"] * quantity, 2),
            "carbs": round(nutrition["carbs"] * quantity, 2),
            "fat": round(nutrition["fat"] * quantity, 2)
        })
    # --------------------------------------------------
    # Calculate total meal nutrition
    # --------------------------------------------------

    total_nutrition = {
        "calories": 0,
        "protein": 0,
        "carbs": 0,
        "fat": 0
    }

    for detection in detections:

        food_name = detection["food"]

        if food_name not in NUTRITION_DATA:
            continue

        nutrition = NUTRITION_DATA[food_name]

        quantity = detection["quantity"]

        total_nutrition["calories"] += nutrition["calories"] * quantity
        total_nutrition["protein"] += nutrition["protein"] * quantity
        total_nutrition["carbs"] += nutrition["carbs"] * quantity
        total_nutrition["fat"] += nutrition["fat"] * quantity

    # meal_type = get_current_meal_type()

    # meal_id = save_meal(
    #     meal_summary,
    #     total_nutrition,
    #     meal_type=meal_type
    # )
    return {
        "filename": file.filename,

        # "meal_id": meal_id,
        # "meal_type": meal_type,
        "meal_type": get_current_meal_type(),
        "foods": foods,

        "meal_summary": meal_summary,

        "detections": detections,

        "total_objects": len(detections),

        "total_nutrition": {
            "calories": total_nutrition["calories"],
            "protein": round(total_nutrition["protein"], 2),
            "carbs": round(total_nutrition["carbs"], 2),
            "fat": round(total_nutrition["fat"], 2)
        }
    }

@app.post("/save-meal")
def save_meal_api(request: SaveMealRequest):

    meal_id = save_meal(
        request.meal_summary,
        request.total_nutrition,
        meal_type=request.meal_type
    )

    return {
        "message": "Meal saved successfully",
        "meal_id": meal_id,
        "meal_type": request.meal_type
    }