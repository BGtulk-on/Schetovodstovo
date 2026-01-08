async function renderSettings(cont) {
    cont.innerHTML = `
        <h3>Настройки</h3>
        <div style="margin-bottom: 20px;">
            <label for="settingsView">Изберете настройка: </label>
            <select id="settingsView" onchange="switchView(this.value)">
                <option value="mult">Дължими такси (Множители)</option>
                <option value="base">Основна такса</option>
            </select>
        </div>
        <div id="settingsContent"></div>
    `;

    switchView('mult');
}

async function switchView(v) {
    const c = document.getElementById('settingsContent');
    c.innerHTML = '<p>Зареждане...</p>';

    if (v === 'mult') await renMult(c);
    else if (v === 'base') await renBase(c);
}

async function renMult(div) {
    try {
        const r = await fetch('/api/months');
        const m = await r.json();

        const order = {
            'January': 1, 'February': 2, 'March': 3, 'April': 4, 'May': 5, 'June': 6,
            'July': 7, 'August': 8, 'September': 9, 'October': 10, 'November': 11, 'December': 12
        };
        m.sort((a, b) => (order[a.month_name] || 99) - (order[b.month_name] || 99));

        let h = `
            <h4>Настройка на такси по месеци</h4>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Месец</th>
                        <th>Множител</th>
                        <th>Действие</th>
                    </tr>
                </thead>
                <tbody>
        `;

        m.forEach(x => {
            h += `
                <tr>
                    <td>${x.month_name}</td>
                    <td>
                        <input type="number" step="0.01" value="${x.fee_multiplier}" id="mult-${x.id}" class=" multiplier-input ">
                    </td>
                    <td>
                        <button onclick="updMult(${x.id})">Запиши</button>
                    </td>
                </tr>
            `;
        });

        h += `</tbody></table>`;
        div.innerHTML = h;

    } catch (err) {
        div.innerHTML = '<p class="error">Error</p>';
    }
}

async function updMult(id) {
    const v = document.getElementById(`mult-${id}`).value;
    try {
        const r = await fetch(`/api/months/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fee_multiplier: v })
        });
        if (r.ok) alert('Ok');
        else alert('Err');
    } catch (e) {
        alert('Error');
    }
}

async function renBase(div) {
    try {
        const r = await fetch('/api/settings/base-fee');
        const d = await r.json();

        div.innerHTML = `
            <h4>Настройка на основна месечна такса</h4>
            <div class="form-group">
                <label>Основна такса (€): </label>
                <input type="number" step="0.01" id="baseFeeInput" value="${d.value}">
            </div>
            <div class="form-group" style="margin-top: 10px;">
                <label>
                    <input type="checkbox" id="updateAll" style="width: auto; margin-right: 5px;" checked>
                    Обнови таксата на всички текущи ученици
                </label>
            </div>
            <button onclick="saveBase()" style="margin-top: 15px;">Запиши</button>
        `;

    } catch (e) {
        div.innerHTML = '<p>Error</p>';
    }
}

async function saveBase() {
    const f = document.getElementById('baseFeeInput').value;
    const all = document.getElementById('updateAll').checked;

    if (!f) return alert('Input amount');
    if (all && !confirm('Sure?')) return;

    try {
        const r = await fetch('/api/settings/base-fee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base_fee: f, update_all: all })
        });

        if (r.ok) alert('Updated');
        else alert('Error');

    } catch (e) { alert('Error') }
}
