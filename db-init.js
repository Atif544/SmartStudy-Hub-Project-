const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

/**
 * Database Initialization Utility
 * Automatically sets up database schema on first deployment
 */

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'Atif',
    password: process.env.DB_PASSWORD || 'arptita',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Initializing database...');
        console.log('   Host:', process.env.DB_HOST);
        console.log('   User:', process.env.DB_USER);
        
        // First, create the database if it doesn't exist
        const createDbSql = `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'classroom_system'};`;
        
        db.query(createDbSql, (err, result) => {
            if (err) {
                console.error('❌ Failed to create database:', err.message);
                reject(err);
                return;
            }
            
            console.log('✅ Database created/verified');
            
            // Now read and execute the schema
            const schemaPath = path.join(__dirname, 'database.sql');
            
            if (!fs.existsSync(schemaPath)) {
                console.warn('⚠️  database.sql not found at', schemaPath);
                resolve(true);
                return;
            }
            
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // Split by ; to get individual statements
            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);
            
            console.log(`📋 Found ${statements.length} SQL statements to execute`);
            
            let completed = 0;
            
            statements.forEach((statement, index) => {
                db.query(statement, (err, result) => {
                    if (err) {
                        // Some errors are expected (like duplicate key indexes), so log as warning
                        console.warn(`⚠️  Statement ${index + 1}:`, err.message);
                    } else {
                        completed++;
                        console.log(`✅ Statement ${index + 1}/${statements.length} executed`);
                    }
                    
                    if (index === statements.length - 1) {
                        console.log(`\n✅ Database initialization complete! ${completed}/${statements.length} statements executed`);
                        resolve(true);
                    }
                });
            });
        });
    });
}

/**
 * Test database connection
 */
async function testConnection() {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Cannot connect to database:');
                console.error('   Error:', err.message);
                console.error('   Check your environment variables:');
                console.error('   - DB_HOST=' + process.env.DB_HOST);
                console.error('   - DB_USER=' + process.env.DB_USER);
                console.error('   - DB_PASSWORD=[' + (process.env.DB_PASSWORD ? 'SET' : 'NOT SET') + ']');
                console.error('   - DB_NAME=' + process.env.DB_NAME);
                reject(err);
                return;
            }
            
            connection.ping((err) => {
                connection.release();
                if (err) {
                    console.error('❌ Ping failed:', err.message);
                    reject(err);
                    return;
                }
                console.log('✅ Database connection successful!');
                resolve(true);
            });
        });
    });
}

module.exports = {
    initializeDatabase,
    testConnection
};
