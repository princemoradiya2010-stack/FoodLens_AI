from pathlib import Path
from collections import Counter
from datetime import datetime
import os
import re
import sys
from typing import Optional

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from fastapi import FastAPI, File, HTTPException, UploadFile, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

from nutrition.nutrition_data import NUTRITION_DATA
from backend.database import (
    create_tables,
    save_meal,
    get_all_meals,
    get_today_summary,
    get_meal_by_id,
    get_current_meal_type,
    create_user,
    get_user_by_id,
    get_user_by_email_or_username,
    verify_password,
    update_user_profile
)
from backend.auth_utils import generate_token, verify_token
from nutrition.goals import DAILY_GOALS
from nutrition.target_calculator import calculate_nutrition_targets
from nutrition.recommendations import generate_recommendations


def normalize_food_name(food_name):
    return re.sub(r"[^a-z0-9]+", " ", str(food_name).lower()).strip()


NORMALIZED_NUTRITION_DATA = {
    normalize_food_name(food_name): nutrition
    for food_name, nutrition in NUTRITION_DATA.items()
}


# --------------------------------------------------
# Pydantic Schemas
# --------------------------------------------------

class SaveMealRequest(BaseModel):
    meal_type: str
    meal_summary: list
    total_nutrition: dict


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(..., min_length=5, max_length=100)
    password: str = Field(..., min_length=6)
    weight: float = Field(70.0, ge=30.0, le=300.0)
    height: float = Field(170.0, ge=80.0, le=250.0)
    age: int = Field(25, ge=12, le=120)
    gender: str = Field("male")
    activity_level: str = Field("moderate")
    goal: str = Field("weight_loss")


class LoginRequest(BaseModel):
    username_or_email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    weight: float = Field(..., ge=30.0, le=300.0)
    height: float = Field(170.0, ge=80.0, le=250.0)
    age: int = Field(25, ge=12, le=120)
    gender: str = Field("male")
    activity_level: str = Field("moderate")
    goal: str = Field("weight_loss")


class CalculateTargetsRequest(BaseModel):
    weight: float = Field(..., ge=30.0, le=300.0)
    height: float = Field(170.0, ge=80.0, le=250.0)
    age: int = Field(25, ge=12, le=120)
    gender: str = Field("male")
    activity_level: str = Field("moderate")
    goal: str = Field("weight_loss")


# --------------------------------------------------
# Paths
# --------------------------------------------------

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
    description="Indian Food Detection & Personalized Nutrition API",
    version="1.1.0"
)

cors_origin_regex = os.getenv("ALLOWED_ORIGIN_REGEX")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_origin_regex=cors_origin_regex if cors_origin_regex else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

create_tables()

try:
    from backend.demo_data import ensure_demo_user_seeded
    ensure_demo_user_seeded()
except Exception as _seed_err:
    print("Notice: demo data initialization skipped:", _seed_err)

FRONTEND_DIR = BASE_DIR / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/app", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


# --------------------------------------------------
# Auth Helper Dependency
# --------------------------------------------------

def get_current_user_optional(authorization: Optional[str] = Header(None)):
    """Extract and return authenticated user if Bearer token present and valid, else None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    user_id = verify_token(token)
    if not user_id:
        return None
    return get_user_by_id(user_id)


def get_current_user_required(user=Depends(get_current_user_optional)):
    """Enforce authenticated user."""
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please sign in.")
    return user


def get_active_goals(user: Optional[dict]):
    """Return user's customized daily goals, or fallback to system defaults."""
    if user and user.get("target_calories"):
        return {
            "calories": float(user.get("target_calories") or 2000),
            "protein": float(user.get("target_protein") or 60),
            "carbs": float(user.get("target_carbs") or 250),
            "fat": float(user.get("target_fat") or 65)
        }
    return DAILY_GOALS.copy()


# --------------------------------------------------
# Health check & Static root
# --------------------------------------------------

@app.get("/")
def home():
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/app/")
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


# --------------------------------------------------
# Authentication Endpoints
# --------------------------------------------------

@app.post("/auth/register")
def register(req: RegisterRequest):
    # Check if username or email already exists
    existing = get_user_by_email_or_username(req.email)
    if not existing:
        existing = get_user_by_email_or_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="A user with that username or email already exists.")

    # Calculate personalized nutrition targets according to weight, height, age, activity & goal
    calc = calculate_nutrition_targets(
        weight_kg=req.weight,
        goal=req.goal,
        height_cm=req.height,
        age=req.age,
        gender=req.gender,
        activity_level=req.activity_level
    )
    goals = calc["daily_goals"]

    profile_data = {
        "weight": req.weight,
        "height": req.height,
        "age": req.age,
        "gender": req.gender,
        "activity_level": req.activity_level,
        "goal": req.goal,
        "target_calories": goals["calories"],
        "target_protein": goals["protein"],
        "target_carbs": goals["carbs"],
        "target_fat": goals["fat"]
    }

    user = create_user(req.username, req.email, req.password, profile_data)
    token = generate_token(user["id"])

    return {
        "message": "User registered successfully",
        "token": token,
        "user": user,
        "targets": calc
    }


@app.post("/auth/login")
def login(req: LoginRequest):
    user_record = get_user_by_email_or_username(req.username_or_email)
    if not user_record:
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    if not verify_password(req.password, user_record["password_hash"], user_record["salt"]):
        raise HTTPException(status_code=401, detail="Invalid username/email or password.")

    token = generate_token(user_record["id"])

    # Safe user dict
    user = get_user_by_id(user_record["id"])
    calc = calculate_nutrition_targets(
        weight_kg=user["weight"],
        goal=user["goal"],
        height_cm=user["height"],
        age=user["age"],
        gender=user["gender"],
        activity_level=user["activity_level"]
    )

    return {
        "message": "Login successful",
        "token": token,
        "user": user,
        "targets": calc
    }


@app.get("/auth/me")
def get_me(user=Depends(get_current_user_required)):
    calc = calculate_nutrition_targets(
        weight_kg=user["weight"],
        goal=user["goal"],
        height_cm=user["height"],
        age=user["age"],
        gender=user["gender"],
        activity_level=user["activity_level"]
    )
    return {
        "user": user,
        "targets": calc
    }


@app.put("/auth/profile")
def update_profile(req: ProfileUpdateRequest, user=Depends(get_current_user_required)):
    calc = calculate_nutrition_targets(
        weight_kg=req.weight,
        goal=req.goal,
        height_cm=req.height,
        age=req.age,
        gender=req.gender,
        activity_level=req.activity_level
    )
    goals = calc["daily_goals"]

    profile_data = {
        "weight": req.weight,
        "height": req.height,
        "age": req.age,
        "gender": req.gender,
        "activity_level": req.activity_level,
        "goal": req.goal,
        "target_calories": goals["calories"],
        "target_protein": goals["protein"],
        "target_carbs": goals["carbs"],
        "target_fat": goals["fat"]
    }

    updated_user = update_user_profile(user["id"], profile_data)

    return {
        "message": "Profile and nutrition targets updated successfully",
        "user": updated_user,
        "targets": calc
    }


# --------------------------------------------------
# Nutrition Target Calculator (Public Endpoint)
# --------------------------------------------------

@app.post("/nutrition/calculate-targets")
def calculate_targets_api(req: CalculateTargetsRequest):
    return calculate_nutrition_targets(
        weight_kg=req.weight,
        goal=req.goal,
        height_cm=req.height,
        age=req.age,
        gender=req.gender,
        activity_level=req.activity_level
    )


# --------------------------------------------------
# Goals & Progress Endpoints
# --------------------------------------------------

@app.get("/goals")
def get_goals(user=Depends(get_current_user_optional)):
    active_goals = get_active_goals(user)
    calc = None
    if user:
        calc = calculate_nutrition_targets(
            weight_kg=user.get("weight", 70),
            goal=user.get("goal", "weight_loss"),
            height_cm=user.get("height", 170),
            age=user.get("age", 25),
            gender=user.get("gender", "male"),
            activity_level=user.get("activity_level", "moderate")
        )
    return {
        "daily_goals": active_goals,
        "user": user,
        "details": calc
    }


@app.get("/meals")
def get_meals(user=Depends(get_current_user_optional)):
    user_id = user["id"] if user else None
    meals = get_all_meals(user_id=user_id)
    return {
        "total_meals": len(meals),
        "meals": meals
    }


@app.get("/summary/today")
def today_summary(user=Depends(get_current_user_optional)):
    user_id = user["id"] if user else None
    return get_today_summary(user_id=user_id)


@app.get("/summary/progress")
def summary_progress(user=Depends(get_current_user_optional)):
    user_id = user["id"] if user else None
    summary = get_today_summary(user_id=user_id)
    active_goals = get_active_goals(user)

    calories_curr = round(float(summary.get("total_calories", 0)), 2)
    protein_curr = round(float(summary.get("total_protein", 0)), 2)
    carbs_curr = round(float(summary.get("total_carbs", 0)), 2)
    fat_curr = round(float(summary.get("total_fat", 0)), 2)

    return {
        "user": user,
        "progress": {
            "calories": {
                "current": calories_curr,
                "goal": active_goals["calories"],
                "percentage": round((calories_curr / max(active_goals["calories"], 1)) * 100, 2)
            },
            "protein": {
                "current": protein_curr,
                "goal": active_goals["protein"],
                "percentage": round((protein_curr / max(active_goals["protein"], 1)) * 100, 2)
            },
            "carbs": {
                "current": carbs_curr,
                "goal": active_goals["carbs"],
                "percentage": round((carbs_curr / max(active_goals["carbs"], 1)) * 100, 2)
            },
            "fat": {
                "current": fat_curr,
                "goal": active_goals["fat"],
                "percentage": round((fat_curr / max(active_goals["fat"], 1)) * 100, 2)
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


@app.get("/recommendations/today")
def today_recommendations(user=Depends(get_current_user_optional)):
    user_id = user["id"] if user else None
    summary = get_today_summary(user_id=user_id)
    meal_type = get_current_meal_type()
    active_goals = get_active_goals(user)
    user_goal = user.get("goal", "weight_loss") if user else "weight_loss"
    user_weight = float(user.get("weight", 70.0)) if user else 70.0

    recommendations = generate_recommendations(
        summary=summary,
        meal_type=meal_type,
        goals=active_goals,
        user_goal=user_goal,
        user_weight=user_weight
    )

    return {
        "meal_type": meal_type,
        "goal": user_goal,
        "recommendations": recommendations
    }


# --------------------------------------------------
# Food Detection & Meal Logging
# --------------------------------------------------

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    # Check file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file.")

    # Save uploaded image
    file_path = UPLOAD_DIR / file.filename
    contents = await file.read()

    with open(file_path, "wb") as f:
        f.write(contents)

    # Open image
    try:
        image = Image.open(file_path).convert("RGB")
    except (UnidentifiedImageError, OSError) as error:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="The uploaded file could not be read as an image.") from error

    # Run YOLO
    results = model.predict(
        source=image,
        imgsz=640,
        conf=0.05,
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
                "quantity": 1,
                "box": {
                    "x1": round(x1, 2),
                    "y1": round(y1, 2),
                    "x2": round(x2, 2),
                    "y2": round(y2, 2)
                }
            }

            nutrition = NORMALIZED_NUTRITION_DATA.get(normalize_food_name(food_name))
            if nutrition is not None:
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
        nutrition = NORMALIZED_NUTRITION_DATA.get(normalize_food_name(food_name))
        if nutrition is None:
            continue

        item = {
            "food": food_name,
            "quantity": quantity,
            "serving": nutrition.get("serving", "")
        }
        for nutrient in ("calories", "protein", "carbs", "fat", "fiber"):
            value = nutrition.get(nutrient)
            if isinstance(value, (int, float)):
                item[nutrient] = round(value * quantity, 2)
        meal_summary.append(item)

    total_nutrition_values = {
        nutrient: 0
        for nutrient in ("calories", "protein", "carbs", "fat", "fiber")
    }
    available_nutrients = set()
    for detection in detections:
        nutrition = detection.get("nutrition", {})
        quantity = detection["quantity"]
        for nutrient in total_nutrition_values:
            value = nutrition.get(nutrient)
            if isinstance(value, (int, float)):
                total_nutrition_values[nutrient] += value * quantity
                available_nutrients.add(nutrient)

    total_nutrition = {
        nutrient: round(value, 2) if nutrient in available_nutrients else None
        for nutrient, value in total_nutrition_values.items()
    }

    return {
        "filename": file.filename,
        "meal_type": get_current_meal_type(),
        "foods": foods,
        "meal_summary": meal_summary,
        "detections": detections,
        "total_objects": len(detections),
        "total_nutrition": total_nutrition
    }


@app.post("/save-meal")
def save_meal_api(request: SaveMealRequest, user=Depends(get_current_user_optional)):
    user_id = user["id"] if user else None
    meal_id = save_meal(
        request.meal_summary,
        request.total_nutrition,
        meal_type=request.meal_type,
        user_id=user_id
    )

    return {
        "message": "Meal saved successfully",
        "meal_id": meal_id,
        "meal_type": request.meal_type,
        "user_id": user_id
    }
