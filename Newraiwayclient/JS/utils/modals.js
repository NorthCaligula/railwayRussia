// Управление всеми модальными окнами приложения
export function openLoginErrorModal(message) {
    const modal = document.getElementById('login-error-modal');
    const errorMessage = document.getElementById('login-error-message');
    errorMessage.textContent = message;

    animateModal(modal, 'slideIn');

    // Настройка закрытия
    document.getElementById('close-login-error-modal').onclick = () => closeLoginErrorModal();
    modal.addEventListener('click', (e) => e.target === modal && closeLoginErrorModal(), {once: true});
}

export function closeLoginErrorModal() {
    const modal = document.getElementById('login-error-modal');
    animateModal(modal, 'slideOut', () => modal.classList.remove('show'));
}

export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('show');
    modal.style.display = 'flex';

    // Закрытие по клику на фон
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modalId);
    });
}

export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.add('hide');

    setTimeout(() => {
        modal.classList.remove('show', 'hide');
        modal.style.display = 'none';
    }, 400);
}

function animateModal(modal, animationName, callback) {
    const content = modal.querySelector('.modal-content');
    content.style.animation = `${animationName} 0.4s ease forwards`;

    if (callback) {
        content.addEventListener('animationend', callback, {once: true});
    }
}