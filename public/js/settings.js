async function renderSettings(cont) {
    cont.innerHTML = `
        <h3>Настройки на системата</h3>
        <div id="settingsContent">
            <p>Зареждане на данни...</p>
        </div>
    `;
    await renderUnifiedSettings();
}

async function renderUnifiedSettings() {
    const container = document.getElementById('settingsContent');
    try {
        const [feeResp, monthsResp] = await Promise.all([
            fetch('/api/settings/base-fee'),
            fetch('/api/months')
        ]);
        
        const feeData = await feeResp.json();
        const months = await monthsResp.json();

        const order = { 'September': 1, 'October': 2, 'November': 3, 'December': 4, 'January': 5, 'February': 6, 'March': 7, 'April': 8, 'May': 9, 'June': 10 };
        months.sort((a, b) => (order[a.month_name] || 99) - (order[b.month_name] || 99));

        container.innerHTML = `
            <table class="data-table">
                <thead>
                    <tr><th colspan="4">Глобална такса</th></tr>
                </thead>
                <tbody>
                    <tr>
                        <td><b>Дневна такса (€):</b></td>
                        <td><input type="number" step="0.01" id="dailyFeeInput" value="${feeData.value}" style="width: 60px;"></td>
                        <td>
                            <input type="checkbox" id="updateAllStudents" checked> Обнови дневната такса за всички ученици
                        </td>
                        <td align="right"><button onclick="saveDailyFee()">Запази такса</button></td>
                    </tr>
                </tbody>
            </table>

            <br>

            <table class="data-table">
                <thead>
                    <tr>
                        <th width="50">Статус</th>
                        <th>Месец</th>
                        <th width="100">Работни дни</th>
                        <th width="80">Действие</th>
                    </tr>
                </thead>
                <tbody>
                    ${months.map(m => {
                        const days = Math.round(m.fee_multiplier || 0);
                        const isActive = days > 0;
                        return `
                            <tr>
                                <td align="center">
                                    <input type="checkbox" id="check-${m.id}" ${isActive ? 'checked' : ''} onchange="toggleMonthRow(${m.id})">
                                </td>
                                <td>${m.month_name}</td>
                                <td>
                                    <input type="number" id="days-${m.id}" value="${days}" min="0" max="31" step="1"
                                           oninput="this.value=Math.round(this.value)" ${!isActive ? 'disabled' : ''} 
                                           style="width: 50px;">
                                </td>
                                <td align="center">
                                    <button onclick="saveSingleMonth(${m.id})">Запази</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
                <tfoot class="table-footer-actions">
                    <tr>
                        <td colspan="4" class="footer-right">
                            <div class="footer-flex-container">
                                <span id="saveStatus"></span>
                                <button onclick="saveMonthDays()" class="btn-save-all">
                                    Запази всички месеци
                                </button>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        `;
    } catch (err) {
        container.innerHTML = "Грешка при зареждане.";
    }
}

async function saveDailyFee() {
    const dailyFee = document.getElementById('dailyFeeInput').value;
    const updateAll = document.getElementById('updateAllStudents').checked;
    try {
        const r = await fetch('/api/settings/base-fee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_fee: dailyFee, update_all: updateAll })
        });
        if (r.ok) alert('Таксата е обновена');
    } catch (err) { alert('Грешка'); }
}

async function saveSingleMonth(id) {
    const isChecked = document.getElementById(`check-${id}`).checked;
    const days = isChecked ? Math.round(document.getElementById(`days-${id}`).value) : 0;
    try {
        const resp = await fetch(`/api/months/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fee_multiplier: days })
        });
        if (resp.ok) alert('Запазено');
    } catch (err) { alert('Грешка'); }
}

function toggleMonthRow(id) {
    const chk = document.getElementById(`check-${id}`);
    const inp = document.getElementById(`days-${id}`);
    inp.disabled = !chk.checked;
    if (!chk.checked) inp.value = 0;
}

function validateDays(input) {
    let val = parseInt(input.value);
    if (isNaN(val) || val < 0) input.value = 0;
    if (val > 31) input.value = 31;
}

function toggleMonthRow(id) {
    const checkbox = document.getElementById(`check-${id}`);
    const input = document.getElementById(`days-${id}`);
    input.disabled = !checkbox.checked;
    if (!checkbox.checked) input.value = 0;
}

async function saveDailyFee() {
    const dailyFee = document.getElementById('dailyFeeInput').value;
    const updateAll = document.getElementById('updateAllStudents').checked;
    
    if (!dailyFee) return alert('Въведете сума');

    try {
        const r = await fetch('/api/settings/base-fee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_fee: dailyFee, update_all: updateAll })
        });
        if (r.ok) alert('Дневната такса е запазена!');
        else alert('Грешка при запис на такса');
    } catch (err) {
        alert('Сървърна грешка');
    }
}

async function saveMonthDays() {
    const statusDiv = document.getElementById('saveStatus');
    statusDiv.innerHTML = "Записване на месеците...";

    try {
        const monthInputs = document.querySelectorAll('input[id^="days-"]');
        const promises = Array.from(monthInputs).map(input => {
            const id = input.id.split('-')[1];
            const isChecked = document.getElementById(`check-${id}`).checked;
            const days = isChecked ? input.value : 0;
            
            return fetch(`/api/months/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fee_multiplier: days })
            });
        });

        await Promise.all(promises);
        statusDiv.innerHTML = "Дните са обновени успешно!";
        alert('Дните по месеци са запазени!');
    } catch (err) {
        statusDiv.innerHTML = "Грешка!";
        alert('Неуспешно обновяване на месеците');
    }
}