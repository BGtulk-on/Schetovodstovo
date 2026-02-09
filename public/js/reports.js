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
            resultDiv.innerHTML = `<span class="text-red">Грешка: ${err.message}</span>`;
        }

    } else if (type === 'rooms') {
        searchInput.classList.add('active'); 
        resultDiv.innerHTML = '<p>Зареждане на стаи...</p>';
        try {
            const resp = await fetch('/api/rooms');
            allRoomsData = await resp.json(); 
            renderRoomTable(allRoomsData);
        } catch (err) {
            resultDiv.innerHTML = `<span class="text-red">Грешка: ${err.message}</span>`;
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

    const cashPayments = data.filter(p => p.payment_method === 'cash');
    const bankPayments = data.filter(p => p.payment_method !== 'cash');

    const totalCash = cashPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalBank = bankPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalAll = totalCash + totalBank;

    resultDiv.innerHTML = `
        <div style="margin-bottom: 10px;">
            <button class="tab-btn active" onclick="switchReportTab('cash')">В брой</button>
            <button class="tab-btn" onclick="switchReportTab('bank')">Карта/Банка</button>
            <button class="tab-btn" onclick="switchReportTab('total')">Общо за деня</button>
        </div>
        
        <div id="cashSection" class="report-tab-content">
            ${generateTableHtml(cashPayments, "Общо в брой:", totalCash, false)}
        </div>
        
        <div id="bankSection" class="report-tab-content" style="display:none;">
            ${generateTableHtml(bankPayments, "Общо карта/банка:", totalBank, false)}
        </div>

        <div id="totalSection" class="report-tab-content" style="display:none;">
            ${generateTableHtml(data, "ОБЩО ЗА ДЕНЯ:", totalAll, true)}
        </div>
    `;
}

function generateTableHtml(payments, label, totalSum, showMethod) {
    if (payments.length === 0) return '<p>Няма записи.</p>';
    
    let table = '<table class="data-table"><thead><tr>';
    table += '<th>Дата/Час</th><th>Студент</th><th>ЕГН</th><th>Месец</th>';
    if (showMethod) table += '<th>Метод</th>';
    table += '<th>Сума (€)</th></tr></thead><tbody>';
    
    payments.forEach(p => {
        const meth = p.payment_method === 'cash' ? 'В брой' : 'Карта/Банка';
        table += '<tr>';
        table += `<td>${new Date(p.payment_date).toLocaleString()}</td>`;
        table += `<td>${p.first_name} ${p.last_name}</td>`;
        table += `<td>${p.egn}</td>`;
        table += `<td>${p.month_name} ${p.year}</td>`;
        if (showMethod) table += `<td>${meth}</td>`;
        table += `<td>${parseFloat(p.amount).toFixed(2)}</td>`;
        table += '</tr>';
    });
    
    table += '</tbody>';
    
    const colSpan = showMethod ? 5 : 4;
    table += `<tfoot>
        <tr style="font-weight: bold; background-color: #eee;">
            <td colspan="${colSpan}" style="text-align: right;">${label}</td>
            <td>${totalSum.toFixed(2)} €</td>
        </tr>
    </tfoot>`;
    
    table += '</table>';
    return table;
}

function switchReportTab(type) {
    document.querySelectorAll('.report-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

    if (type === 'cash') {
        document.getElementById('cashSection').style.display = 'block';
        document.querySelectorAll('.tab-btn')[0].classList.add('active');
    } else if (type === 'bank') {
        document.getElementById('bankSection').style.display = 'block';
        document.querySelectorAll('.tab-btn')[1].classList.add('active');
    } else if (type === 'total') {
        document.getElementById('totalSection').style.display = 'block';
        document.querySelectorAll('.tab-btn')[2].classList.add('active');
    }
}

function filterTable() {
    const query = document.getElementById('tableSearch').value.trim();
    const lowQuery = query.toLowerCase();
    const type = document.getElementById('reportType').value;

    if (type === 'all') {
        const isNumeric = /^\d+$/.test(query);
        const len = query.length;
        const filtered = allStudentsData.filter(s => {
            if (isNumeric) {
                if (len === 1) {
                    return s.block && s.block.toString() === query;
                } 
                else if (len === 3) {
                    return s.room_number && s.room_number.toString().includes(query);
                } 
                else if (len === 4) {
                    return s.egn && s.egn.toString().startsWith(query);
                } 
                else if (len === 5) {
                    return s.class_number && s.class_number.toString().includes(query);
                }
            }
            const combined = [s.first_name, s.last_name, s.egn, s.class_number, s.room_number]
                .join(' ').toLowerCase();
            return combined.includes(lowQuery);
        });
        
        renderStudentTable(filtered);
    } 
    else if (type === 'rooms') {
        const filtered = allRoomsData.filter(r => {
            const combined = [r.room_number, r.capacity.toString(), r.problem_details || '', r.class_numbers || '']
                .join(' ').toLowerCase();
            return combined.includes(lowQuery);
        });
        renderRoomTable(filtered);
    }
}