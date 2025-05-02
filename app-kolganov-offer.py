from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
import logging
import time
import jwt
from datetime import datetime

JWT_SECRET = 'your-very-secret-key'
JWT_ALGORITHM = 'HS256'

app = Flask(__name__)
CORS(app)  # Включаем поддержку CORS

# Настроим логирование
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionsComment = db['textOffer']


@app.route("/offer/text", methods=['POST'])
def get_offer_text():
    logger.info("➡️ Запрос к API /offer/text")

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("⛔ Отсутствует или неверный заголовок Authorization")
        return jsonify({'error': 'Missing or invalid Authorization header'}), 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get('username')
        if not username:
            logger.warning("⚠️ Токен не содержит имя пользователя")
            raise jwt.InvalidTokenError("No username in token")
    except jwt.ExpiredSignatureError:
        logger.warning("⏰ Токен истёк")
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError as e:
        logger.warning(f"🔐 Неверный токен: {e}")
        return jsonify({'error': f'Invalid token: {str(e)}'}), 401

    data = request.get_json()
    comment = data.get("comment", "").strip()

    if not comment:
        logger.warning(f"📝 Пустой комментарий от пользователя: {username}")
        return jsonify({'error': 'Пустой комментарий'}), 400

    doc = {
        'username': username,
        'comment': comment,
        'timestamp': datetime.utcnow()
    }

    try:
        collectionsComment.insert_one(doc)
        logger.info(f"✅ Сохранено предложение от {username}: '{comment}'")
        return jsonify({'status': 'ok'}), 200
    except Exception as e:
        logger.error(f"💥 Ошибка при сохранении предложения в MongoDB: {e}")
        return jsonify({'error': 'Не удалось сохранить предложение'}), 500

@app.route("/offer/data", methods=['POST'])
def get_offer_data():
    logger.info("➡️ Запрос к API /offer/data")

    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("⛔ Отсутствует или неверный заголовок Authorization")
        return jsonify({'error': 'Missing or invalid Authorization header'}), 401

    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        username = payload.get('username')
        if not username:
            logger.warning("⚠️ Токен не содержит имя пользователя")
            raise jwt.InvalidTokenError("No username in token")
    except jwt.ExpiredSignatureError:
        logger.warning("⏰ Токен истёк")
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError as e:
        logger.warning(f"🔐 Неверный токен: {e}")
        return jsonify({'error': f'Invalid token: {str(e)}'}), 401

    try:
        data = request.get_json()

        geojson_data = data.get("geojson")
        year_id = data.get("year_id")

        if not geojson_data or not year_id:
            logger.warning(f"📭 Отсутствуют geojson или year_id от пользователя: {username}")
            return jsonify({'error': 'geojson и year_id обязательны'}), 400

        doc = {
            'username': username,
            'geojson': geojson_data,
            'year_id': year_id,
            'timestamp': datetime.utcnow()
        }

        collectionsComment.insert_one(doc)
        logger.info(f"✅ Сохранено гео-предложение от {username} для года {year_id}")
        return jsonify({'status': 'ok'}), 200

    except Exception as e:
        logger.error(f"💥 Ошибка при обработке geojson предложения: {e}")
        return jsonify({'error': 'Не удалось сохранить предложение'}), 500

if __name__ == '__main__':
    app.run(port=5003, debug=True)