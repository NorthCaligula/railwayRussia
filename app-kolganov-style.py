from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import logging

app = Flask(__name__)
CORS(app)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionStyle = db['Styles']

@app.route('/api/kolganov-style/data/<string:name_obj>')
def get_style(name_obj):
    logger.info(f"🔍 Запрос на получение стиля для объекта: {name_obj}")

    style = collectionStyle.find_one({'_id': name_obj})
    if not style:
        logger.warning(f"⚠️ Стиль для объекта '{name_obj}' не найден в базе данных.")
        return jsonify({'error': 'Style not found'}), 404

    id_str = str(style['_id'])
    del style['_id']
    style['custom_id'] = id_str

    logger.info(f"✅ Найден стиль: {style}")
    return jsonify(style)

if __name__ == '__main__':
    logger.info("🚀 Старт сервиса стилей (порт 5004)...")
    app.run(port=5004, debug=True)
