
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

function openLoginErrorModal(message) {
    const modal = document.getElementById('login-error-modal');
    const content = modal.querySelector('.modal-content');
    const errorMessage = document.getElementById('login-error-message');
    errorMessage.textContent = message;

    content.style.animation = 'slideIn 0.4s ease forwards';
    modal.classList.add('show');

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

// когда модалка открывается — подгружаем
function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('show');
    modal.style.display = 'flex';
    loadCities();

    // Закрытие по фону
    modal.addEventListener('click', function (e) {
        if (e.target === e.currentTarget) {
            closeRegisterModal();
        }
    }, {once: true});
}

function closeRegisterModal() {
    const modal = document.getElementById('register-modal');
    const content = modal.querySelector('.modal-content');

    if (!modal || !content) return;

    content.style.animation = 'slideOut 0.4s ease forwards'; // Анимация закрытия

    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        modal.style.display = 'none'; // Скрываем окно
        content.style.animation = ''; // Сброс анимации
    }, { once: true });
}

// Функция входа
async function handleLogin() {
    const username = document.getElementById('login-input').value;  // Поменял login на username
    const password = document.getElementById('password-input').value;

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
            body: JSON.stringify({ username, password })
        });

        // Добавляем проверку статуса ответа
        if (!res.ok) {
            throw new Error(`Ошибка сервера: ${res.status}`);
        }

        const data = await res.json();

        if (data.state === 'Incorrect password') {
            openLoginErrorModal('Неверный логин или пароль');
        } else if (data.state === 'correctUser') {
            // Сохраняем JWT токен в localStorage
            if (data.access_token) {
                localStorage.setItem('authToken', data.access_token);

                // Восстанавливаем кнопку "Редактировать"
                const editButton = document.getElementById('edit-button');
                editButton.disabled = false;  // Делает кнопку доступной
                editButton.style.cursor = 'pointer';  // Убираем блокировку
                editButton.style.backgroundColor = '#5D74B0';  // Стили для доступной кнопки

                // Убираем все кнопки (вход и регистрация) и добавляем кнопку "Выход"
                const buttonBlock = document.querySelector('.button-block');
                buttonBlock.innerHTML = '';  // Убираем все кнопки

                const logoutButton = document.createElement('button');
                logoutButton.classList.add('blockable-button');
                logoutButton.textContent = 'Выход';
                logoutButton.onclick = logout;
                buttonBlock.appendChild(logoutButton);  // Добавляем кнопку "Выход"

                // Скрываем поля ввода
                document.getElementById('login-input').style.display = 'none';
                document.getElementById('password-input').style.display = 'none';
                document.getElementById('recover-link').style.display = 'none'; // Убираем ссылку

                openWelcomeModal(data.name); // Показываем приветствие
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

    // Восстанавливаем кнопку "Редактировать" в заблокированное состояние
    const editButton = document.getElementById('edit-button');
    editButton.disabled = true;  // Блокируем кнопку
    editButton.style.cursor = 'not-allowed';  // Блокируем курсор
    editButton.style.backgroundColor = '#D9D9D9';  // Стиль для заблокированной кнопки

    // Показываем форму входа и поля для ввода
    document.querySelector('#login-form');

    // Восстанавливаем кнопки входа и регистрации
    const buttonBlock = document.querySelector('#auth-buttons');
    buttonBlock.innerHTML = `
        <button id="login-button" class="blockable-button" onclick="handleLogin()">Вход</button>
        <button id="register-button" class="blockable-button" onclick="openRegisterModal()">Регистрация</button>
    `;

    // Показываем поля ввода логина и пароля
    document.getElementById('login-input').style.display = 'block';
    document.getElementById('password-input').style.display = 'block';

    // Восстанавливаем ссылку "Забыли пароль?"
    document.getElementById('recover-link').style.display = 'block';

    // Очистим поля ввода
    document.getElementById('login-input').value = '';
    document.getElementById('password-input').value = '';
}

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

function openWelcomeModal(fullName) {
    const modal = document.getElementById('welcome-modal');
    const text = document.getElementById('welcome-text');
    text.textContent = `Здравствуйте, ${fullName}!`;
    modal.classList.add('show');

    setTimeout(() => {
        closeWelcomeModal();
    }, 3000); // авто-закрытие через 3 секунды

    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeWelcomeModal();
        }
    }, { once: true });
}

function closeWelcomeModal() {
    const modal = document.getElementById('welcome-modal');
    const content = modal.querySelector('.modal-content');

    content.style.animation = 'slideOut 0.4s ease forwards';
    content.addEventListener('animationend', () => {
        modal.classList.remove('show');
        content.style.animation = '';
    }, { once: true });
}