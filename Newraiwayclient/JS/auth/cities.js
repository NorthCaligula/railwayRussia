export async function loadCities() {
    try {
        const response = await fetch('http://localhost:5002/cities');
        const cities = await response.json();
        populateCitySelect(cities);
    } catch (error) {
        console.error('Ошибка загрузки городов:', error);
    }
}

function populateCitySelect(cities) {
    const citySelect = document.getElementById('citySelect');
    citySelect.innerHTML = '<option value="">Выберите город</option>';

    for (const id in cities) {
        if (cities.hasOwnProperty(id)) {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = cities[id];
            citySelect.appendChild(option);
        }
    }
}