async function handleReportTypeChange() {
    const type = document.getElementById('reportType').value;
    const resultDiv = document.getElementById('reportResult');
    const searchInput = document.getElementById('tableSearch');

    if (type === 'all') {
        searchInput.classList.add('active');
        resultDiv.innerHTML = '<p>Зареждане...</p>';
        try {
            const resp = await fetch('/api/students');
            allStudentsData = await resp.json();
            renderStudentTable(allStudentsData);
        } catch (err) {
            resultDiv.innerHTML = `<span class="text-red">Грешка при зареждане: ${err.message}</span>`;
        }
    } else if (type === 'rooms') {
        searchInput.classList.remove('active');
        resultDiv.innerHTML = '<p>Зареждане на стаи...</p>';
        try {
            const resp = await fetch('/api/rooms');
            const roomData = await resp.json();
            renderRoomTable(roomData);
        } catch (err) {
            resultDiv.innerHTML = `<span class="text-red">Грешка при зареждане: ${err.message}</span>`;
        }
    } else if (type === 'daily') {
        searchInput.classList.remove('active');
        resultDiv.innerHTML = '<p>Зареждане...</p>';
        try {
            const resp = await fetch('/api/reports/daily-payments');
            const data = await resp.json();
            renderDailyPay(data);
        } catch (err) {
            resultDiv.innerHTML = `<span class="text-red">Грешка при зареждане: ${err.message}</span>`;
        }
    } else {
        searchInput.classList.remove('active');
        resultDiv.innerHTML = '';
    }
}

function renderDailyPay(data) {
    const resultDiv = document.getElementById('reportResult');
    if (data.length === 0) {
        resultDiv.innerHTML = '<p>Няма плащания за днес</p>';
        return;
    }

    let h = '<table class="data-table"><thead><tr>';
    h += '<th>Дата/Час</th><th>Студент</th><th>ЕГН</th><th>Месец</th><th>Сума (€)</th><th>Метод</th>';
    h += '</tr></thead><tbody>';

    data.forEach(p => {
        const dt = new Date(p.payment_date).toLocaleString();
        const meth = p.payment_method === 'cash' ? 'В брой' : 'По банков път';
        h += '<tr>';
        h += `<td>${dt}</td>`;
        h += `<td>${p.first_name} ${p.last_name}</td>`;
        h += `<td>${p.egn}</td>`;
        h += `<td>${p.month_name} ${p.year}</td>`;
        h += `<td>${parseFloat(p.amount).toFixed(2)}</td>`;
        h += `<td>${meth}</td>`;
        h += '</tr>';
    });

    h += '</tbody></table>';
    resultDiv.innerHTML = h;
}

function filterTable() {
    const query = document.getElementById('tableSearch').value.toLowerCase();
    const filtered = allStudentsData.filter(s => {
        const combined = [
            s.first_name, s.last_name, s.egn, s.class_number,
            s.block, s.room_number, s.phone
        ].join(' ').toLowerCase();
        return combined.includes(query);
    });
    renderStudentTable(filtered);
}
