from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import logging

app = Flask(__name__)
CORS(app)  # Включаем поддержку CORS

# Настроим логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionsConfig = db['Configurations']
collectionFeatures = db['FeatureCollections']
Features = db['Features']
collectionStyle = db['Styles']

@app.route("/api/ruszhdtransit/start")
def get_feature_info():
    logger.info("Запрос к API /api/ruszhdtransit/start")

    docs = list(collectionsConfig.find({}, {"_id": 1}))  # без сортировки в Mongo
    docs.sort(key=lambda d: int(d["_id"]))  # сортируем в Python как числа

    logger.info(f"Получено из базы {docs}")

    ids = [{"order": idx, "id": str(doc["_id"])} for idx, doc in enumerate(docs)]

    logger.info(f"Возвращаем {len(ids)} элементов в ответе")
    logger.info(f"Отправляем в ответе: {ids}")

    return jsonify(ids)

@app.route("/api/ruszhdtransit/work/<year>")
def get_data_for_year(year):
    logger.info(f"Запрос данных для года: {year}")

    # Получаем конфигурацию по году
    config = collectionsConfig.find_one({"_id": year})
    if not config:
        logger.warning(f"Конфигурация для года {year} не найдена")
        return jsonify({"error": "Нет данных для выбранного года"}), 404

    layers = []

    # Для каждого блока в конфигурации
    for item in config.get("features", []):
        f_collection_id = item.get("featureCollectionId")
        logger.info(f"Обработка коллекции: {f_collection_id}")

        # Получаем список id features
        f_collection_doc = collectionFeatures.find_one({"_id": f_collection_id})
        if not f_collection_doc:
            logger.warning(f"Коллекция {f_collection_id} не найдена")
            continue

        visible_raw = item.get("startFlag", False)
        visible = str(visible_raw).lower() in ["true", "1", "yes", "on"]
        logger.info(f"startFlag для слоя {f_collection_id}: {item.get('startFlag')}")

        layer = {
            "id": f_collection_id,
            "name": item.get("name", "Неизвестный слой"),
            "visible": visible,
            "style": {},
            "features": []
        }

        # Получаем стиль для фичи
        style = collectionStyle.find_one({"_id": item.get("style")}, {"_id": 0})
        if style:
            layer["style"] = style

        logger.info(f"Найдены стили {layer['style']}")

        for f_id in f_collection_doc.get("features", []):
            feature_doc = Features.find_one({"_id": f_id})
            if feature_doc:
                layer["features"].append(feature_doc)
            else:
                logger.warning(f"Фича {f_id} не найдена в коллекции {f_collection_id}")

        layers.append(layer)

    geojson = {
        "type": "FeatureCollection",
        "layers": layers
    }

    return jsonify(geojson)

if __name__ == '__main__':
    app.run(port=5001, debug=True)