from pathlib import Path
import yaml
from collections import Counter

DATASET = Path("data/processed/foodlens_20")

print("=" * 60)
print("FOODLENS 20-CLASS DATASET VERIFICATION")
print("=" * 60)

# Load YAML
yaml_file = DATASET / "data.yaml"

with open(yaml_file, "r", encoding="utf-8") as file:
    data = yaml.safe_load(file)

names = data["names"]

print("\nNumber of classes:", len(names))

print("\nClasses:")
for i, name in enumerate(names):
    print(f"{i:2d} -> {name}")

# Check every split
for split in ["train", "valid", "test"]:

    image_folder = DATASET / split / "images"
    label_folder = DATASET / split / "labels"

    images = list(image_folder.glob("*"))
    labels = list(label_folder.glob("*.txt"))

    print("\n" + "-" * 50)
    print(split.upper())
    print("-" * 50)

    print("Images:", len(images))
    print("Labels:", len(labels))

    missing_labels = 0
    empty_labels = 0
    invalid_labels = 0

    class_counts = Counter()

    for image in images:

        label_file = label_folder / f"{image.stem}.txt"

        if not label_file.exists():
            missing_labels += 1
            continue

        text = label_file.read_text(
            encoding="utf-8"
        ).strip()

        if not text:
            empty_labels += 1
            continue

        for line in text.splitlines():

            values = line.split()

            if len(values) != 5:
                invalid_labels += 1
                continue

            try:
                class_id = int(values[0])
            except ValueError:
                invalid_labels += 1
                continue

            if class_id < 0 or class_id >= len(names):
                invalid_labels += 1
                continue

            class_counts[class_id] += 1

    print("Missing labels:", missing_labels)
    print("Empty labels:", empty_labels)
    print("Invalid labels:", invalid_labels)

    print("\nObject counts:")

    for class_id, name in enumerate(names):
        print(
            f"{class_id:2d} | "
            f"{name:25s} | "
            f"{class_counts[class_id]}"
        )

print("\n")
print("=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)