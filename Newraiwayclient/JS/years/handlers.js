import { map } from '../map/init.js';
import { highlightSource, highlightedFeature } from '../map/highlight.js';
import { popupOverlay } from '../map/popup.js';
import { hexToRgba } from '../utils/colors.js';

export async function handleYearButtonClick(item, btn) {
    const allYearButtons = document.querySelectorAll('#years button');
    const allBlockableButtons = document.querySelectorAll('.blockable-button');

    setLoadingState(true, btn, allBlockableButtons);

    try {
        const response = await fetch(`http://127.0.0.1:5001/api/ruszhdtransit/work/${item.id}`);
        const data = await response.json();

        clearPreviousState();
        await processNewData(data);
        updateYearButtonStyles(btn, allYearButtons);

    } catch (error) {
        console.error('Ошибка при загрузке данных для года:', error);
        alert('Произошла ошибка при загрузке данных.');
    } finally {
        setLoadingState(false, btn, allBlockableButtons);
    }
}

function setLoadingState(isLoading, button, blockableButtons) {
    document.body.style.cursor = isLoading ? 'wait' : 'default';
    button.classList.toggle('loading-year-button', isLoading);
    blockableButtons.forEach(b => b.disabled = isLoading);
}

function clearPreviousState() {
    // Очистка слоёв
    map.getLayers().getArray()
        .filter(layer => layer.get('customLayer'))
        .forEach(layer => map.removeLayer(layer));

    // Очистка легенды
    document.querySelector('#legend-block .legend-placeholder').innerHTML = '';

    // Сброс выделения
    highlightSource.clear();
    popupOverlay.setPosition(undefined);
}

async function processNewData(data) {
    for (const layerData of data.layers) {
        await createLayer(layerData);
        addLegendItem(layerData);
    }
}

function updateYearButtonStyles(activeButton, allButtons) {
    allButtons.forEach(b => {
        b.classList.remove('active-year-button', 'loading-year-button');
        b.style.backgroundColor = '#ccc';
        b.style.color = '#000';
    });
    activeButton.classList.add('active-year-button');
}

// Вспомогательные функции для создания слоёв и легенды...