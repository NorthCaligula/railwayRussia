import { map } from './init.js';

export const popupContainer = document.getElementById('popup');
export const popupContent = document.getElementById('popup-content');

export const popupOverlay = new ol.Overlay({
    element: popupContainer,
    positioning: 'bottom-center',
    stopEvent: true,
    offset: [0, -10]
});
map.addOverlay(popupOverlay);

export const popupCloser = document.getElementById('popup-closer');
popupCloser.onclick = function() {
    popupOverlay.setPosition(undefined);
    popupCloser.blur();
    return false;
};