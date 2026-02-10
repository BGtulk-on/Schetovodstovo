async function renderStudentForm(container, mode, studentId = null) {
    let student = {};
    if (mode === 'edit') {
        const resp = await fetch(`/api/students/${studentId}`);
        student = await resp.json();
    }

    container.innerHTML = `
        <h3>${mode === 'edit' ? 'Редактирай ученик' : 'Настани нов ученик'}</h3>
        <div style="display: flex; gap: 20px;">
            <form id="studentForm" style="flex: 1;">
                <table>
                    <tr><td>Име:</td><td><input type="text" name="first_name" value="${student.first_name || ''}" pattern="[a-zA-Zа-яА-Я]+" oninput="this.value = this.value.replace(/[^a-zA-Zа-яА-Я]+/g, '')" required title="Само букви са позволени"></td></tr>
                    <tr><td>Фамилия:</td><td><input type="text" name="last_name" value="${student.last_name || ''}" pattern="[a-zA-Zа-яА-Я]+" oninput="this.value = this.value.replace(/[^a-zA-Zа-яА-Я]+/g, '')" required title="Само букви са позволени"></td></tr>
                    <tr><td>ЕГН:</td><td><input type="text" name="egn" maxlength="10" value="${student.egn || ''}" pattern="\\d{10}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required title="Трябва да съдържа точно 10 цифри"></td></tr>
                    <tr><td>Курсов номер:</td><td><input type="text" name="class_number" maxlength="5" value="${student.class_number || ''}" oninput="this.value = this.value.replace(/[^0-9]/g, '')" required title="Само цифри, макс 5"></td></tr>
                    <tr><td>Адрес:</td><td><textarea name="from_address" required>${student.from_address || ''}</textarea></td></tr>
                    <tr><td>Телефон:</td><td><input type="text" name="phone" maxlength="13" value="${student.phone || ''}" oninput="this.value = this.value.replace(/[^0-9+]/g, '')" title="Само цифри и +"></td></tr>
                    <tr><td>Телефон на родител:</td><td><input type="text" name="parent_phone" maxlength="13" value="${student.parent_phone || ''}" oninput="this.value = this.value.replace(/[^0-9+]/g, '')" required title="Само цифри и +"></td></tr>
                    <tr><td>Email:</td><td><input type="email" name="email" value="${student.email || ''}"></td></tr>
                    <tr><td>Пол:</td><td><select name="sex" required>
                        <option value="male" ${student.sex === 'male' ? 'selected' : ''}>Мъж</option>
                        <option value="female" ${student.sex === 'female' ? 'selected' : ''}>Жена</option>
                    </select></td></tr>
                    <tr><td>Семейно положение:</td><td><select name="family_status_id" id="fsSelect" required></select></td></tr>
                    <tr><td>Наказания:</td><td><input type="number" name="punishments" value="${student.punishments || '0'}"></td></tr>
                    <tr><td>Блок:</td><td><select name="block" required>
                        <option value="1" ${student.block === '1' ? 'selected' : ''}>1</option>
                        <option value="2" ${student.block === '2' ? 'selected' : ''}>2</option>
                    </select></td></tr>
                    <tr><td>Стая:</td><td><select name="room_id" id="roomSelect" required></select></td></tr>
                    <tr><td>Метод на плащане:</td><td><select name="payment_method" required>
                        <option value="cash" ${student.payment_method === 'cash' ? 'selected' : ''}>В брой</option>
                        <option value="bank transfer" ${student.payment_method === 'bank transfer' ? 'selected' : ''}>Банков път</option>
                    </select></td></tr>
                    <tr><td colspan="2">
                        <button type="submit">Запази</button>
                        ${mode === 'edit' ? '<button type="button" onclick="navigate(\'reports\')">Отказ</button>' : ''}
                    </td></tr>
                </table>
            </form>
            <div style="flex: 0 0 300px;">
                <label style="display: block; margin-bottom: 5px;"><strong>Бележки:</strong></label>
                <textarea name="notes" form="studentForm" style="width: 100%; height: 400px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">${student.notes || ''}</textarea>
            </div>
        </div>
        <div id="status"></div>
    `;

    try {
        const fsResp = await fetch('/api/family-statuses');
        const fsData = await fsResp.json();
        if (Array.isArray(fsData)) {
            document.getElementById('fsSelect').innerHTML = fsData.map(fs =>
                `<option value="${fs.id}" ${student.family_status_id == fs.id ? 'selected' : ''}>${fs.status_name} (${fs.discount_percentage}% отстъпка)</option>`
            ).join('');
        }

        const roomResp = await fetch('/api/rooms');
        const roomData = await roomResp.json();
        if (Array.isArray(roomData)) {
            document.getElementById('roomSelect').innerHTML = roomData.map(r => {
                const freeSpaces = r.capacity - (r.current_occupancy || 0);
                return `<option value="${r.id}" ${student.room_id == r.id ? 'selected' : ''}>Стая ${r.room_number} (Капацитет: ${r.capacity}, Свободни: ${freeSpaces})</option>`;
            }).join('');
        }
    } catch (err) {
        console.error('Error loading options:', err);
    }

    document.getElementById('studentForm').onsubmit = (e) => handleStudentSubmit(e, mode, studentId);
}

async function handleStudentSubmit(e, mode, studentId) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const statusDiv = document.getElementById('status');

    const url = mode === 'edit' ? `/api/students/${studentId}` : '/api/students';

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await resp.json();
        if (result.success) {
            statusDiv.innerHTML = `<span class="text-green">Успешно запазено!</span>`;
            if (mode === 'add') e.target.reset();
            else setTimeout(() => navigate('reports'), 1000);
        } else {
            statusDiv.innerHTML = `<span class="text-red">Грешка: ${result.error}</span>`;
        }
    } catch (err) {
        statusDiv.innerHTML = `<span class="text-red">Грешка при връзката: ${err.message}</span>`;
    }
}

function renderStudentTable(data) {
    const resultDiv = document.getElementById('reportResult');
    if (!data || data.length === 0) {
        resultDiv.innerHTML = '<p>Няма намерени ученици.</p>';
        return;
    }

    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Име</th>
                    <th>Фамилия</th>
                    <th>ЕГН</th>
                    <th>Курсов №</th>
                    <th>Блок</th>
                    <th>Стая</th>
                    <th>Пол</th>

                    <th>Действие</th>
                </tr>
            </thead>
            <tbody id="studentTableBody">
    `;

    data.forEach(s => {
        html += `
            <tr>
                <td>${s.first_name}</td>
                <td>${s.last_name}</td>
                <td>${s.egn}</td>
                <td>${s.class_number}</td>
                <td>${s.block}</td>
                <td>${s.room_number || '-'}</td>
                <td>${s.sex === 'male' ? 'М' : 'Ж'}</td>

                <td><button onclick="renderStudentForm(document.getElementById('content'), 'edit', ${s.id})">Редактирай</button></td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    resultDiv.innerHTML = html;
}
