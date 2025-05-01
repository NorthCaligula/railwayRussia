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
    const feature = map.forEachFeatureAtPixel(evt.pixel, function (feature) {
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

function openRecoverModal() {
    const modal = document.getElementById('recover-modal');
    modal.classList.add('show');

    // Обработчик закрытия по клику на фон
    modal.addEventListener('click', function (e) {
        if (e.target === modal) { // Кликнули именно на фон, а не на контент
            closeRecoverModal();
        }
    }, {once: true}); // Чтобы обработчик повесился только один раз
}

function openLoginErrorModal(message) {
    const modal = document.getElementById('login-error-modal');
    const content = modal.querySelector('.modal-content');
    const errorMessage = document.getElementById('login-error-message');
    errorMessage.textContent = message;

    content.style.animation = 'slideIn 0.4s ease forwards';
    modal.classList.add('show');

    // Закрытие по кнопке
    const closeModalBtn = document.getElementById('close-login-error-modal');
    closeModalBtn.onclick = function () {
        closeLoginErrorModal();
    };

    // Закрытие по фону
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeLoginErrorModal();
        }
    }, {once: true});
}

function closeLoginErrorModal() {
    const modal = document.getElementById('login-error-modal');
    const content = modal.querySelector('.modal-content');

    content.style.animation = 'slideOut 0.4s ease forwards'; // Анимация закрытия

    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        content.style.animation = ''; // Сбросить анимацию
    }, {once: true});
}

function closeRecoverModal() {
    const modal = document.getElementById('recover-modal');
    const content = modal.querySelector('.modal-content');

    content.style.animation = 'slideOut 0.4s ease forwards'; // Анимация закрытия

    // После окончания анимации — скрыть модалку
    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        content.style.animation = ''; // Сбросить анимацию, чтобы при следующем открытии всё работало
    }, {once: true});
}

// Функция входа
async function handleLogin() {
    const username = document.getElementById('login').value;  // Поменял login на username
    const password = document.getElementById('password').value;

    if (!username || !password) {
        openLoginErrorModal("Пожалуйста, введите логин и пароль.");
        return;
    }

    try {
        const res = await fetch('http://127.0.0.1:5002/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username, password})
        });

        // Добавляем проверку статуса ответа
        if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
        }

        const data = await res.json();

        if (data.state === 'Incorrect password') {
            openLoginErrorModal('Неверный логин или пароль');
        } else if (data.state === 'correctUser' || data.state === 'correctAdmin') {
            // Сохраняем JWT токен в localStorage
            if (data.token) {
                localStorage.setItem('authToken', data.token); // Получаем токен из ответа и сохраняем

                // Показываем кнопку выхода и скрываем форму входа
                document.querySelector('.login-container').style.display = 'none';
                document.querySelector('.button-block').innerHTML = '<button onclick="logout()">Выход</button>';

                // Можно добавить дополнительную логику для админов
                if (data.state === 'correctAdmin') {
                    // TODO: Реализовать функционал для админа
                }
            } else {
                openLoginErrorModal('Ошибка при получении токена. Проверьте логин и пароль.');
            }
        }
    } catch (error) {
        console.error('Ошибка при входе:', error);
        openLoginErrorModal('Произошла ошибка при попытке входа.');
    }
}

// Функция выхода
function logout() {
    localStorage.removeItem('authToken'); // Удаляем токен
    document.querySelector('.login-container').style.display = 'block'; // Показываем форму логина
    document.querySelector('.button-block').innerHTML = ''; // Убираем кнопку выхода
}

// Загружаем данные по годам
async function loadYears() {
    try {
        const res = await fetch('http://127.0.0.1:5001/api/ruszhdtransit/start');
        const data = await res.json();
        const container = document.getElementById('years');
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

// Очистка подсветки и закрытие попапа при переключении года
async function handleYearButtonClick(item, btn) {
    const allYearButtons = document.querySelectorAll('#years button');
    const allBlockableButtons = document.querySelectorAll('.blockable-button');
    document.body.style.cursor = 'wait';
    allBlockableButtons.forEach(b => b.disabled = true);
    btn.classList.add('loading-year-button');

    try {
        const res = await fetch(`http://127.0.0.1:5001/api/ruszhdtransit/work/${item.id}`);
        const data = await res.json();

        // Удаляем старые слои
        map.getLayers().getArray()
            .filter(layer => layer.get('customLayer'))
            .forEach(layer => map.removeLayer(layer));

        // Очищаем легенду
        document.querySelector('#legend-block .legend-placeholder').innerHTML = '';

        // Очистка подсветки и закрытие попапа
        highlightSource.clear();
        popupOverlay.setPosition(undefined);

        // Загрузка новых слоев и обновление легенды
        data.layers.forEach(layerData => {
            const features = new ol.format.GeoJSON().readFeatures({
                type: 'FeatureCollection',
                features: layerData.features
            }, {
                featureProjection: 'EPSG:3857'
            });

            const vectorSource = new ol.source.Vector({features});

            let layerStyle;

            // Определяем стиль для слоя
            if (layerData.style) {
                if ('radius' in layerData.style) {
                    // Это точка
                    const fillColor = layerData.style.fillColor || '#0000ff';
                    const fillOpacity = layerData.style.fillOpacity !== undefined ? layerData.style.fillOpacity : 1;

                    const rgbaFillColor = hexToRgba(fillColor, fillOpacity);

                    layerStyle = new ol.style.Style({
                        image: new ol.style.Circle({
                            radius: layerData.style.radius || 5,
                            fill: new ol.style.Fill({
                                color: rgbaFillColor
                            }),
                            stroke: new ol.style.Stroke({
                                color: layerData.style.strokeColor || '#000000',
                                width: layerData.style.strokeWidth || 1
                            })
                        })
                    });
                } else {
                    // Это линия или полигон
                    layerStyle = new ol.style.Style({
                        stroke: new ol.style.Stroke({
                            color: layerData.style.strokeColor || '#000000',
                            width: layerData.style.strokeWidth || 2
                        }),
                        fill: new ol.style.Fill({
                            color: layerData.style.fillColor ? hexToRgba(layerData.style.fillColor, layerData.style.fillOpacity ?? 0.1) : 'rgba(0,0,255,0.1)'
                        })
                    });
                }
            }

            // Создание слоя
            const vectorLayer = new ol.layer.Vector({
                source: vectorSource,
                visible: layerData.visible || false,
                style: layerStyle,
                properties: {id: layerData.id, name: layerData.name}
            });

            vectorLayer.set('customLayer', true);
            map.addLayer(vectorLayer);

            // Добавление элемента в легенду
            const legendItem = document.createElement('div');
            legendItem.classList.add('legend-item');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = layerData.visible || false;
            checkbox.onchange = () => {
                vectorLayer.setVisible(checkbox.checked);

                // Если этот слой сейчас выделен в попапе - обновить и его галочку
                if (highlightedFeature) {
                    const popupCheckbox = document.getElementById('toggle-layer');
                    if (popupCheckbox) {
                        popupCheckbox.checked = checkbox.checked;
                    }
                }
            };
            checkbox.dataset.layerId = layerData.id;

            const label = document.createElement('span');
            label.textContent = layerData.name;

            legendItem.appendChild(checkbox);
            legendItem.appendChild(label);

            document.querySelector('#legend-block .legend-placeholder').appendChild(legendItem);
        });

        // Обновляем стиль кнопок годов
        allYearButtons.forEach(b => {
            b.classList.remove('active-year-button', 'loading-year-button');
            b.style.backgroundColor = '#ccc';
            b.style.color = '#000';
        });

        btn.classList.add('active-year-button');
    } catch (err) {
        console.error('Ошибка при загрузке данных для года:', err);
        alert('Произошла ошибка при загрузке данных.');
    } finally {
        popupOverlay.setPosition(undefined);
        document.body.style.cursor = 'default';
        allBlockableButtons.forEach(b => b.disabled = false);
    }
}

// Загружаем данные по годам при инициализации
loadYears();

//Подгружаем города в модалку регистрации
async function loadCities() {
    try {
        const response = await fetch('http://localhost:5002/cities');
        const cities = await response.json();
        const citySelect = document.getElementById('citySelect');

        // Обрабатываем объект, а не массив
        for (const id in cities) {
            if (cities.hasOwnProperty(id)) {
                const option = document.createElement('option');
                option.value = id;  // Используем ID города
                option.textContent = cities[id];  // Используем название города
                citySelect.appendChild(option);
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
    }
}

// когда модалка открывается — подгружаем
function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('show');
    modal.style.display = 'flex';
    loadCities();
}

function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('hide');

    // Ждём завершения анимации перед скрытием модалки
    setTimeout(() => {
        modal.classList.remove('show', 'hide'); // Убираем класс после завершения анимации
        modal.style.display = 'none'; // Скроем окно полностью
    }, 400); // время анимации должно совпадать с временем в CSS (0.4s)
}

// Закрытие окна при клике вне модалки
window.addEventListener('click', function (event) {
    const modal = document.getElementById('register-modal');
    const modalContent = modal.querySelector('.modal-content');

    if (event.target === modal) {
        closeRegisterModal();
    }
});

// Обработчик для формы регистрации
document.getElementById("register-form").addEventListener("submit", async function (event) {
    event.preventDefault();

    // Показать спиннер и заблокировать кнопку
    document.getElementById("register-spinner").style.display = "block";
    document.querySelector("#register-form button[type=submit]").disabled = true;

    // Собираем значения
    const email = document.getElementById("regEmail").value;
    const username = document.getElementById("regLogin").value;
    const password = document.getElementById("regPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const name = document.getElementById("fullName").value;
    const genderElement = document.querySelector('input[name="gender"]:checked');
    const city_id = document.getElementById("citySelect").value;

    if (!genderElement) {
        alert('Пожалуйста, выберите пол');
        hideSpinner();
        return;
    }

    const gender = genderElement.value.toLowerCase();

    if (password !== confirmPassword) {
        document.getElementById("password-error").style.display = "block";
        document.getElementById("regPassword").classList.add("input-error");
        document.getElementById("confirmPassword").classList.add("input-error");
        hideSpinner();
        return;
    } else {
        document.getElementById("password-error").style.display = "none";
        document.getElementById("regPassword").classList.remove("input-error");
        document.getElementById("confirmPassword").classList.remove("input-error");
    }

    const registrationData = {
        email: email,
        username: username,
        password: password,
        name: name,
        gender: gender,
        city_id: parseInt(city_id)
    };

    try {
        console.log("Отправляем данные на сервер:", registrationData);
        const response = await fetch('http://localhost:5002/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (response.ok) {
            closeRegisterModal();
        } else {
            alert(data.message || 'Произошла ошибка при регистрации.');
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        alert('Произошла ошибка при регистрации. Попробуйте снова.');
    } finally {
        hideSpinner(); // Всегда скрываем спиннер в конце
    }
});

// Функция скрытия спиннера и разблокировки кнопки
function hideSpinner() {
    document.getElementById("register-spinner").style.display = "none";
    document.querySelector("#register-form button[type=submit]").disabled = false;
}
