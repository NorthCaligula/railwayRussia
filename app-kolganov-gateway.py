import json
import sys
from flask import Flask, jsonify, request
from flask_cors import CORS

import requests

app = Flask(__name__)
CORS(app)  # Включаем поддержку CORS

@app.route("/api/ruszhdtransit/welcome")
def get_feature_info():
    res = requests.get("http://127.0.0.1:5000/api/kolganov-object/features-info")
    print("log:")
    print(res.json())
    return res.json()


@app.route("/api/ruszhdtransit/features/<string:name_obj>")
def get_object(name_obj):
    resultObj = requests.get("http://127.0.0.1:5000/api/kolganov-object/data/" + name_obj)
    resultStl = requests.get("http://127.0.0.1:5052/api/kolganov-style/data/" + resultObj.json().get("name"))
    res = [resultObj.json(), resultStl.json()]
    return res


@app.route('/api/ruszhdtransit/import', methods=['POST'])
def handle_geojson_upload():
    # Получаем данные формы
    files = request.files.getlist('files')

    # Обрабатываем каждый файл
    results = []
    for file in files:
        filename = file.filename
        contents = file.read().decode('utf-8')  # Чтение содержимого файла как строки

        # Здесь можно дополнительно обработать данные GeoJSON
        print(f'Полученный файл: {filename}')
        print(contents)

        # Сохраняем результат для вывода
        results.append({
            'filename': filename,
            'contents': contents
        })

    # Возвращаем результаты клиенту
    return jsonify(results), 200

if __name__ == '__main__':
    app.run(port=5001, debug=True)
