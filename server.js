require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;


const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/schetovodstvo',
});


pool.query('SELECT NOW()', (err, res) => {
    if (err) console.error('DB Connection Error:', err.message);
    else console.log('DB Connected Successfully');
});

app.use(express.json());

app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});
app.use(express.urlencoded({ extended: true }));
app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_KEY || 'secret-key'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));


app.use(express.static(path.join(__dirname, 'public')));


const requireLogin = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};


app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && (password === user.password)) {
            req.session.userId = user.id;
            req.session.role = user.role;
            res.json({ success: true, role: user.role });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login Error:', err.message, err.stack);
        res.status(500).json({ error: 'Internal server error', details: err.message });
    }
});


app.post('/api/logout', (req, res) => {
    req.session = null;
    res.json({ success: true });
});


app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ authenticated: true, role: req.session.role });
    } else {
        res.json({ authenticated: false });
    }
});


app.get('/api/family-statuses', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM family_statuses ORDER BY status_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/rooms', requireLogin, async (req, res) => {
    try {
        const query = `
            SELECT r.*, 
                   COUNT(s.id)::int as current_occupancy,
                   STRING_AGG(DISTINCT s.class_number, ', ') as class_numbers
            FROM rooms r 
            LEFT JOIN students s ON r.id = s.room_id 
            WHERE r.is_in_use = TRUE 
            GROUP BY r.id 
            ORDER BY r.room_number
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/rooms/:id', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM rooms WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Room not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/rooms/:id', requireLogin, async (req, res) => {
    const { capacity, is_in_use, has_problem, problem_details } = req.body;
    try {
        const query = `
            UPDATE rooms SET 
                capacity = $1, 
                is_in_use = $2, 
                has_problem = $3, 
                problem_details = $4
            WHERE id = $5
        `;
        const values = [capacity, is_in_use, has_problem, problem_details, req.params.id];
        await pool.query(query, values);
        res.json({ success: true });
    } catch (err) {
        console.error('Update Room Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/students', requireLogin, async (req, res) => {
    const {
        first_name, last_name, egn, class_number, from_address,
        phone, parent_phone, email, sex, family_status_id,
        punishments, block, room_id, payment_method, notes
    } = req.body;

    try {

        const roomCheck = await pool.query(
            'SELECT capacity, (SELECT COUNT(*) FROM students WHERE room_id = $1)::int as count FROM rooms WHERE id = $1',
            [room_id]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid room' });
        }

        const { capacity, count } = roomCheck.rows[0];
        if (count >= capacity) {
            return res.status(400).json({ error: 'Стаята е пълна!' });
        }

        const query = `
            INSERT INTO students (
                first_name, last_name, egn, class_number, from_address, 
                phone, parent_phone, email, sex, family_status_id, 
                punishments, block, room_id, payment_method, fee, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id
        `;
        const values = [
            first_name, last_name, egn, class_number, from_address,
            phone, parent_phone, email, sex, family_status_id,
            punishments || 0, block, room_id, payment_method, baseFee, notes
        ];
        const result = await pool.query(query, values);
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        console.error('Add Student Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/students/:id', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM students WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/students/:id', requireLogin, async (req, res) => {
    const {
        first_name, last_name, egn, class_number, from_address,
        phone, parent_phone, email, sex, family_status_id,
        punishments, block, room_id, payment_method, notes
    } = req.body;

    try {

        const roomCheck = await pool.query(
            'SELECT capacity, (SELECT COUNT(*) FROM students WHERE room_id = $1 AND id != $2)::int as count FROM rooms WHERE id = $1',
            [room_id, req.params.id]
        );
        if (roomCheck.rows.length === 0) return res.status(400).json({ error: 'Invalid room' });
        const { capacity, count } = roomCheck.rows[0];
        if (count >= capacity) return res.status(400).json({ error: 'Стаята е пълна!' });

        const query = `
            UPDATE students SET 
                first_name = $1, last_name = $2, egn = $3, class_number = $4, 
                from_address = $5, phone = $6, parent_phone = $7, email = $8, 
                sex = $9, family_status_id = $10, punishments = $11, 
                block = $12, room_id = $13, payment_method = $14, notes = $15
            WHERE id = $16
        `;
        const values = [
            first_name, last_name, egn, class_number, from_address,
            phone, parent_phone, email, sex, family_status_id,
            punishments || 0, block, room_id, payment_method, notes, req.params.id
        ];
        await pool.query(query, values);
        res.json({ success: true });
    } catch (err) {
        console.error('Update Student Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/students/search', requireLogin, async (req, res) => {
    const { q } = req.query;
    console.log(`[Search] Request for: ${q}`);
    if (!q) return res.json([]);

    try {
        const query = `
            SELECT s.id, s.first_name, s.last_name, s.egn, s.class_number, r.room_number 
            FROM students s
            LEFT JOIN rooms r ON s.room_id = r.id
            WHERE s.egn::text ILIKE $1 OR s.class_number::text ILIKE $1
            LIMIT 10
        `;
        const result = await pool.query(query, [`%${q}%`]);
        console.log(`[Search] Found ${result.rows.length} rows`);
        res.json(result.rows);
    } catch (err) {
        console.error('[Search] ERROR:', err.message, err.stack);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/students/:id/payment-status', requireLogin, async (req, res) => {
    try {
        const studentId = req.params.id;

        const studentRes = await pool.query('SELECT * FROM students WHERE id = $1', [studentId]);
        if (studentRes.rows.length === 0) return res.status(404).json({ error: 'Student not found' });
        const student = studentRes.rows[0];


        const monthsRes = await pool.query('SELECT * FROM months ORDER BY id');
        const months = monthsRes.rows;

        const paymentsRes = await pool.query('SELECT * FROM student_payments WHERE student_id = $1', [studentId]);
        const payments = paymentsRes.rows;

        const createdAt = new Date(student.created_at);
        const now = new Date();
        let currentIter = new Date(createdAt.getFullYear(), createdAt.getMonth(), 1);
        const status = [];

        const monthMap = {};
        months.forEach(m => monthMap[m.month_name] = m);
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        while (currentIter <= now) {
            const year = currentIter.getFullYear();
            const monthIndex = currentIter.getMonth();
            const monthName = monthNames[monthIndex];
            const dbMonth = monthMap[monthName];

            if (dbMonth && parseFloat(dbMonth.fee_multiplier) > 0) {
                const payment = payments.find(p => p.month_id === dbMonth.id && p.year === year);
                const amountDue = (parseFloat(student.fee) * parseFloat(dbMonth.fee_multiplier)).toFixed(2);

                status.push({
                    month_id: dbMonth.id,
                    month_name: dbMonth.month_name,
                    year: year,
                    amount_due: amountDue,
                    is_paid: payment ? payment.is_paid : false,
                    payment_date: payment ? payment.payment_date : null
                });
            }


            currentIter.setMonth(currentIter.getMonth() + 1);
        }

        res.json({
            student: {
                id: student.id,
                first_name: student.first_name,
                last_name: student.last_name,
                class_number: student.class_number,
                base_fee: student.fee,
                created_at: student.created_at
            },
            months: status
        });

    } catch (err) {
        console.error('Payment Status Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/students/:id/process-payment', requireLogin, async (req, res) => {
    const studentId = req.params.id;
    const { payments, payment_method } = req.body;

    try {
        for (const p of payments) {
            await pool.query(
                `INSERT INTO student_payments (student_id, month_id, year, is_paid, payment_date, payment_method)
                 VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, $4)
                 ON CONFLICT (student_id, month_id, year)
                 DO UPDATE SET is_paid = true, payment_date = CURRENT_TIMESTAMP, payment_method = $4`,
                [studentId, p.month_id, p.year, payment_method]
            );
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Process Payment Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/reports/daily-payments', requireLogin, async (req, res) => {
    try {
        const query = `
            SELECT 
                sp.payment_date,
                s.first_name,
                s.last_name,
                s.egn,
                m.month_name,
                sp.year,
                (s.fee * m.fee_multiplier) as amount,
                sp.payment_method
            FROM student_payments sp
            JOIN students s ON sp.student_id = s.id
            JOIN months m ON sp.month_id = m.id
            WHERE DATE(sp.payment_date) = CURRENT_DATE
            AND sp.is_paid = true
            ORDER BY sp.payment_date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Daily Payments Report Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/students', requireLogin, async (req, res) => {
    try {
        const query = `
            SELECT 
                s.*, 
                r.room_number, 
                fs.status_name, 
                fs.discount_percentage
            FROM students s
            LEFT JOIN rooms r ON s.room_id = r.id
            LEFT JOIN family_statuses fs ON s.family_status_id = fs.id
            ORDER BY s.last_name, s.first_name
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Fetch Students Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});


app.get('/api/months', requireLogin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM months ORDER BY id');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/api/months/:id', requireLogin, async (req, res) => {
    const { fee_multiplier } = req.body;
    try {
        const query = 'UPDATE months SET fee_multiplier = $1 WHERE id = $2';
        await pool.query(query, [fee_multiplier, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Update Month Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/settings/base-fee', requireLogin, async (req, res) => {
    try {
        const result = await pool.query("SELECT value FROM settings WHERE key = 'base_fee'");
        if (result.rows.length > 0) {
            res.json({ value: result.rows[0].value });
        } else {
            res.json({ value: '11.00' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/settings/base-fee', requireLogin, async (req, res) => {
    const { base_fee, update_all } = req.body;
    try {
        await pool.query("INSERT INTO settings (key, value) VALUES ('base_fee', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [base_fee]);

        if (update_all) {
            await pool.query("UPDATE students SET fee = $1", [base_fee]);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Update Base Fee Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
