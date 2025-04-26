import bcrypt

# Данные пользователей
users = [
    {"username": "user1", "password": "password1", "email": "user1@example.com"},
    {"username": "user2", "password": "password2", "email": "user2@example.com"},
    {"username": "user3", "password": "password3", "email": "user3@example.com"},
    {"username": "user4", "password": "password4", "email": "user4@example.com"},
    {"username": "user5", "password": "password5", "email": "user5@example.com"},
]

# Генерация SQL-запроса
print("-- Скопируй этот запрос в свою базу PostgreSQL:\n")
for user in users:
    hashed_password = bcrypt.hashpw(user["password"].encode('utf-8'), bcrypt.gensalt()).decode()
    sql_line = f"INSERT INTO users (username, password_hash, email) VALUES ('{user['username']}', '{hashed_password}', '{user['email']}');"
    print(sql_line)
