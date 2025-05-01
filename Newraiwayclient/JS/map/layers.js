import { map } from './init.js';
import { hexToRgba } from '../utils/colors.js';

export function createLayer(layerData) {
    const features = new ol.format.GeoJSON().readFeatures({
        type: 'FeatureCollection',
        features: layerData.features
    }, { featureProjection: 'EPSG:3857' });

    const vectorSource = new ol.source.Vector({ features });
    const layerStyle = createLayerStyle(layerData.style);

    const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        visible: layerData.visible || false,
        style: layerStyle,
        properties: { id: layerData.id, name: layerData.name }
    });

    vectorLayer.set('customLayer', true);
    map.addLayer(vectorLayer);

    return vectorLayer;
}

function createLayerStyle(styleConfig) {
    if (!styleConfig) return null;

    if ('radius' in styleConfig) {
        // Стиль для точек
        return new ol.style.Style({
            image: new ol.style.Circle({
                radius: styleConfig.radius || 5,
                fill: new ol.style.Fill({
                    color: hexToRgba(styleConfig.fillColor || '#0000ff',
                                   styleConfig.fillOpacity ?? 1)
                }),
                stroke: new ol.style.Stroke({
                    color: styleConfig.strokeColor || '#000000',
                    width: styleConfig.strokeWidth || 1
                })
            })
        });
    }

    // Стиль для линий/полигонов
    return new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: styleConfig.strokeColor || '#000000',
            width: styleConfig.strokeWidth || 2
        }),
        fill: new ol.style.Fill({
            color: styleConfig.fillColor
                ? hexToRgba(styleConfig.fillColor, styleConfig.fillOpacity ?? 0.1)
                : 'rgba(0,0,255,0.1)'
        })
    });
}

export function addLegendItem(layerData) {
    const legendItem = document.createElement('div');
    legendItem.classList.add('legend-item');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = layerData.visible || false;
    checkbox.dataset.layerId = layerData.id;

    const label = document.createElement('span');
    label.textContent = layerData.name;

    legendItem.appendChild(checkbox);
    legendItem.appendChild(label);

    document.querySelector('#legend-block .legend-placeholder').appendChild(legendItem);
}