import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
import bcrypt
import jwt
import datetime

# Конфиги
JWT_SECRET = 'your-very-secret-key'  # Секрет для подписи JWT
JWT_ALGORITHM = 'HS256'
DB_CONFIG = {
    'dbname': 'app-kolganov-auth',
    'user': 'postgres',
    'password': 'changeme',
    'host': 'localhost',
    'port': 5432
}

# Инициализация Flask
app = Flask(__name__)
CORS(app)  # Включаем поддержку CORS

# Настройка логирования
logging.basicConfig(level=logging.DEBUG)  # Уровень логирования
logger = logging.getLogger(__name__)

# Соединение с PostgreSQL
def get_db_connection():
    logger.debug('Attempting to connect to the database...')
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        logger.debug('Database connection successful')
        return conn
    except Exception as e:
        logger.error(f"Error connecting to the database: {e}")
        raise


# Логика ручки логина
@app.route('/login', methods=['POST'])
def login():
    logger.info('Received a login request')

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    logger.debug(f"Received data - Username: {username}, Password: {'*' * len(password)}")

    if not username or not password:
        logger.warning('Missing username or password')
        return jsonify({'error': 'Missing username or password'}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    try:
        logger.debug(f"Looking for user {username} in the database")
        # Обновленный запрос, с учетом использования username вместо id
        cur.execute('''
            SELECT ua.username, ua.password_hash, pp.name
            FROM usersauth ua
            JOIN personprofile pp ON ua.username = pp.username
            WHERE ua.username = %s
        ''', (username,))
        user = cur.fetchone()

        if not user:
            logger.warning(f"User {username} not found")
            return jsonify({'error': 'User not found'}), 404

        _, password_hash, name = user
        logger.debug(f"User {username} found, checking password...")

        if not bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8')):
            logger.warning(f"Incorrect password for user {username}")
            return jsonify({'error': 'Incorrect password'}), 401

        logger.info(f"User {username} authenticated successfully")

        # Создаем JWT токен
        payload = {
            'sub': username,  # Используем username вместо id
            'username': username,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=30)  # токен живёт 30 минут
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        logger.debug(f"JWT token created for user {username}")

        # Логируем время входа, обновляем таблицу с username
        logger.debug(f"Updating login times for user {username}")
        cur.execute(''' 
            UPDATE usersauth 
            SET login_times = array_append(login_times, NOW()) 
            WHERE username = %s 
        ''', (username,))
        conn.commit()

        logger.info(f"Login time updated for user {username}")

        logger.info(f"RealName {name}")

        return jsonify({
            'access_token': token,
            'name': name,
            'state': 'correctUser'  # можно сделать 'correctAdmin' при необходимости
        })

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return jsonify({'error': 'An internal error occurred'}), 500

    finally:
        cur.close()
        conn.close()
        logger.debug(f"Database connection closed")

# Логика ручки регистрации
@app.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    username = data.get('username')
    password = data.get('password')
    name = data.get('name')
    gender = data.get('gender')
    city_id = data.get('city_id')

    # Проверка обязательных полей
    if not all([email, username, password, name, gender, city_id]):
        return jsonify({'error': 'Missing required fields'}), 400

    # Соединяемся с БД
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Проверяем, существует ли уже пользователь с таким email
        cur.execute('SELECT email FROM usersauth WHERE email = %s', (email,))
        if cur.fetchone():
            return jsonify({'error': 'Email already exists'}), 400

        # Хешируем пароль
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Проверяем, существует ли уже пользователь с таким логином
        cur.execute('SELECT username FROM usersauth WHERE username = %s', (username,))
        if cur.fetchone():
            return jsonify({'error': 'Username already exists'}), 400

        # Вставляем данные нового пользователя в таблицу usersauth
        cur.execute(''' 
            INSERT INTO usersauth (email, username, password_hash) 
            VALUES (%s, %s, %s) 
        ''', (email, username, password_hash))

        # Вставляем данные в таблицу PersonProfile с привязкой к username
        cur.execute(''' 
            INSERT INTO PersonProfile (username, name, gender, city_id) 
            VALUES (%s, %s, %s, %s) 
        ''', (username, name, gender, city_id))

        conn.commit()

        return jsonify({'message': 'User registered successfully'}), 201

    except Exception as e:
        logger.error(f"An error occurred: {e}")
        return jsonify({'error': 'An internal error occurred'}), 500

    finally:
        cur.close()
        conn.close()

@app.route('/cities', methods=['GET'])
def get_cities():
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Получаем все города из базы данных
        cur.execute('SELECT city_id, city_name FROM Cities')
        cities = cur.fetchall()

        # Формируем словарь с id города и его названием
        city_dict = {city_id: city_name for city_id, city_name in cities}

        # Отправляем словарь в ответе
        return jsonify(city_dict)

    except Exception as e:
        logger.error(f"An error occurred while fetching cities: {e}")
        return jsonify({'error': 'An internal error occurred'}), 500

    finally:
        cur.close()
        conn.close()

# Для запуска локально
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
