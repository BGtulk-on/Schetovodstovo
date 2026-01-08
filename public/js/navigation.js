async function navigate(page) {
    const content = document.getElementById('content');
    if (page === 'students') {
        renderStudentForm(content, 'add');
    } else if (page === 'reports') {
        content.innerHTML = `
            <h3>Справки</h3>
            <div class="report-controls">
                <select id="reportType" onchange="handleReportTypeChange()">
                    <option value="">Изберете справка...</option>
                    <option value="all">Всички ученици</option>
                    <option value="rooms">Стаи</option>
                    <option value="daily">Дневни плащания</option>
                </select>
                <input type="text" id="tableSearch" class="search-input" placeholder="Търсене..." onkeyup="filterTable()">
            </div>
            <div id="reportResult"></div>
        `;
    } else if (page === 'settings') {
        renderSettings(content);
    } else if (page === 'pay') {
        renderPay(content);
    } else {
        content.innerHTML = `<h3>${page}</h3><p>Work in progress...</p>`;
    }
}
