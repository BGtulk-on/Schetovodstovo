let allStudentsData = [];

async function init() {
    const resp = await fetch('/api/check-auth');
    const data = await resp.json();

    if (!data.authenticated) {
        window.location.href = '/index.html';
    } else {
        document.getElementById('app').style.display = 'block';
        document.getElementById('userRole').textContent = `${data.role.toUpperCase()}`;
        navigate('students');
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/index.html';
}

document.addEventListener('DOMContentLoaded', init);
