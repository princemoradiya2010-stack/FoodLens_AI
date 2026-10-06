from pathlib import Path
import yaml


# Dataset location
DATASET_PATH = Path("data/raw/indian_food_v2")


# YAML file
yaml_file = DATASET_PATH / "data.yaml"


# Check if YAML exists
if not yaml_file.exists():
    print("ERROR: data.yaml was not found!")
    print("Expected:", yaml_file)
    exit()


# Read YAML
with open(yaml_file, "r", encoding="utf-8") as file:
    data = yaml.safe_load(file)


print("=" * 50)
print("FOODLENS DATASET INFORMATION")
print("=" * 50)


# Number of classes
print("Number of classes:", data.get("nc"))


# Class names
names = data.get("names", [])

print("\nClasses:")
for i, name in enumerate(names):
    print(f"{i}: {name}")


# Count images
print("\nImage counts:")

for split in ["train", "valid", "test"]:

    image_folder = DATASET_PATH / split / "images"

    if image_folder.exists():

        images = list(image_folder.glob("*"))

        print(f"{split}: {len(images)} images")

    else:

        print(f"{split}: folder not found")


print("\nDataset inspection completed.")
