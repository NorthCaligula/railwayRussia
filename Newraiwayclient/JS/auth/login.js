import { openLoginErrorModal } from '../utils/modals.js';

export async function handleLogin() {
    const username = document.getElementById('login').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        openLoginErrorModal("Пожалуйста, введите логин и пароль.");
        return;
    }

    try {
        const res = await fetch('http://127.0.0.1:5002/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (!res.ok) throw new Error(`Ошибка сервера: ${res.status}`);

        const data = await res.json();
        handleLoginResponse(data);
    } catch (error) {
        console.error('Ошибка при входе:', error);
        openLoginErrorModal('Произошла ошибка при попытке входа.');
    }
}

function handleLoginResponse(data) {
    if (data.state === 'Incorrect password') {
        openLoginErrorModal('Неверный логин или пароль');
    } else if (data.state === 'correctUser' || data.state === 'correctAdmin') {
        if (data.token) {
            localStorage.setItem('authToken', data.token);
            updateUIAfterLogin(data.state === 'correctAdmin');
        } else {
            openLoginErrorModal('Ошибка при получении токена.');
        }
    }
}

function updateUIAfterLogin(isAdmin) {
    document.querySelector('.login-container').style.display = 'none';
    document.querySelector('.button-block').innerHTML = '<button onclick="logout()">Выход</button>';

    if (isAdmin) {
        // TODO: Реализовать функционал для админа
    }
}

export function logout() {
    localStorage.removeItem('authToken');
    document.querySelector('.login-container').style.display = 'block';
    document.querySelector('.button-block').innerHTML = '';
}