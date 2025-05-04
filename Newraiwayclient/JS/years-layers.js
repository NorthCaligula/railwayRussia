
// Загружаем данные по годам
async function loadYears() {
    try {
        const res = await fetch('http://127.0.0.1:5000/ruszhdtransit/start');
        const data = await res.json();
        const container = document.getElementById('years-container');
        const sorted = data.sort((a, b) => a.order - b.order);

        sorted.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.id;
            btn.classList.add('year-button');
            btn.onclick = () => handleYearButtonClick(item, btn);
            container.appendChild(btn);
        });
    } catch (error) {
        console.error('Ошибка при загрузке годов:', error);
    }
}

/**
 * Обработчик клика по кнопке выбора года.
 * Загружает слои для выбранного года, обновляет карту и легенду.
 * @param {Object} item - Объект с данными года (содержит item.id).
 * @param {HTMLElement} btn - DOM-элемент кнопки, по которой был клик.
 */
async function handleYearButtonClick(item, btn) {
    const allYearButtons = document.querySelectorAll('#years-container button');
    const allBlockableButtons = document.querySelectorAll('.blockable-button');

    // Если кнопка уже активна — не делаем повторную загрузку
    if (btn.classList.contains('active-year-button')) return;

    document.body.style.cursor = 'wait';
    allBlockableButtons.forEach(b => b.disabled = true);
    btn.classList.add('loading-year-button');

    try {
        const res = await fetch(`http://127.0.0.1:5000/ruszhdtransit/work/${item.id}`);
        const data = await res.json();

        map.getLayers().getArray()
            .filter(layer => layer.get('customLayer'))
            .forEach(layer => map.removeLayer(layer));

        document.querySelector('#legend-block .legend-placeholder').innerHTML = '';
        highlightSource.clear();
        popupOverlay.setPosition(undefined);

        data.layers.forEach(layerData => {
            const features = new ol.format.GeoJSON().readFeatures({
                type: 'FeatureCollection',
                features: layerData.features
            }, {
                featureProjection: 'EPSG:3857'
            });

            const vectorSource = new ol.source.Vector({ features });

            let layerStyle;
            if (layerData.style) {
                // Проверка, если стиль является стандартным
                if (isDefaultStyle(layerData.style)) {
                    console.warn('Используется стандартный стиль для слоя', layerData.id, '- проверьте сервис стилей!');
                }
                if ('radius' in layerData.style) {
                    const fillColor = layerData.style.fillColor || '#0000ff';
                    const fillOpacity = layerData.style.fillOpacity !== undefined ? layerData.style.fillOpacity : 1;
                    const rgbaFillColor = hexToRgba(fillColor, fillOpacity);

                    layerStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: layerData.style.radius || 5,
                            fill: new ol.style.Fill({ color: rgbaFillColor }),
                            stroke: new ol.style.Stroke({
                                color: layerData.style.strokeColor || '#000000',
                                width: layerData.style.strokeWidth || 1
                            })
                        })
                    });
                } else {
                    layerStyle = new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: layerData.style.strokeColor || '#000000',
                            width: layerData.style.strokeWidth || 2
                        }),
                        fill: new ol.style.Fill({
                            color: layerData.style.fillColor
                                ? hexToRgba(layerData.style.fillColor, layerData.style.fillOpacity ?? 0.1)
                                : 'rgba(0,0,255,0.1)'
                        })
                    });
                }
            }

            const vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                visible: layerData.visible || false,
                style: layerStyle,
                properties: { id: layerData.id, name: layerData.name}
            });

            if (layerData.isBack) {
                vectorLayer.set('interactive', false);
            }

            vectorLayer.set('customLayer', true);
            map.addLayer(vectorLayer);

            const legendItem = document.createElement('div');
            legendItem.classList.add('legend-item');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = layerData.visible || false;
            checkbox.dataset.layerId = layerData.id;

            checkbox.onchange = () => {
                vectorLayer.setVisible(checkbox.checked);
                if (highlightedFeature) {
                    const popupCheckbox = document.getElementById('toggle-layer');
                    if (popupCheckbox) {
                        popupCheckbox.checked = checkbox.checked;
                    }
                }
            };

            const label = document.createElement('span');
            label.textContent = layerData.name;

            legendItem.appendChild(checkbox);
            legendItem.appendChild(label);
            document.querySelector('#legend-block .legend-placeholder').appendChild(legendItem);
        });

        // Обновляем стили всех кнопок годов
        allYearButtons.forEach(b => {
            b.classList.remove('active-year-button', 'loading-year-button');
            b.style.backgroundColor = '#ccc';
            b.style.color = '#000';
        });

        // Выделяем текущую кнопку как активную
        btn.classList.add('active-year-button');

    } catch (err) {
        console.error('Ошибка при загрузке данных для года:', err);
        alert('Произошла ошибка при загрузке данных.');
    } finally {
        popupOverlay.setPosition(undefined);
        document.body.style.cursor = 'default';
        const isLoggedIn = !!localStorage.getItem('authToken');

        allBlockableButtons.forEach(b => {
            if (b.id !== 'add-comment-button' || isLoggedIn) {
                b.disabled = false;
            }
        });
        btn.classList.remove('loading-year-button');
    }
}

function isDefaultStyle(style) {
  return style.color === '#000000' && style.strokeWidth === 2;
}