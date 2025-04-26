from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)  #Включаем поддержку CORS

#Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionStyle = db['Style']

@app.route('/api/kolganov-style/data/<string:name_obj>')
def get_style(name_obj):
    style = collectionStyle.find_one({'type': name_obj})
    id_str = str(style['_id'])
    del style['_id']
    style['custom_id'] = id_str
    print(style)
    return style

if __name__ == '__main__':
    app.run(port=5052, debug=True)