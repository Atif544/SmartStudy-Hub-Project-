#!/usr/bin/env node

/**
 * Manual Database Initialization Script
 * Run this to set up your database manually
 * 
 * Usage:
 *   npm run init-db
 *   or
 *   node init-db.js
 */

require('dotenv').config();

const { testConnection, initializeDatabase } = require('./db-init');

async function main() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SmartStudy Hub - Database Initialization Tool            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('');
    
    try {
        // Test connection first
        console.log('Step 1: Testing database connection...');
        console.log('─'.repeat(50));
        await testConnection();
        console.log('');
        
        // Initialize database
        console.log('Step 2: Initializing database schema...');
        console.log('─'.repeat(50));
        await initializeDatabase();
        console.log('');
        
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║   ✅ DATABASE INITIALIZATION SUCCESSFUL!                   ║');
        console.log('║   Your SmartStudy Hub is ready to use!                    ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        process.exit(0);
    } catch (error) {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════╗');
        console.log('║   ❌ DATABASE INITIALIZATION FAILED                        ║');
        console.log('╚════════════════════════════════════════════════════════════╝');
        console.log('');
        console.error('Error details:', error.message);
        console.log('');
        console.log('Troubleshooting:');
        console.log('1. Verify your environment variables in .env or Railway dashboard');
        console.log('2. Ensure MySQL is running and accessible');
        console.log('3. Check that your credentials are correct');
        console.log('4. If on Railway, verify MySQL service is deployed and running');
        console.log('');
        process.exit(1);
    }
}

main();
