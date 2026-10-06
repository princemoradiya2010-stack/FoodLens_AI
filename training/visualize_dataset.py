from pathlib import Path
import random

import cv2
import yaml


DATASET = Path("data/processed/foodlens_20")

SPLIT = "train"

NUM_IMAGES = 12

OUTPUT = Path("results/dataset_preview")
OUTPUT.mkdir(parents=True, exist_ok=True)


# -----------------------------
# Load class names
# -----------------------------

with open(DATASET / "data.yaml", "r", encoding="utf-8") as file:
    data = yaml.safe_load(file)

names = data["names"]


# -----------------------------
# Get images
# -----------------------------

image_folder = DATASET / SPLIT / "images"
label_folder = DATASET / SPLIT / "labels"

images = list(image_folder.glob("*"))

random.seed(42)

selected_images = random.sample(
    images,
    min(NUM_IMAGES, len(images))
)


# -----------------------------
# Draw bounding boxes
# -----------------------------

for image_path in selected_images:

    image = cv2.imread(str(image_path))

    if image is None:
        continue

    height, width = image.shape[:2]

    label_path = label_folder / f"{image_path.stem}.txt"

    if not label_path.exists():
        continue

    lines = label_path.read_text(
        encoding="utf-8"
    ).strip().splitlines()

    for line in lines:

        values = line.split()

        if len(values) != 5:
            continue

        class_id = int(values[0])

        x_center = float(values[1])
        y_center = float(values[2])
        box_width = float(values[3])
        box_height = float(values[4])

        # YOLO -> pixel coordinates

        x1 = int(
            (x_center - box_width / 2) * width
        )

        y1 = int(
            (y_center - box_height / 2) * height
        )

        x2 = int(
            (x_center + box_width / 2) * width
        )

        y2 = int(
            (y_center + box_height / 2) * height
        )

        # Keep coordinates inside image

        x1 = max(0, x1)
        y1 = max(0, y1)
        x2 = min(width - 1, x2)
        y2 = min(height - 1, y2)

        # Draw box

        cv2.rectangle(
            image,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

        label = names[class_id]

        cv2.putText(
            image,
            label,
            (x1, max(y1 - 10, 20)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 0),
            2
        )

    output_path = OUTPUT / image_path.name

    cv2.imwrite(
        str(output_path),
        image
    )


print("=" * 60)
print("DATASET VISUALIZATION COMPLETE")
print("=" * 60)

print("Images checked:", len(selected_images))
print("Preview folder:")
print(OUTPUT.resolve())