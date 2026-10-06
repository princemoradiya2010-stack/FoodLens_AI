from ultralytics import YOLO
import torch


# Check GPU
print("CUDA available:", torch.cuda.is_available())

if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
else:
    print("GPU not available")


# Load pretrained YOLO model
model = YOLO("yolo11n.pt")

print("YOLO model loaded successfully")


# Run detection
results = model.predict(
    source="https://ultralytics.com/images/bus.jpg",
    device=0,
    save=True
)

print("Detection completed!")
