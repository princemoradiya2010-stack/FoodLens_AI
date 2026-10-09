from pathlib import Path
from collections import Counter
import yaml


# ============================================================
# FoodLens AI - Class Distribution Analyzer
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parent.parent

DATASET = (
    PROJECT_ROOT
    / "data"
    / "raw"
    / "indian_food_yolo26"
)

YAML_FILE = DATASET / "data.yaml"


# ============================================================
# Load YAML
# ============================================================

print("=" * 70)
print("FoodLens AI - Class Distribution Analysis")
print("=" * 70)

with open(YAML_FILE, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)


names = data["names"]

if isinstance(names, list):
    class_names = names

elif isinstance(names, dict):
    class_names = [
        names[i]
        for i in sorted(names.keys(), key=lambda x: int(x))
    ]

else:
    raise ValueError("Invalid class names format")


print("\nTotal classes:", len(class_names))


# ============================================================
# Count annotations
# ============================================================

train_counts = Counter()
valid_counts = Counter()
test_counts = Counter()


def read_labels(label_folder, counter):

    if not label_folder.exists():
        print("❌ Folder not found:", label_folder)
        return

    for label_file in label_folder.glob("*.txt"):

        with open(
            label_file,
            "r",
            encoding="utf-8"
        ) as f:

            for line in f:

                line = line.strip()

                if not line:
                    continue

                parts = line.split()

                # YOLO format:
                # class x_center y_center width height

                class_id = int(parts[0])

                counter[class_id] += 1


# ============================================================
# Read train
# ============================================================

print("\nReading training labels...")

read_labels(
    DATASET / "train" / "labels",
    train_counts
)


# ============================================================
# Read validation
# ============================================================

print("Reading validation labels...")

read_labels(
    DATASET / "valid" / "labels",
    valid_counts
)


# ============================================================
# Read test
# ============================================================

print("Reading test labels...")

read_labels(
    DATASET / "test" / "labels",
    test_counts
)


# ============================================================
# Print table
# ============================================================

print("\n")
print("=" * 70)
print("CLASS DISTRIBUTION")
print("=" * 70)

print(
    f"{'ID':<5}"
    f"{'CLASS':<35}"
    f"{'TRAIN':>10}"
    f"{'VALID':>10}"
    f"{'TEST':>10}"
    f"{'TOTAL':>10}"
)

print("-" * 70)


results = []


for class_id, class_name in enumerate(class_names):

    train = train_counts[class_id]
    valid = valid_counts[class_id]
    test = test_counts[class_id]

    total = train + valid + test

    results.append(
        (
            class_id,
            class_name,
            train,
            valid,
            test,
            total
        )
    )

    print(
        f"{class_id:<5}"
        f"{class_name:<35}"
        f"{train:>10}"
        f"{valid:>10}"
        f"{test:>10}"
        f"{total:>10}"
    )


# ============================================================
# Statistics
# ============================================================

print("\n")
print("=" * 70)
print("STATISTICS")
print("=" * 70)


totals = [
    row[5]
    for row in results
]


print("Total annotations:", sum(totals))

print(
    "Average annotations/class:",
    round(sum(totals) / len(totals), 2)
)


# ============================================================
# Weak classes
# ============================================================

print("\n")
print("=" * 70)
print("⚠️ LOW-DATA CLASSES")
print("=" * 70)

low_classes = [
    row
    for row in results
    if row[5] < 30
]


if low_classes:

    for row in low_classes:

        print(
            f"{row[0]:3} | "
            f"{row[1]:35} | "
            f"Total: {row[5]}"
        )

else:

    print("No classes have fewer than 30 annotations.")


# ============================================================
# Strong classes
# ============================================================

print("\n")
print("=" * 70)
print("⭐ HIGH-DATA CLASSES")
print("=" * 70)

high_classes = sorted(
    results,
    key=lambda x: x[5],
    reverse=True
)


for row in high_classes[:15]:

    print(
        f"{row[0]:3} | "
        f"{row[1]:35} | "
        f"Total: {row[5]}"
    )


# ============================================================
# Missing classes
# ============================================================

print("\n")
print("=" * 70)
print("❌ CLASSES WITH NO ANNOTATIONS")
print("=" * 70)

missing = [
    row
    for row in results
    if row[5] == 0
]


if missing:

    for row in missing:
        print(
            f"{row[0]:3} | {row[1]}"
        )

else:

    print("Every class has annotations.")


# ============================================================
# Final recommendation
# ============================================================

print("\n")
print("=" * 70)
print("ANALYSIS COMPLETED")
print("=" * 70)

print(
    "\nNext step:"
    "\n1. Review class distribution."
    "\n2. Identify weak classes."
    "\n3. Decide whether to use all 81 classes."
    "\n4. If necessary, create a balanced ~50-class FoodLens dataset."
    "\n5. Then train YOLO26."
)

print()