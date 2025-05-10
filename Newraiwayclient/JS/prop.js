let isPropSubmitting = false; // глобальный флаг
let previewMap;
let previewVectorLayer;

function openPropModal() {
    const modal = document.getElementById('prop-modal');
    modal.classList.add('show');

    // Обработчик закрытия по клику на фон
    modal.addEventListener('click', function (e) {
        if (e.target === modal && !isPropSubmitting) { // Кликнули именно на фон, а не на контент
            closePropModal();
        }
    }, {once: true}); // Чтобы обработчик повесился только один раз

}

function closePropModal() {
    const modal = document.getElementById('prop-modal');
    const content = modal.querySelector('.modal-content-prop');
    const textarea = document.getElementById('prop-textarea');
    const feedback = document.getElementById('prop-feedback');

    content.style.animation = 'slideOut 0.4s ease forwards';
    isPropSubmitting = false;

    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        content.style.animation = '';
        textarea.value = '';                        // Очистить текст
        textarea.readOnly = false;                  // Включить обратно редактирование
        feedback.textContent = '';
        feedback.style.display = 'none';

        // Включить обратно радиобаттоны
        document.querySelectorAll('input[name="prop-type"]').forEach(el => el.disabled = false);

        // Снова разрешить закрытие модалки кликом вне
        modal.onclick = () => closePropModal();
    }, {once: true});
}


async function loadPropYears() {
    try {
        const res = await fetch('http://127.0.0.1:5000/ruszhdtransit/start');
        const data = await res.json();
        const container = document.getElementById('prop-years-container');
        container.innerHTML = ''; // очищаем при повторном открытии
        const sorted = data.sort((a, b) => a.order - b.order);

        sorted.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.id;
            btn.classList.add('year-button');
            btn.onclick = () => {
                // поведение при выборе года (можно запомнить выбранный ID)
                document.querySelectorAll('#prop-years-container .year-button').forEach(b => {
                    b.classList.remove('active-year-button');
                });
                btn.classList.add('active-year-button');
                btn.dataset.selected = true;
            };
            container.appendChild(btn);
        });
    } catch (error) {
        console.error('Ошибка при загрузке годов в оффере:', error);
    }
}

function togglePropMode() {
    const type = document.querySelector('input[name="prop-type"]:checked').value;
    const yearsBlock = document.getElementById('prop-years-block');
    const textarea = document.getElementById('prop-textarea');
    const modal = document.getElementById('prop-modal'); // Получаем модальное окно

    if (type === 'text') {
        textarea.style.display = 'block';
        yearsBlock.style.display = 'none';
        document.getElementById('data-prop-block').style.display = 'none';

        // Убираем увеличенный размер
        modal.classList.remove('enlarged');
    } else {
        textarea.style.display = 'none';
        yearsBlock.style.display = 'block';
        loadPropYears();
        document.getElementById('data-prop-block').style.display = 'block';
        setTimeout(() => initPreviewMap(), 200); // Задержка на отрисовку DOM
        // Увеличиваем модальное окно только по горизонтали
        modal.classList.add('enlarged');
    }
}

async function submitProp() {
    if (isPropSubmitting) return;
    isPropSubmitting = true;

    const token = localStorage.getItem('authToken');
    const propType = document.querySelector('input[name="prop-type"]:checked').value;
    const feedback = document.getElementById('prop-feedback');
    const textarea = document.getElementById('prop-textarea');
    const modal = document.getElementById('prop-modal');
    const submitBtn = document.getElementById('prop-submit-btn');

    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
    textarea.readOnly = true;
    document.querySelectorAll('input[name="prop-type"]').forEach(el => el.disabled = true);
    modal.onclick = null;

    feedback.className = 'loading';
    feedback.style.display = 'block';
    feedback.textContent = 'Отправка...';

    const resetUI = () => {
        isPropSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
        textarea.readOnly = false;
        document.querySelectorAll('input[name="prop-type"]').forEach(el => el.disabled = false);
        modal.onclick = () => closePropModal();
    };

    if (propType === 'text') {
        const comment = textarea.value.trim();
        if (!comment) {
            resetUI();
            feedback.style.display = 'none';
            alert('Пожалуйста, введите текст предложения.');
            return;
        }

        if (!token) {
            resetUI();
            feedback.className = '';
            feedback.textContent = 'Вы не авторизованы. Войдите в систему.';
            openLoginErrorModal('Вы не авторизованы. Войдите в систему.');
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:5000/ruszhdtransit/prop/text', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({comment})
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при отправке предложения.');
            }

            feedback.className = 'success';
            feedback.textContent = 'Успешно отправлено!';
            setTimeout(() => {
                resetUI();
                closePropModal();
            }, 1500);
        } catch (err) {
            console.error('Ошибка:', err);
            feedback.className = '';
            feedback.textContent = 'Не удалось отправить. Попробуйте позже.';
            resetUI();
        }
    } else if (propType === 'data') {
        if (!token) {
            resetUI();
            feedback.className = '';
            feedback.textContent = 'Вы не авторизованы. Войдите в систему.';
            openLoginErrorModal('Вы не авторизованы. Войдите в систему.');
            return;
        }

        // Получаем GeoJSON из карты
        const format = new ol.format.GeoJSON();
        const source = previewVectorLayer.getSource();
        const features = source.getFeatures();

        if (!features || features.length === 0) {
            resetUI();
            feedback.className = '';
            feedback.textContent = 'Загрузите геоданные.';
            alert('Загрузите хотя бы один объект GeoJSON перед отправкой.');
            return;
        }

        const geojson = format.writeFeaturesObject(features, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
        });

        // Получаем выбранный год
        const selectedYearBtn = document.querySelector('.year-button.active-year-button');
        if (!selectedYearBtn) {
            resetUI();
            feedback.className = '';
            feedback.textContent = 'Выберите год.';
            alert('Пожалуйста, выберите год перед отправкой.');
            return;
        }
        const year_id = selectedYearBtn.textContent;

        try {
            const response = await fetch('http://127.0.0.1:5000/ruszhdtransit/prop/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    geojson,
                    year_id
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при отправке данных.');
            }

            feedback.className = 'success';
            feedback.textContent = 'Геоданные успешно отправлены!';
            setTimeout(() => {
                resetUI();
                closePropModal();
            }, 1500);
        } catch (err) {
            console.error('Ошибка:', err);
            feedback.className = '';
            feedback.textContent = 'Не удалось отправить данные.';
            resetUI();
        }
    }
}

function initPreviewMap() {
    if (previewMap) return; // уже инициализирована

    previewVectorLayer = new ol.layer.Vector({
        source: new ol.source.Vector()
    });

    previewMap = new ol.Map({
        target: 'preview-map',
        layers: [
            new ol.layer.Tile({source: new ol.source.OSM()}),
            previewVectorLayer
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([37.618423, 55.751244]),
            zoom: 5
        })
    });
}

document.getElementById('geojson-upload').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const geojson = JSON.parse(e.target.result);
            const format = new ol.format.GeoJSON();
            const features = format.readFeatures(geojson, {
                featureProjection: 'EPSG:3857' // приведение к проекции карты
            });

            const source = new ol.source.Vector({features});
            previewVectorLayer.setSource(source);

            const extent = source.getExtent();
            if (extent && !ol.extent.isEmpty(extent)) {
                previewMap.getView().fit(extent, {padding: [20, 20, 20, 20], maxZoom: 12});
            }
        } catch (err) {
            alert('Ошибка при чтении GeoJSON: ' + err.message);
        }
    };
    reader.readAsText(file);
});

