from pathlib import Path
import shutil
import yaml

# --------------------------------------------------
# PATHS
# --------------------------------------------------

SOURCE = Path("data/raw/indian_food_v2")
OUTPUT = Path("data/processed/foodlens_20")

# --------------------------------------------------
# FOODLENS CLASSES
# --------------------------------------------------

SELECTED_CLASSES = [
    "chapati",
    "naan",
    "daal",
    "dal makhani",
    "dal tadka",
    "chana masala",
    "aloo gobi",
    "aloo matar",
    "bhindi masala",
    "kadai paneer",
    "palak paneer",
    "paneer butter masala",
    "biryani",
    "poha",
    "lassi",
    "bhatura",
    "aloo tikki",
    "kachori",
    "gulab jamun",
    "jalebi",
]

# --------------------------------------------------
# LOAD ORIGINAL YAML
# --------------------------------------------------

yaml_file = SOURCE / "data.yaml"

with open(yaml_file, "r", encoding="utf-8") as file:
    data = yaml.safe_load(file)

original_names = data["names"]

print("=" * 60)
print("FOODLENS 20-CLASS DATASET CREATOR")
print("=" * 60)

print("\nSelected classes:")

for new_id, class_name in enumerate(SELECTED_CLASSES):
    print(f"{new_id:2d} -> {class_name}")

# --------------------------------------------------
# FIND ORIGINAL CLASS IDs
# --------------------------------------------------

class_mapping = {}

for new_id, class_name in enumerate(SELECTED_CLASSES):

    if class_name not in original_names:
        print(f"\nERROR: Class not found: {class_name}")
        exit()

    old_id = original_names.index(class_name)

    class_mapping[old_id] = new_id

print("\nClass mapping created successfully.")

# --------------------------------------------------
# CREATE OUTPUT FOLDERS
# --------------------------------------------------

for split in ["train", "valid", "test"]:

    (OUTPUT / split / "images").mkdir(
        parents=True,
        exist_ok=True
    )

    (OUTPUT / split / "labels").mkdir(
        parents=True,
        exist_ok=True
    )

# --------------------------------------------------
# PROCESS DATASET
# --------------------------------------------------

total_images = 0
copied_images = 0
skipped_images = 0
total_objects = 0

for split in ["train", "valid", "test"]:

    print("\n" + "-" * 50)
    print("Processing:", split)
    print("-" * 50)

    image_folder = SOURCE / split / "images"
    label_folder = SOURCE / split / "labels"

    output_images = OUTPUT / split / "images"
    output_labels = OUTPUT / split / "labels"

    if not image_folder.exists():
        print("Image folder not found:", image_folder)
        continue

    images = list(image_folder.glob("*"))

    for image_file in images:

        total_images += 1

        label_file = label_folder / f"{image_file.stem}.txt"

        if not label_file.exists():
            continue

        text = label_file.read_text(
            encoding="utf-8"
        ).strip()

        if not text:
            continue

        new_labels = []

        for line in text.splitlines():

            values = line.split()

            if len(values) != 5:
                continue

            try:
                old_class_id = int(values[0])
            except ValueError:
                continue

            # Keep only selected classes
            if old_class_id not in class_mapping:
                continue

            new_class_id = class_mapping[old_class_id]

            new_line = (
                f"{new_class_id} "
                f"{values[1]} "
                f"{values[2]} "
                f"{values[3]} "
                f"{values[4]}"
            )

            new_labels.append(new_line)

        # No selected food in this image
        if not new_labels:
            skipped_images += 1
            continue

        # Copy image
        shutil.copy2(
            image_file,
            output_images / image_file.name
        )

        # Write new label
        output_label = output_labels / f"{image_file.stem}.txt"

        output_label.write_text(
            "\n".join(new_labels),
            encoding="utf-8"
        )

        copied_images += 1
        total_objects += len(new_labels)

    print("Images copied:", copied_images)

# --------------------------------------------------
# CREATE NEW data.yaml
# --------------------------------------------------

new_yaml = {
    "path": str(OUTPUT.resolve()),
    "train": "train/images",
    "val": "valid/images",
    "test": "test/images",
    "nc": len(SELECTED_CLASSES),
    "names": SELECTED_CLASSES,
}

with open(
    OUTPUT / "data.yaml",
    "w",
    encoding="utf-8"
) as file:

    yaml.dump(
        new_yaml,
        file,
        sort_keys=False,
        allow_unicode=True
    )

# --------------------------------------------------
# SUMMARY
# --------------------------------------------------

print("\n")
print("=" * 60)
print("DATASET CREATION COMPLETE")
print("=" * 60)

print("Original images scanned:", total_images)
print("Images copied:", copied_images)
print("Images skipped:", skipped_images)
print("Food objects copied:", total_objects)

print("\nNew dataset:")
print(OUTPUT.resolve())

print("\nClasses:", len(SELECTED_CLASSES))

print("\nDataset YAML:")
print(OUTPUT / "data.yaml")