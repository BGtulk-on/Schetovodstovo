let allStudents = [];
let currentData = null;
let calculatedPayments = [];

async function renderPay(cont) {
    cont.innerHTML = `
        <h3>Плащане на такси</h3>
        <div class="search-container">
            <input type="text" id="studentSearch" placeholder="Търсене по ЕГН или Курсов №..." 
                   autocomplete="off" oninput="handleSearch(this.value)">
            <div id="searchResults" style="display: none;">
            </div>
        </div>
        <div id="paymentDetails" style="margin-top: 20px;"></div>
    `;

    try {
        const resp = await fetch('/api/students');
        allStudents = await resp.json();
    } catch (e) {
        console.log(e);
    }
}

function handleSearch(q) {
    const resDiv = document.getElementById('searchResults');
    document.getElementById('paymentDetails').innerHTML = '';

    if (!q || q.length < 2) {
        resDiv.style.display = 'none';
        return;
    }

    const res = allStudents.filter(s =>
        (s.egn && s.egn.includes(q)) ||
        (s.class_number && s.class_number.includes(q))
    ).slice(0, 10);

    if (res.length > 0) {
        resDiv.innerHTML = res.map(s => `
            <div class="search-item" onclick="selStudent( ${s.id} )">
                <strong>${s.first_name} ${s.last_name}</strong><br>
                <small>ЕГН: ${s.egn} | Клас: ${s.class_number} | Стая: ${s.room_number || 'N/A'}</small>
            </div>
        `).join('');
        resDiv.style.display = 'block';

        const items = resDiv.getElementsByClassName('search-item');
        for (let i of items) {
            i.style.cursor = 'pointer';
            i.onmouseover = function () { this.style.textDecoration = 'underline'; };
            i.onmouseout = function () { this.style.textDecoration = 'none'; };
        }

    } else {
        resDiv.innerHTML = '<div>Няма намерени резултати</div>';
        resDiv.style.display = 'block';
    }
}

async function selStudent(id) {
    document.getElementById('searchResults').style.display = 'none';
    document.getElementById('studentSearch').value = '';

    const detDiv = document.getElementById('paymentDetails');
    detDiv.innerHTML = '<p>Зареждане...</p>';

    try {
        const resp = await fetch(`/api/students/${id}/payment-status`);
        const data = await resp.json();

        if (data.error) {
            detDiv.innerHTML = `<p class="error">${data.error}</p>`;
            return;
        }

        const s = data.student;
        const mnths = data.months;

        const yrs = [...new Set(mnths.map(m => m.year))].sort((a, b) => b - a);
        const curYear = new Date().getFullYear();
        let selYear = yrs.includes(curYear) ? curYear : yrs[0];

        detDiv.innerHTML = `
            <div style="background: #f8fafc; padding: 15px; border-radius: 5px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">${s.first_name} ${s.last_name}</h4>
                <p>Клас: ${s.class_number} | Основна такса: ${s.base_fee} €</p>

            </div>
            
            <div style="margin-bottom: 15px;">
                <label>Изберете година: </label>
                <select id="yearFilter">
                    ${yrs.map(y => `<option value="${y}" ${y === selYear ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
                <button onclick="openPayModal()" style="margin-left: 20px;">Плати</button>
            </div>

            <div id="tableContainer"></div>
        `;

        currentData = data;


        const rendrTable = (yr) => {
            const filt = mnths.filter(m => m.year == yr);
            let h = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Месец</th>
                            <th>Година</th>
                            <th>Сума (€)</th>
                            <th>Статус</th>
                            <th>Дата на плащане</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            if (filt.length === 0) {
                h += '<tr><td colspan="5">Няма данни за тази година</td></tr>';
            } else {
                filt.forEach(m => {
                    const statClr = m.is_paid ? 'green' : 'red';
                    const statTxt = m.is_paid ? 'Платено' : 'Неплатено';
                    const dateTxt = m.payment_date ? new Date(m.payment_date).toLocaleString() : '-';

                    h += `
                        <tr>
                            <td>${m.month_name}</td>
                            <td>${m.year}</td>
                            <td>${m.amount_due}</td>
                            <td style="color: ${statClr}; font-weight: bold;">${statTxt}</td>
                            <td>${dateTxt}</td>
                        </tr>
                    `;


                });
            }

            h += '</tbody></table>';
            document.getElementById('tableContainer').innerHTML = h;
        };

        rendrTable(selYear);

        document.getElementById('yearFilter').onchange = (e) => {
            rendrTable(e.target.value);
        };

    } catch (e) {
        console.error(e);
        detDiv.innerHTML = `<p class="error">Error loading details</p>`;
    }
}

document.addEventListener('click', function (e) {
    const cont = document.querySelector('.search-container');
    const res = document.getElementById('searchResults');
    if (cont && !cont.contains(e.target) && res) {
        res.style.display = 'none';
    }
});

function openPayModal() {
    if (!currentData) return;

    const unpd = currentData.months.filter(m => !m.is_paid);
    const tot = unpd.reduce((sum, m) => sum + parseFloat(m.amount_due), 0).toFixed(2);

    const mdl = document.createElement('div');
    mdl.id = 'payModal';
    mdl.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 9999;';
    mdl.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 400px; width: 90%;">
            <h3>Плащане на такси</h3>
            <p><strong>Student:</strong> ${currentData.student.first_name} ${currentData.student.last_name}</p>
            <p><strong>Общо дължимо:</strong> ${tot} €</p>
            <p><strong>Неплатени месеци:</strong> ${unpd.length}</p>
            <div style="margin: 20px 0;">
                <label>Получена сума (€):</label><br>
                <input type="number" step="0.01" id="payAmount" style="width: 100%; padding: 8px; margin-top: 5px;">
            </div>
            <div style="margin: 20px 0;">
                <label>Метод на плащане:</label><br>
                <select id="payMethod" style="width: 100%; padding: 8px; margin-top: 5px;">
                    <option value="cash">В брой</option>
                    <option value="bank_transfer">По банков път</option>
                </select>

            </div>
            <div id="payResult" style="margin: 15px 0; padding: 10px; background: #f0f9ff; border-radius: 5px; display: none;"></div>
            <div style="text-align: right;">
                <button onclick="closePayModal()" style="margin-right: 10px;">Откажи</button>
                <button onclick="processPay()">Потвърди</button>

            </div>
        </div>
    `;
    document.body.appendChild(mdl);
}

function closePayModal() {
    const mdl = document.getElementById('payModal');
    if (mdl) mdl.remove();
}

function processPay() {
    const amt = parseFloat(document.getElementById('payAmount').value);
    if (!amt || amt <= 0) {
        alert('Въведете валидна сума');
        return;
    }

    const unpd = currentData.months.filter(m => !m.is_paid).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        const ord = { 'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6, 'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12 };
        return (ord[a.month_name] || 0) - (ord[b.month_name] || 0);
    });

    let rem = amt;
    const pd = [];
    let chng = 0;

    for (const m of unpd) {
        const due = parseFloat(m.amount_due);
        if (rem >= due) {
            pd.push({ month_id: m.month_id, year: m.year, month_name: m.month_name });
            rem -= due;
        } else {
            break;
        }
    }

    if (rem > 0) {
        chng = rem;
    }

    const resDiv = document.getElementById('payResult');
    resDiv.style.display = 'block';
    resDiv.innerHTML = `
        <strong>Резултат:</strong><br>
        Платени месеци: ${pd.length > 0 ? pd.map(p => `${p.month_name} ${p.year}`).join(', ') : 'Няма'}<br>
        ${chng > 0 ? `<strong style="color: orange;">Ресто: ${chng.toFixed(2)} €</strong>` : ''}
        ${pd.length > 0 ? '<br><button onclick="confirmPay(' + JSON.stringify(pd).replace(/"/g, "'") + ')">Запиши</button>' : ''}
    `;
}

async function sendToPrinter(studentName, paidMonths, method) {
    const today = new Date().toLocaleDateString('bg-BG');
    const monthsString = paidMonths.map(m => `${m.month_name} ${m.year}`).join(', ');

    const receiptData = {
        date: today,
        student_name: studentName,
        months: monthsString,
        method: method === 'cash' ? 'В брой' : 'По банков път'
    };

    try {
        const response = await fetch('http://localhost:5001/print-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receiptData)
        });
        const result = await response.json();
        if (!result.success) console.error('Грешка при принтера:', result.error);
    } catch (err) {
        console.error('Принтер сървърът не е достъпен. Проверете дали Python скриптът работи.', err);
    }
}

function confirmPay(paidMnths) {
    const payMeth = document.getElementById('payMethod').value;
    const student = currentData.student;
    const totalEuro = paidMnths.reduce((sum, m) => sum + parseFloat(m.amount_due), 0);

    fetch(`/api/students/${student.id}/process-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: paidMnths, payment_method: payMeth })
    })
    .then(r => r.json())
    .then(d => {
        if (d.success) {
            fetch('http://localhost:5001/print-receipt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_name: `${student.first_name} ${student.last_name}`,
                    egn: student.egn,
                    class_num: student.class_number,
                    block: student.block,
                    room: student.room_number || 'N/A',
                    months: paidMnths.map(m => m.month_name).join(', '),
                    amount_euro: totalEuro,
                    method: payMeth,
                    invoice_num: Math.floor(Math.random() * 100000),
                    cashier: "ADMIN"
                })
            });

            alert('Плащането е записано успешно!');
            closePayModal();
            selStudent(student.id);
        } else {
            alert('Грешка: ' + (d.error || 'Unknown'));
        }
    });
}