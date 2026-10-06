from pathlib import Path
from collections import Counter


# ==========================================
# FOODLENS DATASET AUDIT
# ==========================================

DATASET_PATH = Path("data/raw/indian_food_v2")

splits = ["train", "valid", "test"]

total_images = 0
total_labels = 0
empty_labels = 0
missing_labels = 0
invalid_labels = 0

class_counts = Counter()


def check_label_file(label_file, number_of_classes):
    """
    Check one YOLO label file.
    """

    global invalid_labels
    global empty_labels

    if not label_file.exists():
        return "missing"

    text = label_file.read_text(encoding="utf-8").strip()

    if not text:
        empty_labels += 1
        return "empty"

    lines = text.splitlines()

    for line in lines:

        values = line.split()

        # YOLO detection format:
        # class x_center y_center width height

        if len(values) != 5:
            invalid_labels += 1
            continue

        try:
            class_id = int(values[0])

            x = float(values[1])
            y = float(values[2])
            width = float(values[3])
            height = float(values[4])

        except ValueError:
            invalid_labels += 1
            continue

        # Check class ID
        if class_id < 0 or class_id >= number_of_classes:
            invalid_labels += 1
            continue

        # Check coordinates
        if not (0 <= x <= 1):
            invalid_labels += 1
            continue

        if not (0 <= y <= 1):
            invalid_labels += 1
            continue

        if not (0 < width <= 1):
            invalid_labels += 1
            continue

        if not (0 < height <= 1):
            invalid_labels += 1
            continue

        class_counts[class_id] += 1

    return "valid"


# ==========================================
# READ CLASS INFORMATION
# ==========================================

import yaml

yaml_file = DATASET_PATH / "data.yaml"

if not yaml_file.exists():

    print("ERROR: data.yaml not found.")
    print("Expected:", yaml_file)
    exit()


with open(yaml_file, "r", encoding="utf-8") as file:
    data = yaml.safe_load(file)


names = data["names"]

number_of_classes = len(names)


print("=" * 60)
print("FOODLENS DATASET AUDIT")
print("=" * 60)

print("Dataset:", DATASET_PATH)
print("Classes:", number_of_classes)


# ==========================================
# CHECK EACH SPLIT
# ==========================================

for split in splits:

    image_folder = DATASET_PATH / split / "images"
    label_folder = DATASET_PATH / split / "labels"

    print("\n" + "-" * 50)
    print("SPLIT:", split)
    print("-" * 50)

    if not image_folder.exists():

        print("Image folder missing:", image_folder)
        continue

    images = list(image_folder.glob("*"))

    print("Images:", len(images))

    total_images += len(images)

    for image in images:

        label_file = label_folder / f"{image.stem}.txt"

        result = check_label_file(
            label_file,
            number_of_classes
        )

        if result == "missing":
            missing_labels += 1

        elif result != "missing":
            total_labels += 1


# ==========================================
# PRINT RESULTS
# ==========================================

print("\n")
print("=" * 60)
print("AUDIT SUMMARY")
print("=" * 60)

print("Total images:", total_images)
print("Label files:", total_labels)
print("Missing labels:", missing_labels)
print("Empty labels:", empty_labels)
print("Invalid label entries:", invalid_labels)


# ==========================================
# CLASS DISTRIBUTION
# ==========================================

print("\n")
print("=" * 60)
print("OBJECT COUNT BY CLASS")
print("=" * 60)

for class_id in range(number_of_classes):

    class_name = names[class_id]

    count = class_counts[class_id]

    print(f"{class_id:2d} | {class_name:25s} | {count}")