import { closeModal } from '../utils/modals.js';
import { loadCities } from './cities.js';

export function initRegistration() {
    document.getElementById('register-link').addEventListener('click', openRegisterModal);
    document.getElementById("register-form").addEventListener("submit", handleRegistration);
}

export function openRegisterModal() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('show');
    modal.style.display = 'flex';
    loadCities();
}

function closeRegisterModal() {
    closeModal('register-modal');
}

async function handleRegistration(event) {
    event.preventDefault();
    setRegistrationLoading(true);

    try {
        const formData = collectFormData();
        validatePasswords(formData.password, formData.confirmPassword);

        const response = await sendRegistrationRequest(formData);
        handleRegistrationResponse(response);

    } catch (error) {
        handleRegistrationError(error);
    } finally {
        setRegistrationLoading(false);
    }
}

function collectFormData() {
    return {
        email: document.getElementById("regEmail").value,
        username: document.getElementById("regLogin").value,
        password: document.getElementById("regPassword").value,
        confirmPassword: document.getElementById("confirmPassword").value,
        name: document.getElementById("fullName").value,
        gender: document.querySelector('input[name="gender"]:checked')?.value.toLowerCase(),
        city_id: parseInt(document.getElementById("citySelect").value)
    };
}

function validatePasswords(password, confirmPassword) {
    if (password !== confirmPassword) {
        const errorElement = document.getElementById("password-error");
        errorElement.style.display = "block";
        document.getElementById("regPassword").classList.add("input-error");
        document.getElementById("confirmPassword").classList.add("input-error");
        throw new Error("Пароли не совпадают");
    }
}

async function sendRegistrationRequest(data) {
    const response = await fetch('http://localhost:5002/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await response.json();
}

function handleRegistrationResponse(response) {
    if (response.success) {
        closeRegisterModal();
        alert('Регистрация успешна! Теперь вы можете войти.');
    } else {
        throw new Error(response.message || 'Ошибка регистрации');
    }
}

function handleRegistrationError(error) {
    console.error('Ошибка регистрации:', error);
    alert(error.message || 'Произошла ошибка при регистрации. Попробуйте снова.');
}

function setRegistrationLoading(isLoading) {
    document.getElementById("register-spinner").style.display = isLoading ? "block" : "none";
    document.querySelector("#register-form button[type=submit]").disabled = isLoading;
}