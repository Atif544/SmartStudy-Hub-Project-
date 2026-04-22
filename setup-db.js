require('dotenv').config();
const mysql = require('mysql2');

console.log('🔄 Connecting to Clever Cloud MySQL...');
console.log('   Host:', process.env.DB_HOST);
console.log('   User:', process.env.DB_USER);
console.log('   DB:  ', process.env.DB_NAME);

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    connectTimeout: 20000
});

db.connect((err) => {
    if (err) {
        console.error('❌ Connection failed:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to Clever Cloud MySQL!\n');
    createTables();
});

function createTables() {
    const statements = [
        // Users Table
        `CREATE TABLE IF NOT EXISTS users (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('student', 'teacher') DEFAULT 'student',
            points INT DEFAULT 0,
            streak INT DEFAULT 0,
            last_activity DATE
        )`,

        // Materials/Resources Table
        `CREATE TABLE IF NOT EXISTS materials (
            id INT PRIMARY KEY AUTO_INCREMENT,
            title VARCHAR(200) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            semester INT NOT NULL,
            filename VARCHAR(255) NOT NULL,
            uploaded_by INT,
            downloads INT DEFAULT 0,
            likes INT DEFAULT 0,
            verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        )`,

        // Downloads History
        `CREATE TABLE IF NOT EXISTS downloads (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            material_id INT,
            subject VARCHAR(100),
            downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )`,

        // Resource Requests
        `CREATE TABLE IF NOT EXISTS requests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            student_id INT,
            title VARCHAR(200) NOT NULL,
            subject VARCHAR(100) NOT NULL,
            semester INT NOT NULL,
            status ENUM('pending', 'fulfilled') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Document Likes
        `CREATE TABLE IF NOT EXISTS document_likes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            material_id INT,
            liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )`,

        // Notifications
        `CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // MCQ Tests
        `CREATE TABLE IF NOT EXISTS mcq_tests (
            id INT PRIMARY KEY AUTO_INCREMENT,
            material_id INT,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            created_by INT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // MCQ Questions
        `CREATE TABLE IF NOT EXISTS mcq_questions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            test_id INT,
            question TEXT NOT NULL,
            option_a VARCHAR(255) NOT NULL,
            option_b VARCHAR(255) NOT NULL,
            option_c VARCHAR(255) NOT NULL,
            option_d VARCHAR(255) NOT NULL,
            correct_answer CHAR(1) NOT NULL,
            FOREIGN KEY (test_id) REFERENCES mcq_tests(id) ON DELETE CASCADE
        )`,

        // MCQ Attempts
        `CREATE TABLE IF NOT EXISTS mcq_attempts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            test_id INT,
            score INT DEFAULT 0,
            total_questions INT DEFAULT 0,
            attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (test_id) REFERENCES mcq_tests(id) ON DELETE CASCADE
        )`
    ];

    const names = [
        'users', 'materials', 'downloads', 'requests',
        'document_likes', 'notifications', 'mcq_tests',
        'mcq_questions', 'mcq_attempts'
    ];

    let i = 0;
    function runNext() {
        if (i >= statements.length) {
            console.log('\n🎉 All tables created successfully!');
            console.log('✅ Your Clever Cloud database is ready.');
            console.log('👉 Now run: node app.js');
            db.end();
            return;
        }
        db.query(statements[i], (err) => {
            if (err && err.code !== 'ER_TABLE_EXISTS_ERROR') {
                console.error(`❌ Failed to create table "${names[i]}":`, err.message);
            } else {
                console.log(`✅ Table "${names[i]}" ready`);
            }
            i++;
            runNext();
        });
    }

    runNext();
}
