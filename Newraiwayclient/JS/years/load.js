export async function loadYears() {
    try {
        const res = await fetch('http://127.0.0.1:5001/api/ruszhdtransit/start');
        const data = await res.json();
        return data.sort((a, b) => a.order - b.order);
    } catch (error) {
        console.error('Ошибка при загрузке годов:', error);
        throw error;
    }
}