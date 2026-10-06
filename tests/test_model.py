from ultralytics import YOLO
from pathlib import Path

model_path = Path("../models/foodlens_yolo11s_best.pt")

print("Model exists:", model_path.exists())

model = YOLO(str(model_path))

print("Model loaded successfully!")
print("Number of classes:", len(model.names))
print("Classes:")

for class_id, class_name in model.names.items():
    print(class_id, "->", class_name)