from pathlib import Path
import yaml


# ============================================================
# FoodLens AI - Indian Food Dataset Inspector
# ============================================================

# Project root:
# D:\FoodLens_AI
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Dataset location:
DATASET = PROJECT_ROOT / "data" / "raw" / "indian_food_yolo26"

# YAML file
YAML_FILE = DATASET / "data.yaml"


# ============================================================
# Helper functions
# ============================================================

def count_images(folder):
    """Count image files inside a folder."""
    
    if not folder.exists():
        return 0

    extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".webp"
    }

    return sum(
        1
        for file in folder.rglob("*")
        if file.is_file()
        and file.suffix.lower() in extensions
    )


def count_labels(folder):
    """Count YOLO label files inside a folder."""

    if not folder.exists():
        return 0

    return len(
        list(folder.rglob("*.txt"))
    )


def print_separator():
    print("\n" + "=" * 60)


# ============================================================
# Start
# ============================================================

print("=" * 60)
print("FoodLens AI - Dataset Inspection")
print("=" * 60)

print("\nProject root:")
print(PROJECT_ROOT)

print("\nDataset:")
print(DATASET)

print("\nYAML:")
print(YAML_FILE)


# ============================================================
# Check dataset
# ============================================================

if not DATASET.exists():

    print("\n❌ Dataset folder not found!")
    print("Expected:")
    print(DATASET)

    print("\nCheck that this folder exists:")
    print(
        PROJECT_ROOT
        / "data"
        / "raw"
        / "indian_food_yolo26"
    )

    exit()


print("\n✅ Dataset folder found")


# ============================================================
# Check data.yaml
# ============================================================

if not YAML_FILE.exists():

    print("\n❌ data.yaml not found!")

    print("\nExpected:")
    print(YAML_FILE)

    exit()


print("✅ data.yaml found")


# ============================================================
# Read data.yaml
# ============================================================

try:

    with open(
        YAML_FILE,
        "r",
        encoding="utf-8"
    ) as file:

        data = yaml.safe_load(file)

except Exception as e:

    print("\n❌ Could not read data.yaml")
    print("Error:", e)

    exit()


# ============================================================
# Dataset information
# ============================================================

names = data.get("names", [])
nc = data.get("nc", len(names))

print_separator()

print("DATASET INFORMATION")

print_separator()

print("Number of classes:", nc)

print("\nDataset paths from data.yaml:")

print("Train:", data.get("train"))
print("Validation:", data.get("val"))
print("Test:", data.get("test"))


# ============================================================
# Check class names
# ============================================================

print_separator()

print("CLASS LIST")

print_separator()

if isinstance(names, dict):

    for class_id, class_name in names.items():

        print(
            f"{int(class_id):3} : {class_name}"
        )

elif isinstance(names, list):

    for class_id, class_name in enumerate(names):

        print(
            f"{class_id:3} : {class_name}"
        )

else:

    print("⚠️ Could not read class names correctly.")


# ============================================================
# Count images and labels
# ============================================================

print_separator()

print("DATASET SPLITS")

print_separator()


total_images = 0
total_labels = 0


for split in ["train", "valid", "test"]:

    split_folder = DATASET / split

    print("\n" + "-" * 60)

    print(split.upper())

    print("-" * 60)

    if not split_folder.exists():

        print("❌ Folder not found:")
        print(split_folder)

        continue


    # Standard Roboflow structure
    images_folder = split_folder / "images"
    labels_folder = split_folder / "labels"


    images = count_images(images_folder)
    labels = count_labels(labels_folder)


    print("Folder :", split_folder)

    print("Images :", images)

    print("Labels :", labels)


    # Warn if mismatch
    if images != labels:

        print(
            "⚠️ Warning: image and label counts are different."
        )

    else:

        print(
            "✅ Image/label count matches."
        )


    total_images += images
    total_labels += labels


# ============================================================
# Total dataset
# ============================================================

print_separator()

print("TOTAL DATASET")

print_separator()

print("Total images :", total_images)
print("Total labels :", total_labels)


# ============================================================
# Basic dataset health check
# ============================================================

print_separator()

print("DATASET HEALTH CHECK")

print_separator()


if total_images == 0:

    print("❌ No images found.")

else:

    print("✅ Images detected.")


if total_labels == 0:

    print("❌ No YOLO labels found.")

else:

    print("✅ YOLO labels detected.")


if nc == len(names):

    print(
        f"✅ Class count matches: {nc}"
    )

else:

    print(
        f"⚠️ Class mismatch: nc={nc}, "
        f"names={len(names)}"
    )


# ============================================================
# Final message
# ============================================================

print_separator()

print("INSPECTION COMPLETED")

print_separator()

print(
    "\nNext step: analyze the class distribution "
    "before training YOLO26."
)

print()