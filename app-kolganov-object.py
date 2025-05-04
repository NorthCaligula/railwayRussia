from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import logging
import requests

app = Flask(__name__)
CORS(app)  # Включаем поддержку CORS

# Настроим логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# URL сервиса стилей
STYLE_SERVICE_URL = 'http://127.0.0.1:5004'  # Здесь порт, на котором работает сервис стилей

# Стандартный стиль, который будет использоваться, если стиль не подгрузился
DEFAULT_STYLE = {
    "color": "#000000",  # Черный цвет
    "strokeWidth": 2,    # Толщина линии
    "stroke": "#000000"  # Черная линия
}
# Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionsConfig = db['Configurations']
collectionFeatures = db['FeatureCollections']
Features = db['Features']

@app.route("/api/kolganov-object/start")
def get_feature_info():
    logger.info("Запрос к API /api/ruszhdtransit/start")

    docs = list(collectionsConfig.find({}, {"_id": 1}))  # без сортировки в Mongo
    docs.sort(key=lambda d: int(d["_id"]))  # сортируем в Python как числа

    logger.info(f"Получено из базы {docs}")

    ids = [{"order": idx, "id": str(doc["_id"])} for idx, doc in enumerate(docs)]

    logger.info(f"Возвращаем {len(ids)} элементов в ответе")
    logger.info(f"Отправляем в ответе: {ids}")

    return jsonify(ids)

@app.route("/api/kolganov-object/<year>")
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

        is_back_raw = item.get("isBack", False)
        is_back = str(is_back_raw).lower() in ["true", "1", "yes", "on"]
        logger.info(f"isBack для слоя {f_collection_id}: {item.get('isBack')}")

        # Структура слоя
        layer = {
            "id": f_collection_id,
            "name": item.get("name", "Неизвестный слой"),
            "visible": visible,
            "style": DEFAULT_STYLE,  # Стандартный стиль по умолчанию
            "isBack": is_back,
            "features": []
        }

        # Получаем стиль через HTTP-запрос
        style_id = item.get("style")  # Это ID стиля
        logger.info(f"Найден стиль для коллекции {f_collection_id}: {style_id}")
        try:
            # Обращаемся к сервису стилей
            response = requests.get(f"{STYLE_SERVICE_URL}/api/kolganov-style/data/{style_id}")
            if response.status_code == 200:
                style = response.json()  # Десериализация данных
                layer["style"] = style
                logger.info(f"Найден стиль для коллекции {f_collection_id}: {style}")
            else:
                logger.warning(f"Стиль для коллекции {f_collection_id} не найден (код {response.status_code})")
        except requests.exceptions.RequestException as e:
            logger.error(f"Ошибка при обращении к сервису стилей: {e}")
            # В случае ошибки оставляем стандартный стиль
            layer["style"] = DEFAULT_STYLE

        # Получаем фичи для слоя
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