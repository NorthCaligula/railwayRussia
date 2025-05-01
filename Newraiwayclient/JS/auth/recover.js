import { openModal, closeModal } from '../utils/modals.js';

export function initRecovery() {
    document.getElementById('recover-link').addEventListener('click', openRecoverModal);
    document.getElementById('recover-form').addEventListener('submit', handleRecovery);
}

export function openRecoverModal() {
    openModal('recover-modal');
}

function closeRecoverModal() {
    closeModal('recover-modal');
}

async function handleRecovery(event) {
    event.preventDefault();
    const email = document.getElementById('recover-email').value;

    try {
        const response = await fetch('http://localhost:5002/recover', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Инструкции по восстановлению отправлены на email');
            closeRecoverModal();
        } else {
            throw new Error(data.message || 'Ошибка восстановления пароля');
        }
    } catch (error) {
        console.error('Ошибка восстановления:', error);
        alert(error.message);
    }
}