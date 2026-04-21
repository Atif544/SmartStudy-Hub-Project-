const express = require('express');
require('dotenv').config();
const mysql = require('mysql2');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret123',
    resave: false,
    saveUninitialized: true
}));

app.set('view engine', 'ejs');
app.set('views', './views');

// Database Connection Pool (Production-Grade)
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classroom_system',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelayMs: 0,
    connectionTimeout: 10000,
    enableMultipleStatements: false,
    decimalNumbers: true
});

// Test database connection
db.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('❌ DATABASE CONNECTION WAS CLOSED');
        }
        if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
            console.error('❌ FATAL ERROR - DATABASE CONNECTION WAS DESTROYED');
        }
        if (err.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
            console.error('❌ CANNOT CONNECT - CONNECTION DESTROYED');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ ECONNREFUSED - MySQL not running or wrong credentials');
            console.error('   Check: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
            console.error('   Current values: HOST=' + process.env.DB_HOST + ', USER=' + process.env.DB_USER + ', DB=' + process.env.DB_NAME);
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('❌ ACCESS DENIED - Wrong username or password');
        }
        if (err.code === 'ER_BAD_DB_ERROR') {
            console.error('❌ BAD_DB_ERROR - Database does not exist: ' + process.env.DB_NAME);
        }
        console.error('Database connection error:', err);
        return;
    }
    if (connection) connection.release();
    console.log('✅ MySQL Connected Successfully');
    console.log('   Host:', process.env.DB_HOST);
    console.log('   Database:', process.env.DB_NAME);
    console.log('   Ready for queries!');
});

// Handle connection errors
db.on('error', (err) => {
    console.error('❌ Unexpected error on db:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        // Connection was closed
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
        // Fatal error occurred, should take connection from pool and close it
    }
    if (err.code === 'PROTOCOL_ENQUEUE_AFTER_DESTROY') {
        // Connection was destroyed, cannot use anymore.
    }
});

// File Upload Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Make user data available to all views
app.use((req, res, next) => {
    if (req.session.userId) {
        db.query("SELECT name, points, streak, role FROM users WHERE id = ?", [req.session.userId], (err, user) => {
            if (user && user.length > 0) {
                res.locals.user = user[0];
                res.locals.isLoggedIn = true;
            } else {
                res.locals.isLoggedIn = false;
            }
            next();
        });
    } else {
        res.locals.isLoggedIn = false;
        next();
    }
});

// ============ ROUTES ============

// HEALTH CHECK & DATABASE DIAGNOSTIC
app.get('/health', (req, res) => {
    db.query("SELECT 1", (err, result) => {
        if (err) {
            console.error('❌ Health check failed:', err);
            return res.status(500).json({ 
                status: 'error', 
                message: 'Database connection failed',
                error: err.message,
                dbHost: process.env.DB_HOST,
                dbUser: process.env.DB_USER,
                dbName: process.env.DB_NAME
            });
        }
        res.status(200).json({ 
            status: 'ok', 
            message: 'Database connection successful',
            dbHost: process.env.DB_HOST,
            dbName: process.env.DB_NAME,
            timestamp: new Date()
        });
    });
});

// HOME
app.get('/', (req, res) => res.render('home'));

// REGISTER
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;
    
    // Check if user exists
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
        if (result.length > 0) {
            return res.render('register', { error: 'Email already registered!' });
        }
        
        const hash = await bcrypt.hash(password, 10);
        db.query("INSERT INTO users (name, email, password, role, last_activity) VALUES (?, ?, ?, ?, CURDATE())",
            [name, email, hash, role || 'student'],
            (err) => {
                if (err) return res.render('register', { error: 'Registration failed!' });
                res.redirect('/login');
            }
        );
    });
});

// LOGIN
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
        if (err || result.length === 0) {
            return res.render('login', { error: 'User not found!' });
        }

        const user = result[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render('login', { error: 'Wrong password!' });
        }

        req.session.userId = user.id;
        req.session.role = user.role;

        // 🔥 STUDY STREAK LOGIC
        const formatLocal = (d) => {
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        };

        const today = formatLocal(new Date());

        if (user.last_activity) {
            const lastActive = formatLocal(new Date(user.last_activity));
            const yesterdayDate = new Date();
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterdayStr = formatLocal(yesterdayDate);
            
            if (lastActive === yesterdayStr) {
                db.query("UPDATE users SET streak = streak + 1, last_activity = ? WHERE id = ?", [today, user.id]);
            } else if (lastActive !== today) {
                db.query("UPDATE users SET streak = 1, last_activity = ? WHERE id = ?", [today, user.id]);
            }
        } else {
            db.query("UPDATE users SET streak = 1, last_activity = ? WHERE id = ?", [today, user.id]);
        }

        res.redirect('/dashboard');
    });
});

// DASHBOARD (with Smart Recommendations & Notifications)
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    // Get leaderboard (top 5)
    db.query("SELECT name, points, streak FROM users ORDER BY points DESC LIMIT 5", (err, leaders) => {
        // Get top materials
        db.query("SELECT * FROM materials ORDER BY downloads DESC LIMIT 5", (err, top) => {
            
            // SMART RECOMMENDATIONS based on user's download history
            db.query(`SELECT subject FROM downloads WHERE user_id = ? 
                      GROUP BY subject ORDER BY COUNT(*) DESC LIMIT 1`,
                [req.session.userId],
                (err, sub) => {
                    let subject = sub && sub.length ? sub[0].subject : null;
                    
                    const sendRender = (recommend) => {
                        db.query("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 10", [req.session.userId], (err, notifications) => {
                            db.query("UPDATE notifications SET is_read = TRUE WHERE user_id = ?", [req.session.userId]);
                            res.render('dashboard', { leaders, top, recommend, notifications: notifications || [] });
                        });
                    };

                    if (subject) {
                        db.query("SELECT * FROM materials WHERE subject = ? AND verified = 1 LIMIT 5", [subject], (err, recommend) => {
                            sendRender(recommend);
                        });
                    } else {
                        db.query("SELECT * FROM materials ORDER BY downloads DESC LIMIT 5", (err, recommend) => {
                            sendRender(recommend);
                        });
                    }
                }
            );
        });
    });
});

// PROFILE with Contribution Insights
app.get('/profile', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.query("SELECT * FROM users WHERE id = ?", [req.session.userId], (err, user) => {
        if (err || !user.length) return res.redirect('/dashboard');
        
        db.query("SELECT COUNT(*) as exact_uploads, SUM(downloads) as exact_downloads, SUM(likes) as exact_likes FROM materials WHERE uploaded_by = ?", [req.session.userId], (err, stats) => {
            const statsData = stats && stats.length > 0 ? stats[0] : {};
            
            db.query("SELECT COUNT(*) + 1 AS rank FROM users WHERE points > ?", [user[0].points], (err, rankRow) => {
                const rank = rankRow && rankRow.length > 0 ? rankRow[0].rank : 1;
                
                res.render('profile', { 
                    user: user[0], 
                    insights: {
                        uploads: statsData.exact_uploads || 0,
                        downloads: statsData.exact_downloads || 0,
                        likes: statsData.exact_likes || 0,
                        rank: rank
                    }
                });
            });
        });
    });
});

// LEADERBOARD
app.get('/leaderboard', (req, res) => {
    db.query("SELECT name, points, streak FROM users ORDER BY points DESC", (err, data) => {
        res.render('leaderboard', { data });
    });
});

// UPLOAD RESOURCE
app.get('/upload', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    res.render('upload', { query: req.query || {} });
});

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const { title, subject, semester, request_id } = req.body;
    
    db.query(`INSERT INTO materials (title, subject, semester, filename, uploaded_by) 
              VALUES (?, ?, ?, ?, ?)`,
        [title, subject, semester, req.file.filename, req.session.userId],
        (err) => {
            if (err) console.error(err);
            // Add 10 points for uploading
            db.query("UPDATE users SET points = points + 10 WHERE id = ?", [req.session.userId]);
            
            if (request_id) {
                db.query("SELECT student_id, title FROM requests WHERE id = ?", [request_id], (err, reqRow) => {
                    db.query("UPDATE requests SET status = 'fulfilled' WHERE id = ?", [request_id], () => {
                        if (reqRow && reqRow.length > 0) {
                            const msg = `✅ Your request "${reqRow[0].title}" was successfully fulfilled! Check Browse page.`;
                            db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [reqRow[0].student_id, msg]);
                        }
                        res.redirect('/browse');
                    });
                });
            } else {
                res.redirect('/browse');
            }
        }
    );
});

// BROWSE RESOURCES
app.get('/browse', (req, res) => {
    const { search, semester, subject } = req.query;
    let query = "SELECT m.*, COUNT(mt.id) as mcq_count FROM materials m LEFT JOIN mcq_tests mt ON m.id = mt.material_id WHERE 1=1";
    let params = [];

    if (search) {
        query += " AND (LOWER(m.title) LIKE LOWER(?) OR LOWER(m.subject) LIKE LOWER(?))";
        params.push(`%${search}%`, `%${search}%`);
    }
    if (semester) {
        query += " AND m.semester = ?";
        params.push(semester);
    }
    if (subject) {
        query += " AND LOWER(m.subject) LIKE LOWER(?)";
        params.push(`%${subject}%`);
    }

    query += " GROUP BY m.id ORDER BY m.verified DESC, m.downloads DESC";

    db.query(query, params, (err, data) => {
        res.render('browse', { data, role: req.session.role, search, semester, subject });
    });
});

// DUPLICATE CHECK API
app.get('/api/check-duplicate', (req, res) => {
    const { title, subject } = req.query;
    if (!title || !subject) return res.json({ exists: false });

    // case-insensitive fuzzy match check
    db.query("SELECT id FROM materials WHERE LOWER(title) LIKE ? OR LOWER(subject) = ?", 
        [`%${title.toLowerCase()}%`, subject.toLowerCase()], 
        (err, results) => {
            res.json({ exists: results && results.length > 0 });
        }
    );
});

// DOWNLOAD RESOURCE
app.get('/download/:id', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const id = req.params.id;
    
    db.query("SELECT * FROM materials WHERE id = ?", [id], (err, result) => {
        if (err || !result.length) return res.redirect('/browse');
        
        const file = path.join(__dirname, 'uploads', result[0].filename);
        
        // Update download count
        db.query("UPDATE materials SET downloads = downloads + 1 WHERE id = ?", [id]);
        
        // Record download history (for recommendations)
        db.query("INSERT INTO downloads (user_id, material_id, subject) VALUES (?, ?, ?)",
            [req.session.userId, id, result[0].subject]);
        
        // Add 2 points for downloading
        db.query("UPDATE users SET points = points + 2 WHERE id = ?", [req.session.userId]);
        
        res.download(file);
    });
});

// VERIFY RESOURCE (Teacher only)
app.get('/verify/:id', (req, res) => {
    if (req.session.role !== 'teacher') return res.send("Only teachers can verify resources!");
    
    db.query("UPDATE materials SET verified = 1 WHERE id = ?", [req.params.id], () => {
        // Award points to the uploader
        db.query("SELECT title, uploaded_by FROM materials WHERE id = ?", [req.params.id], (err, row) => {
            if (row && row.length > 0 && row[0].uploaded_by) {
                db.query("UPDATE users SET points = points + 20 WHERE id = ?", [row[0].uploaded_by]);
                
                const msg = `🎉 Your document "${row[0].title}" has been verified by a teacher! You earned +20 points.`;
                db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [row[0].uploaded_by, msg]);
            }
            res.redirect('/browse');
        });
    });
});

// LIKE RESOURCE
app.post('/like/:id', (req, res) => {
    if (!req.session.userId) return res.json({ success: false, message: 'Please login first' });
    
    const materialId = req.params.id;
    const userId = req.session.userId;
    
    // Check if already liked
    db.query("SELECT * FROM document_likes WHERE user_id = ? AND material_id = ?", [userId, materialId], (err, hits) => {
        if (hits && hits.length > 0) return res.json({ success: false, message: 'You have already liked this document!' });
        
        // Add to likes table
        db.query("INSERT INTO document_likes (user_id, material_id) VALUES (?, ?)", [userId, materialId], (err) => {
            if (err) return res.json({ success: false, message: 'Server error' });
            
            // Increment material likes
            db.query("UPDATE materials SET likes = COALESCE(likes, 0) + 1 WHERE id = ?", [materialId], () => {
                // Award points to uploader
                db.query("SELECT title, uploaded_by, likes FROM materials WHERE id = ?", [materialId], (err, row) => {
                    if (row && row.length > 0 && row[0].uploaded_by) {
                        db.query("UPDATE users SET points = points + 5 WHERE id = ?", [row[0].uploaded_by]);
                        
                        // Add notification
                        const msg = `👍 Someone liked your document "${row[0].title}"! You earned +5 points.`;
                        db.query("INSERT INTO notifications (user_id, message) VALUES (?, ?)", [row[0].uploaded_by, msg]);
                    }
                    res.json({ success: true, newLikes: (row && row.length > 0) ? row[0].likes : 0 });
                });
            });
        });
    });
});

// RESOURCE REQUESTS
app.get('/requests', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    db.query(`SELECT r.*, u.name as student_name 
              FROM requests r 
              JOIN users u ON r.student_id = u.id 
              WHERE r.status = 'pending'
              ORDER BY r.created_at DESC`, 
        (err, data) => {
            if (err || !data || data.length === 0) {
                return res.render('requests', { data: [] });
            }
            
            // AI Matches logic
            let processed = 0;
            data.forEach(r => {
                db.query(`SELECT id, title, subject FROM materials WHERE LOWER(subject) LIKE ? LIMIT 3`, [`%${r.subject.toLowerCase()}%`], (err, matches) => {
                    r.suggestions = matches || [];
                    processed++;
                    if (processed === data.length) {
                        res.render('requests', { data });
                    }
                });
            });
        }
    );
});

app.post('/requests', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const { title, subject, semester } = req.body;
    db.query("INSERT INTO requests (student_id, title, subject, semester) VALUES (?, ?, ?, ?)",
        [req.session.userId, title, subject, semester],
        () => {
            res.redirect('/requests');
        }
    );
});

// LOGOUT
app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// VIEW MCQS FOR MATERIAL
app.get('/material-mcqs/:materialId', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const materialId = req.params.materialId;
    db.query("SELECT * FROM materials WHERE id = ?", [materialId], (err, material) => {
        if (err || !material.length) return res.redirect('/browse');
        
        db.query("SELECT mt.*, COUNT(mq.id) as question_count FROM mcq_tests mt LEFT JOIN mcq_questions mq ON mt.id = mq.test_id WHERE mt.material_id = ? GROUP BY mt.id", [materialId], (err, mcqs) => {
            res.render('material-mcqs', { material: material[0], mcqs, role: req.session.role });
        });
    });
});

// CREATE MCQ (Teacher only)
app.get('/create-mcq/:materialId', (req, res) => {
    if (!req.session.userId || req.session.role !== 'teacher') return res.redirect('/browse');
    
    const materialId = req.params.materialId;
    db.query("SELECT * FROM materials WHERE id = ?", [materialId], (err, material) => {
        if (err || !material.length) return res.redirect('/browse');
        
        res.render('create-mcq', { material: material[0] });
    });
});

// SUBMIT MCQ CREATION
app.post('/create-mcq/:materialId', (req, res) => {
    if (!req.session.userId || req.session.role !== 'teacher') return res.redirect('/browse');
    
    const materialId = req.params.materialId;
    const { title, description, questions } = req.body;
    
    // Insert the test
    db.query("INSERT INTO mcq_tests (material_id, title, description, created_by) VALUES (?, ?, ?, ?)",
        [materialId, title, description, req.session.userId],
        (err, result) => {
            if (err) return res.send("Error creating test");
            
            const testId = result.insertId;
            
            // Insert questions
            const questionPromises = questions.map(q => {
                return new Promise((resolve, reject) => {
                    db.query("INSERT INTO mcq_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        [testId, q.question, q.optionA, q.optionB, q.optionC, q.optionD, q.correct],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            });
            
            Promise.all(questionPromises).then(() => {
                res.redirect('/browse');
            }).catch(() => {
                res.send("Error adding questions");
            });
        }
    );
});

// TAKE MCQ TEST
app.get('/take-mcq/:testId', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const testId = req.params.testId;
    db.query("SELECT mt.*, m.title as material_title FROM mcq_tests mt JOIN materials m ON mt.material_id = m.id WHERE mt.id = ?", [testId], (err, test) => {
        if (err || !test.length) return res.redirect('/browse');
        
        db.query("SELECT * FROM mcq_questions WHERE test_id = ?", [testId], (err, questions) => {
            res.render('take-mcq', { test: test[0], questions });
        });
    });
});

// SUBMIT MCQ TEST
app.post('/submit-mcq/:testId', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const testId = req.params.testId;
    const answers = req.body;
    
    db.query("SELECT * FROM mcq_questions WHERE test_id = ?", [testId], (err, questions) => {
        let score = 0;
        questions.forEach(q => {
            if (answers[`q${q.id}`] === q.correct_answer) {
                score++;
            }
        });
        
        // Record attempt
        db.query("INSERT INTO mcq_attempts (user_id, test_id, score, total_questions) VALUES (?, ?, ?, ?)",
            [req.session.userId, testId, score, questions.length],
            () => {
                // Award points based on score
                const pointsEarned = score * 5; // 5 points per correct answer
                db.query("UPDATE users SET points = points + ? WHERE id = ?", [pointsEarned, req.session.userId]);
                
                res.render('mcq-results', { score, total: questions.length, pointsEarned });
            }
        );
    });
});

// Start Server
const PORT = process.env.PORT || 3000;

// Auto-initialize database if AUTO_INIT_DB is enabled (useful for Railway)
const AUTO_INIT_DB = process.env.AUTO_INIT_DB === 'true';

if (AUTO_INIT_DB) {
    console.log('🔄 AUTO_INIT_DB enabled - will initialize database on startup');
    const fs = require('fs');
    const pathModule = require('path');
    
    const schemaPath = pathModule.join(__dirname, 'database.sql');
    if (fs.existsSync(schemaPath)) {
        setTimeout(() => {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            console.log(`📋 Initializing ${statements.length} database statements...`);
            
            statements.forEach((statement, index) => {
                db.query(statement, (err, result) => {
                    if (!err) {
                        console.log(`✅ DB Statement ${index + 1}/${statements.length} complete`);
                    } else if (err.code === 'ER_TABLE_EXISTS_ERROR' || err.code === 'ER_DUP_KEYNAME') {
                        console.log(`⏭️  DB Statement ${index + 1}/${statements.length} - already exists (OK)`);
                    } else {
                        console.warn(`⚠️  DB Statement ${index + 1}: ${err.message}`);
                    }
                });
            });
        }, 2000); // Wait 2 seconds for pool to be ready
    }
}

app.listen(PORT, () => {
    console.log('╔═════════════════════════════════════════╗');
    console.log('║   🚀 SmartStudy Hub Running              ║');
    console.log('║   Port: ' + PORT);
    console.log('║   Host: ' + (process.env.DB_HOST || 'localhost'));
    console.log('║   Database: ' + (process.env.DB_NAME || 'classroom_system'));
    console.log('║   Test: http://localhost:' + PORT + '/health');
    console.log('╚═════════════════════════════════════════╝');
});