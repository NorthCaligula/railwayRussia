import { map } from './init.js';
import { highlightedFeature, highlightSource } from './highlight.js';
import { popupOverlay, popupContent } from './popup.js';
import { hexToRgba } from '../utils/colors.js';

// Основной обработчик кликов на карте
export function setupMapClickHandler() {
    map.on('click', function(evt) {
        if (evt.originalEvent.target.closest('#popup')) return;

        const feature = map.forEachFeatureAtPixel(evt.pixel, function(feature) {
            return feature;
        });

        highlightSource.clear();
        document.querySelectorAll('.highlighted-legend').forEach(el => el.classList.remove('highlighted-legend'));

        if (feature) {
            handleFeatureClick(feature, evt.coordinate);
        } else {
            clearSelection();
        }
    });
}

function handleFeatureClick(feature, coordinate) {
    const geometry = feature.getGeometry().clone();
    highlightedFeature = new ol.Feature({ geometry });

    setupHighlightStyle(geometry);
    highlightSource.addFeature(highlightedFeature);

    const layer = findLayerForFeature(feature);
    highlightLegendItem(layer);

    updatePopupContent(feature, layer, coordinate);
}

function clearSelection() {
    popupOverlay.setPosition(undefined);
    highlightSource.clear();
    highlightedFeature = null;

    if (window.pulseInterval) {
        clearInterval(window.pulseInterval);
    }

    document.querySelectorAll('.highlighted-legend').forEach(el => el.classList.remove('highlighted-legend'));
}

// Остальные вспомогательные функции...