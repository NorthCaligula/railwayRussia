import { map } from './init.js';

export let highlightedFeature = null;
export const highlightSource = new ol.source.Vector();

export const highlightLayer = new ol.layer.Vector({
    source: highlightSource,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#5D74B0',
            width: 4
        }),
        fill: new ol.style.Fill({
            color: 'rgba(93, 116, 176, 0.2)'
        })
    })
});

map.addLayer(highlightLayer);