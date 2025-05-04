// Инициализация карты OpenLayers
const map = new ol.Map({
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

function hexToRgba(hex, opacity) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${opacity})`;
}

let highlightedFeature = null; // Это будет хранить текущий выделенный объект
const highlightSource = new ol.source.Vector();
const highlightLayer = new ol.layer.Vector({
    source: highlightSource,
    style: new ol.style.Style({
        stroke: new ol.style.Stroke({
            color: '#5D74B0',
            width: 4
        }),
        fill: new ol.style.Fill({
            color: 'rgba(93, 116, 176, 0.2)' // мягкая полупрозрачная заливка
        })
    })
});
map.addLayer(highlightLayer);

const popupContainer = document.getElementById('popup');
const popupContent = document.getElementById('popup-content');
const popupOverlay = new ol.Overlay({
    element: popupContainer,
    positioning: 'bottom-center',
    stopEvent: true,
    offset: [0, -10]
});
map.addOverlay(popupOverlay);

map.on('click', function (evt) {
    // Проверяем, что клик не был по попапу
    if (evt.originalEvent.target.closest('#popup')) {
        return;
    }

    // Находим объект по клику
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
        if (layer && layer.get('interactive') === false) {
            return null;
        }
        return feature;
    });

    // Очищаем старую подсветку
    highlightSource.clear();
    document.querySelectorAll('.highlighted-legend').forEach(el => el.classList.remove('highlighted-legend'));

    // Если объект найден
    if (feature) {
        const geometry = feature.getGeometry().clone(); // Создаём копию геометрии объекта для подсветки

        // Создаём новый объект для подсветки
        highlightedFeature = new ol.Feature({
            geometry: geometry
        });

        let highlightStyle;
        let pulse = 0;

        // Если это точка, создаём стиль для подсветки
        if (geometry.getType() === 'Point') {
            const circleStyle = new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({color: 'rgba(93, 116, 176, 0.4)'}),
                stroke: new ol.style.Stroke({color: '#5D74B0', width: 2})
            });

            highlightStyle = new ol.style.Style({
                image: circleStyle
            });

            highlightedFeature.setStyle(highlightStyle);

            // Запускаем пульсацию
            if (window.pulseInterval) {
                clearInterval(window.pulseInterval);
            }

            window.pulseInterval = setInterval(() => {
                if (highlightedFeature) {
                    const radius = 8 + Math.abs(Math.sin(pulse)) * 4; // Пульсация радиуса от 8 до 12 пикселей
                    circleStyle.setRadius(radius);
                    pulse += 0.1;
                    highlightedFeature.changed(); // Сообщаем OpenLayers, что объект изменился
                }
            }, 50);

        } else {
            // Если это не точка (например, линия или полигон), создаём стиль подсветки
            highlightStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#5D74B0',
                    width: 6  // Увеличиваем ширину для линейных объектов
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(93, 116, 176, 0.2)'
                })
            });

            highlightedFeature.setStyle(highlightStyle);

            // Запускаем пульсацию для линии/полигона
            if (window.pulseInterval) {
                clearInterval(window.pulseInterval);
            }

            window.pulseInterval = setInterval(() => {
                if (highlightedFeature) {
                    const strokeWidth = 5 + Math.abs(Math.sin(pulse)) * 3; // Пульсация ширины линии от 5 до 8 пикселей
                    highlightedFeature.setStyle(new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: '#5D74B0',
                            width: strokeWidth
                        }),
                        fill: new ol.style.Fill({
                            color: 'rgba(93, 116, 176, 0.2)'
                        })
                    }));
                    pulse += 0.05;
                    highlightedFeature.changed(); // Сообщаем OpenLayers, что объект изменился
                }
            }, 50);
        }

        // Добавляем объект подсветки в слой
        highlightSource.clear();
        highlightSource.addFeature(highlightedFeature);

        // Подсвечиваем элемент в легенде
        const layer = map.getLayers().getArray().find(l => {
            const source = l.getSource && l.getSource();
            if (source && source.getFeatures) {
                return source.getFeatures().includes(feature);
            }
            return false;
        });

        if (layer) {
            const legendCheckbox = document.querySelector(`input[type="checkbox"][data-layer-id="${layer.get('id')}"]`);
            if (legendCheckbox) {
                legendCheckbox.parentElement.classList.add('highlighted-legend');
            }
        }


        let html = '<table class="popup-table"><thead><tr><th>Свойство</th><th>Значение</th></tr></thead><tbody>';
        if (layer) {
            const visible = layer.getVisible();
            const layerName = layer.get('name') || 'Без имени';
            html += `<div style="margin-bottom:10px;"><b>Слой:</b> ${layerName}</div>`;
            html += `<div style="margin-bottom:10px;">
        <label>Показать слой:
          <input type="checkbox" id="toggle-layer" ${visible ? "checked" : ""}>
        </label>
      </div>`;
        }

        let hasData = false;
        for (const key in feature.getProperties()) {
            if (key !== 'geometry') {
                hasData = true;
                html += `<tr><td>${key}</td><td>${feature.getProperties()[key]}</td></tr>`;
            }
        }

        html += "</tbody></table>";

        if (!hasData) {
            html += "<div style='margin-top:10px; font-style: italic;'>Данных об объекте нет</div>";
        }

        popupContent.innerHTML = html;
        popupOverlay.setPosition(evt.coordinate);

        if (layer) {
            const toggle = document.getElementById('toggle-layer');
            toggle.addEventListener('change', function () {
                layer.setVisible(this.checked);

                // Найти галочку в легенде и поменять её состояние
                const legendCheckbox = document.querySelector(`input[type="checkbox"][data-layer-id="${layer.get('id')}"]`);
                if (legendCheckbox) {
                    legendCheckbox.checked = this.checked;
                }
            });
            // Добавляем слушатель на изменение видимости слоя
            layer.on('change:visible', function () {
                const popupCheckbox = document.getElementById('toggle-layer');
                if (popupCheckbox && popupCheckbox.checked !== layer.getVisible()) {
                    popupCheckbox.checked = layer.getVisible();
                }
            });
        }
    } else {
        // Если объект не найден, скрываем попап и очищаем подсветку
        popupOverlay.setPosition(undefined);

        if (highlightedFeature) {
            highlightSource.clear();
            highlightedFeature = null;
        }

        if (window.pulseInterval) {
            clearInterval(window.pulseInterval);
            window.pulseInterval = null;
        }

        // Убираем выделение в легенде
        document.querySelectorAll('.highlighted-legend').forEach(el => el.classList.remove('highlighted-legend'));
    }
});

const popupCloser = document.getElementById('popup-closer');
popupCloser.onclick = function () {
    popupOverlay.setPosition(undefined);
    popupCloser.blur();

    if (highlightedFeature) {
        highlightSource.clear(); // Очистить подсветку
        highlightedFeature = null;
    }

    if (window.pulseInterval) {
        clearInterval(window.pulseInterval);
    }

    // Убираем выделение в легенде
    document.querySelectorAll('.highlighted-legend').forEach(el => el.classList.remove('highlighted-legend'));

    return false;
};
