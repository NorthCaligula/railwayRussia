let isOfferSubmitting = false; // глобальный флаг
let previewMap;
let previewVectorLayer;

function openOfferModal() {
    const modal = document.getElementById('offer-modal');
    modal.classList.add('show');

    // Обработчик закрытия по клику на фон
    modal.addEventListener('click', function (e) {
        if (e.target === modal && !isOfferSubmitting) { // Кликнули именно на фон, а не на контент
            closeOfferModal();
        }
    }, {once: true}); // Чтобы обработчик повесился только один раз

}

function closeOfferModal() {
    const modal = document.getElementById('offer-modal');
    const content = modal.querySelector('.modal-content-offer');
    const textarea = document.getElementById('offer-textarea');
    const feedback = document.getElementById('offer-feedback');

    content.style.animation = 'slideOut 0.4s ease forwards';
    isOfferSubmitting = false;

    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        content.style.animation = '';
        textarea.value = '';                        // Очистить текст
        textarea.readOnly = false;                  // Включить обратно редактирование
        feedback.textContent = '';
        feedback.style.display = 'none';

        // Включить обратно радиобаттоны
        document.querySelectorAll('input[name="offer-type"]').forEach(el => el.disabled = false);

        // Снова разрешить закрытие модалки кликом вне
        modal.onclick = () => closeOfferModal();
    }, {once: true});
}


async function loadOfferYears() {
    try {
        const res = await fetch('http://127.0.0.1:5000/ruszhdtransit/start');
        const data = await res.json();
        const container = document.getElementById('offer-years-container');
        container.innerHTML = ''; // очищаем при повторном открытии
        const sorted = data.sort((a, b) => a.order - b.order);

        sorted.forEach(item => {
            const btn = document.createElement('button');
            btn.textContent = item.id;
            btn.classList.add('year-button');
            btn.onclick = () => {
                // поведение при выборе года (можно запомнить выбранный ID)
                document.querySelectorAll('#offer-years-container .year-button').forEach(b => {
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

function toggleOfferMode() {
    const type = document.querySelector('input[name="offer-type"]:checked').value;
    const yearsBlock = document.getElementById('offer-years-block');
    const textarea = document.getElementById('offer-textarea');
    const modal = document.getElementById('offer-modal'); // Получаем модальное окно

    if (type === 'text') {
        textarea.style.display = 'block';
        yearsBlock.style.display = 'none';
        document.getElementById('data-offer-block').style.display = 'none';

        // Убираем увеличенный размер
        modal.classList.remove('enlarged');
    } else {
        textarea.style.display = 'none';
        yearsBlock.style.display = 'block';
        loadOfferYears();
        document.getElementById('data-offer-block').style.display = 'block';
        setTimeout(() => initPreviewMap(), 200); // Задержка на отрисовку DOM
        // Увеличиваем модальное окно только по горизонтали
        modal.classList.add('enlarged');
    }
}


async function submitOffer() {
    if (isOfferSubmitting) return;
    isOfferSubmitting = true;

    const token = localStorage.getItem('authToken');
    const offerType = document.querySelector('input[name="offer-type"]:checked').value;
    const feedback = document.getElementById('offer-feedback');
    const textarea = document.getElementById('offer-textarea');
    const modal = document.getElementById('offer-modal');
    const submitBtn = document.getElementById('offer-submit-btn');

    submitBtn.disabled = true;
    submitBtn.classList.add('disabled');
    textarea.readOnly = true;
    document.querySelectorAll('input[name="offer-type"]').forEach(el => el.disabled = true);
    modal.onclick = null;

    feedback.className = 'loading';
    feedback.style.display = 'block';
    feedback.textContent = 'Отправка...';

    const resetUI = () => {
        isOfferSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
        textarea.readOnly = false;
        document.querySelectorAll('input[name="offer-type"]').forEach(el => el.disabled = false);
        modal.onclick = () => closeOfferModal();
    };

    if (offerType === 'text') {
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
            const response = await fetch('http://127.0.0.1:5000/ruszhdtransit/offer/text', {
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
                closeOfferModal();
            }, 1500);
        } catch (err) {
            console.error('Ошибка:', err);
            feedback.className = '';
            feedback.textContent = 'Не удалось отправить. Попробуйте позже.';
            resetUI();
        }
    } else if (offerType === 'data') {
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
            const response = await fetch('http://127.0.0.1:5000/ruszhdtransit/offer/data', {
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
                closeOfferModal();
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

