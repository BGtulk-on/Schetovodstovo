

CREATE DATABASE IF NOT EXISTS shchetovodstvo;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'owner')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users (username, password, role) VALUES 
('admin', 'uktc2026', 'admin'),
('owner', 'yovomisho', 'owner')
ON CONFLICT (username) DO NOTHING;

CREATE TABLE IF NOT EXISTS family_statuses (
    id SERIAL PRIMARY KEY,
    status_name VARCHAR(100) NOT NULL UNIQUE,
    discount_percentage INT NOT NULL DEFAULT 0
);

INSERT INTO family_statuses (status_name, discount_percentage) VALUES 
('инвалид 1ва група', 30),
('сирак без 2ма родители', 30),
('самотана майка с деца', 100),
('полусирак', 70),
('от многодетно семейство', 100),
('инвалид 2ра група', 100),
('нормален', 0)
ON CONFLICT (status_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    capacity INT CHECK (capacity IN (2, 3)) NOT NULL,
    is_in_use BOOLEAN DEFAULT TRUE,
    has_problem BOOLEAN DEFAULT FALSE,
    problem_details TEXT
);

CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    egn VARCHAR(10) NOT NULL UNIQUE,
    class_number VARCHAR(10) NOT NULL,
    from_address TEXT NOT NULL,
    phone VARCHAR(20),
    parent_phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')) NOT NULL,
    family_status_id INT NOT NULL REFERENCES family_statuses(id),
    punishments INT NOT NULL DEFAULT 0,
    block VARCHAR(10) CHECK (block IN ('1', '2')) NOT NULL,
    room_id INT NOT NULL REFERENCES rooms(id),
    fee DECIMAL(10, 2) NOT NULL DEFAULT 11.00,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'bank transfer')) NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS months (
    id SERIAL PRIMARY KEY,
    month_name VARCHAR(20) NOT NULL UNIQUE,
    fee_multiplier DECIMAL(3, 2) NOT NULL DEFAULT 1.00
);

INSERT INTO months (month_name, fee_multiplier) VALUES 
('September', 1.00),
('October', 1.00),
('November', 1.00),
('December', 0.50),
('January', 1.00),
('February', 0.50),
('March', 1.00),
('April', 1.00),
('May', 1.00),
('June', 1.00)
ON CONFLICT (month_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS student_payments (
    id SERIAL PRIMARY KEY,
    student_id INT NOT NULL REFERENCES students(id),
    month_id INT NOT NULL REFERENCES months(id),
    year INT NOT NULL,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    payment_date TIMESTAMP,
    payment_method VARCHAR(20),
    UNIQUE (student_id, month_id, year)
);

CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255)
);

INSERT INTO settings (key, value) VALUES ('base_fee', '11.00') ON CONFLICT DO NOTHING;
