from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)  #Включаем поддержку CORS

#Подключение к MongoDB
client = MongoClient('mongodb://localhost:27017/')
db = client['RussiaRailway']
collectionFeatures = db['Features']
collectionStyle = db['Style']

@app.route('/api/features-info')
def get_features_info():
    features = list(collectionFeatures.find({}, {'_id': False}))
    print(features)
    result = {
        'count': len(features),
        'names': [feature.get('name') for feature in features if 'name' in feature]
    }
    print(jsonify(result))
    print(result)
    return jsonify(result)

@app.route('/api/railways')
def get_railways():
    features = list(collectionFeatures.find({}, {'_id': False}))
    print(jsonify(features))
    print(features)
    return jsonify(features)

@app.route('/api/styles/<string:object_type>')
def get_style(object_type):
    style = collectionStyle.find_one({'type': object_type}, {'_id': False})
    print(jsonify(style))
    print(style)
    return jsonify(style)

@app.route('/api/kolganov-object/features-info')
def get_features_info_new():
    features = list(collectionFeatures.find({}, {'_id': False}))
    result = {
        'count': len(features),
        'names': [feature.get('name') for feature in features if 'name' in feature]
    }
    print("log")
    print(result)
    return jsonify(result)

##Добавить выявление нужного объекта
@app.route('/api/kolganov-object/data/<string:name_obj>')
def get_object(name_obj):
    features = collectionFeatures.find_one({'name': name_obj})
    id_str = str(features['_id'])
    del features['_id']
    features['custom_id'] = id_str
    print(features)
    return features

if __name__ == '__main__':
    app.run(port=5000, debug=True)