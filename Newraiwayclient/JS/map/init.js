// Инициализация карты OpenLayers
export const map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.OSM()
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([37.618423, 55.751244]), // Центр - Москва
        zoom: 6
    })
});