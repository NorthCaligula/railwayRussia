from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
import requests
import time

app = Flask(__name__)
CORS(app)

# Настроим логирование
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Маппинг маршрутов на микросервисы
SERVICE_MAP = {
    'auth': 'http://127.0.0.1:5002',
    'object': 'http://127.0.0.1:5001',
    'style': 'http://127.0.0.1:5004',
    'offer': 'http://127.0.0.1:5003'
}


# ==================== Роуты ====================

@app.route('/ruszhdtransit/<path:path>', methods=['GET', 'POST'])
def gateway(path):
    start_time = time.time()

    # Определим микросервис
    service_name = detect_service(path)
    service_url = SERVICE_MAP.get(service_name)
    if not service_url:
        logger.warning(f"Unknown service for path: {path}")
        return jsonify({'error': 'Unknown service'}), 404

    # Полный URL до микросервиса
    full_url = f"{service_url}/api/kolganov-{service_name}/{path.split('/')[-1]}"

    # Лог запроса
    logger.info(f"➡️ Request to service '{service_name}': {request.method} {full_url}")
    logger.info(f"Request data: {request.get_json(silent=True) or request.args}")

    try:
        # Проксируем запрос
        if request.method == 'GET':
            resp = requests.get(full_url, params=request.args)
        else:
            resp = requests.post(full_url, json=request.get_json())

        duration = time.time() - start_time
        logger.info(f"✅ Response from '{service_name}' in {duration:.2f}s: status {resp.status_code}")
        logger.info(f"Response data: {resp.text[:300]}")  # Ограничим до 300 символов

        return (resp.content, resp.status_code, resp.headers.items())

    except Exception as e:
        logger.error(f"❌ Error contacting '{service_name}': {e}")
        return jsonify({'error': 'Service unavailable'}), 500


# ==================== Вспомогательные ====================

def detect_service(path):
    """Определение микросервиса по пути запроса."""
    if path.startswith(('login', 'register', 'cities')):
        return 'auth'
    elif path.startswith(('start', 'work')):
        return 'object'
    elif path.startswith('data/'):
        return 'style'
    elif path.startswith('offer/'):
        return 'offer'
    return None


# ==================== Запуск ====================
if __name__ == '__main__':
    app.run(port=5000, debug=True)
