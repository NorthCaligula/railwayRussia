import bcrypt

# Данные пользователей
users = [
    {"username": "test", "password": "test", "email": "test@example.com"},
]

# Генерация SQL-запроса
print("-- Скопируй этот запрос в свою базу PostgreSQL:\n")
for user in users:
    hashed_password = bcrypt.hashpw(user["password"].encode('utf-8'), bcrypt.gensalt()).decode()
    sql_line = f"INSERT INTO users (username, password_hash, email) VALUES ('{user['username']}', '{hashed_password}', '{user['email']}');"
    print(sql_line)
