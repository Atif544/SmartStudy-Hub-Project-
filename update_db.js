const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'Atif',
    password: 'arpita',
    database: 'classroom_system'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Connected to MySQL.');
    
    const queries = [
        // 1. Add type to materials
        "ALTER TABLE materials ADD COLUMN type VARCHAR(50) DEFAULT 'document'",
        
        // 2. Add reports table
        `CREATE TABLE IF NOT EXISTS reports (
            id INT PRIMARY KEY AUTO_INCREMENT,
            material_id INT,
            reported_by INT,
            reason TEXT,
            status ENUM('pending', 'reviewed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
            FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        // 3. Add likes column to materials
        "ALTER TABLE materials ADD COLUMN likes INT DEFAULT 0",
        
        // 4. Add teacher analytics to users
        "ALTER TABLE users ADD COLUMN verifications INT DEFAULT 0",
        "ALTER TABLE users ADD COLUMN requests_fulfilled INT DEFAULT 0",
        
        // 5. Add fulfilled_with & rating to requests
        "ALTER TABLE requests ADD COLUMN fulfilled_with INT DEFAULT NULL",
        "ALTER TABLE requests ADD COLUMN rating INT DEFAULT 0",
        "ALTER TABLE requests ADD FOREIGN KEY (fulfilled_with) REFERENCES materials(id) ON DELETE SET NULL",
        
        // 6. Create document_likes table
        `CREATE TABLE IF NOT EXISTS document_likes (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            material_id INT,
            liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
        )`,
        
        // 7. Create notifications table
        `CREATE TABLE IF NOT EXISTS notifications (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT,
            message TEXT NOT NULL,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,
        
        // 8. Create MCQ tests table
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
        
        // 9. Create MCQ questions table
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
        
        // 10. Create MCQ attempts table
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

    let completed = 0;
    queries.forEach(q => {
        db.query(q, (err) => {
            if (err) {
                // Ignore "duplicate column" errors
                if (err.code !== 'ER_DUP_FIELDNAME') {
                    console.log("Error:", err.message);
                }
            } else {
                console.log("Successfully ran query.");
            }
            
            completed++;
            if (completed === queries.length) {
                console.log("Database update done.");
                db.end();
            }
        });
    });
});
