import { map } from './map/init.js';
import { setupMapClickHandler } from './map/events.js';
import { loadYears } from './years/load.js';
import { handleYearButtonClick } from './years/handlers.js';
import { handleLogin } from './auth/login.js';
import { initRegistration } from './auth/register.js';
import { initRecovery } from './auth/recover.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация карты
    setupMapClickHandler();

    // Загрузка данных
    try {
        const years = await loadYears();
        initYearButtons(years);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }

    // Настройка аутентификации
    document.getElementById('login-button').addEventListener('click', handleLogin);
    initRegistration();
    initRecovery();
});

function initYearButtons(years) {
    const container = document.getElementById('years');
    years.forEach(item => {
        const btn = document.createElement('button');
        btn.textContent = item.id;
        btn.classList.add('year-button');
        btn.onclick = () => handleYearButtonClick(item, btn);
        container.appendChild(btn);
    });
}