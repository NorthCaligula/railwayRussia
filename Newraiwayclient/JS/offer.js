document.getElementById('edit-button').onclick = () => {
  document.getElementById('offer-modal').style.display = 'flex';
};

function closeOfferModal() {
  document.getElementById('offer-modal').style.display = 'none';
}

function submitOffer() {
  const text = document.getElementById('offer-text').value.trim();
  const coords = document.getElementById('offer-coords').value.trim();

  if (!text) {
    alert('Пожалуйста, введите текст оффера.');
    return;
  }

  const payload = {
    text,
    coords,
    date: new Date().toISOString()
  };

  fetch('http://127.0.0.1:5001/api/offers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error('Ошибка при отправке оффера');
    return res.json();
  })
  .then(() => {
    alert('Спасибо! Ваш оффер отправлен.');
    closeOfferModal();
    document.getElementById('offer-text').value = '';
    document.getElementById('offer-coords').value = '';
  })
  .catch(err => {
    console.error(err);
    alert('Ошибка при отправке оффера.');
  });
}
