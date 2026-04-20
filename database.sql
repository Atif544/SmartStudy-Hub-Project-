-- Create Database
CREATE DATABASE IF NOT EXISTS classroom_system;
USE classroom_system;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher') DEFAULT 'student',
    points INT DEFAULT 0,
    streak INT DEFAULT 0,
    last_activity DATE
);

-- Materials/Resources Table
CREATE TABLE IF NOT EXISTS materials (
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
);

-- Downloads History (for smart recommendations)
CREATE TABLE IF NOT EXISTS downloads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    material_id INT,
    subject VARCHAR(100),
    downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Resource Requests
CREATE TABLE IF NOT EXISTS requests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    semester INT NOT NULL,
    status ENUM('pending', 'fulfilled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Document Likes
CREATE TABLE IF NOT EXISTS document_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    material_id INT,
    liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- MCQ Tests/Quizzes
CREATE TABLE IF NOT EXISTS mcq_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    material_id INT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- MCQ Questions
CREATE TABLE IF NOT EXISTS mcq_questions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    test_id INT,
    question TEXT NOT NULL,
    option_a VARCHAR(255) NOT NULL,
    option_b VARCHAR(255) NOT NULL,
    option_c VARCHAR(255) NOT NULL,
    option_d VARCHAR(255) NOT NULL,
    correct_answer CHAR(1) NOT NULL, -- 'A', 'B', 'C', or 'D'
    FOREIGN KEY (test_id) REFERENCES mcq_tests(id) ON DELETE CASCADE
);

-- MCQ Attempts/Results
CREATE TABLE IF NOT EXISTS mcq_attempts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    test_id INT,
    score INT DEFAULT 0,
    total_questions INT DEFAULT 0,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (test_id) REFERENCES mcq_tests(id) ON DELETE CASCADE
);

-- Insert Sample Users (password = "123456" for all)
-- Use these to login after running the app
INSERT INTO users (name, email, password, role, points, streak) VALUES 
('Admin Teacher', 'teacher@test.com', '$2a$10$YourHashWillBeGenerated', 'teacher', 100, 5),
('John Student', 'student@test.com', '$2a$10$YourHashWillBeGenerated', 'student', 50, 3);

-- Note: First run the app and register users normally, or use bcrypt to generate hashes