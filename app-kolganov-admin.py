import os
import json
import uuid
import re
from pymongo import MongoClient
import logging
from tkinter import Tk, filedialog

# Настройка логов
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Mongo
client = MongoClient("mongodb://localhost:27017/")
db = client["RussiaRailway"]
Features = db["Features"]
FeatureCollections = db["FeatureCollections"]


def get_features_from_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    if filepath.endswith((".geojson", ".json")):
        data = json.loads(content)
        return data.get("features", [])
    elif filepath.endswith((".geojsonl", ".jsonl")):
        return [json.loads(line) for line in content.splitlines() if line.strip()]
    else:
        raise ValueError("Формат файла не поддерживается")


def get_next_feature_id(start_from=0):
    existing_ids = Features.find({}, {"_id": 1})
    max_id = start_from

    for doc in existing_ids:
        match = re.match(r"feature_(\d+)", doc["_id"])
        if match:
            max_id = max(max_id, int(match.group(1)))

    current = max_id + 1
    while True:
        yield f"feature_{current}"
        current += 1


def get_unique_collection_name(base_name):
    existing_ids = FeatureCollections.distinct("_id")
    if base_name not in existing_ids:
        return base_name

    suffix = 1
    while True:
        new_id = f"{base_name}_copy_{suffix}"
        if new_id not in existing_ids:
            return new_id
        suffix += 1


def select_file():
    root = Tk()
    root.withdraw()  # Скрыть основное окно
    file_path = filedialog.askopenfilename(
        title="Выберите GeoJSON или GeoJSONL файл",
        filetypes=[("GeoJSON files", "*.geojson *.json *.geojsonl *.jsonl")]
    )
    return file_path


def main():
    filepath = select_file()

    if not filepath:
        logger.warning("Файл не выбран. Завершение.")
        return

    logger.info(f"Загрузка данных из: {filepath}")
    features = get_features_from_file(filepath)

    if not features:
        logger.warning("Файл не содержит features. Прекращаю работу.")
        return

    id_gen = get_next_feature_id()
    new_feature_ids = []

    for feature in features:
        new_id = next(id_gen)
        feature["_id"] = new_id
        Features.insert_one(feature)
        new_feature_ids.append(new_id)

    base_name = os.path.splitext(os.path.basename(filepath))[0]
    collection_id = get_unique_collection_name(base_name)

    FeatureCollections.insert_one({
        "_id": collection_id,
        "features": new_feature_ids
    })

    logger.info(f"Загружено {len(new_feature_ids)} features")
    logger.info(f"Создана коллекция: {collection_id}")


if __name__ == "__main__":
    main()
