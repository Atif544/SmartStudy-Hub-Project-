const mysql = require('mysql2');
const fs = require('fs');
const path = require('path');

/**
 * Database Initialization Utility
 * Production-ready version for Render + Aiven
 */

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

/**
 * Initialize Database (creates tables from schema)
 */
async function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('🔄 Initializing database...');
        console.log('   Host:', process.env.DB_HOST);
        console.log('   User:', process.env.DB_USER);
        console.log('   DB:', process.env.DB_NAME);

        // Create database safely
        const createDbSql = `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`;

        db.query(createDbSql, (err) => {
            if (err) {
                console.error('❌ Failed to create database:', err.message);
                reject(err);
                return;
            }

            console.log('✅ Database created/verified');

            const schemaPath = path.join(__dirname, 'database.sql');

            if (!fs.existsSync(schemaPath)) {
                console.warn('⚠️ database.sql not found, skipping schema setup');
                resolve(true);
                return;
            }

            const schema = fs.readFileSync(schemaPath, 'utf8');

            const statements = schema
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0);

            console.log(`📋 Executing ${statements.length} SQL statements...`);

            let completed = 0;

            statements.forEach((statement, index) => {
                db.query(statement, (err) => {
                    if (err) {
                        console.warn(`⚠️ Statement ${index + 1}: ${err.message}`);
                    } else {
                        console.log(`✅ Statement ${index + 1} done`);
                        completed++;
                    }

                    if (index === statements.length - 1) {
                        console.log(`\n✅ DB Init complete: ${completed}/${statements.length}`);
                        resolve(true);
                    }
                });
            });
        });
    });
}

/**
 * Test DB connection
 */
async function testConnection() {
    return new Promise((resolve, reject) => {
        db.getConnection((err, connection) => {
            if (err) {
                console.error('❌ Database connection failed');
                console.error('Message:', err.message);
                console.error('DB_HOST:', process.env.DB_HOST);
                console.error('DB_USER:', process.env.DB_USER);
                console.error('DB_NAME:', process.env.DB_NAME);
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

                console.log('✅ Database connected successfully!');
                resolve(true);
            });
        });
    });
}

module.exports = {
    initializeDatabase,
    testConnection
};