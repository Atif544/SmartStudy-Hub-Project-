# 🗄️ MYSQL CONNECTION SETUP FOR RAILWAY

## Problem: Can't Connect to MySQL

If your frontend is working but MySQL connection fails, follow these exact steps:

---

## ✅ STEP 1: Verify MySQL Service is Running on Railway

1. Go to your Railway project dashboard
2. In the left sidebar, look for **"MySQL"** service
3. Check the status:
   - 🟢 **Green circle** = Running ✅
   - 🔴 **Red circle** = Not running ❌
   - ⚫ **Grey circle** = Error ⚠️

**If it's red or grey:**
- Click on MySQL service
- Click "**Restart**" button
- Wait 30 seconds for it to start

---

## ✅ STEP 2: Get MySQL Credentials from Railway

1. Click on your **MySQL** service in left sidebar
2. Look for **"Variables"** or **"Details"** tab
3. You should see these variables (copy them exactly):

```
MYSQLHOST     → Something like: xxxx-production.up.railway.app
MYSQLUSER     → Usually: root
MYSQLPASSWORD → A long random string
MYSQL_URL     → Full connection string
```

**If you don't see these variables:**
- Railway may not have finished deploying MySQL
- Wait 5 minutes and refresh
- If still missing, click "**Deploy**" again

---

## ✅ STEP 3: Add Variables to Your Node.js App

1. Click on your **Node.js** service (not MySQL)
2. Click **"Variables"** tab
3. Add/Update these variables (MUST MATCH exactly):

```
DB_HOST       → MYSQLHOST value from Step 2
DB_USER       → MYSQLUSER value from Step 2
DB_PASSWORD   → MYSQLPASSWORD value from Step 2
DB_NAME       → classroom_system
SESSION_SECRET → smartstudy_session_secret_key_2024
NODE_ENV      → production
```

**For each variable:**
- Click "Add Variable"
- Type the name
- Type the value
- Press Enter to save
- ✅ Check mark should appear

---

## ✅ STEP 4: Link MySQL to Node.js App

This is important! Your Node.js app needs to know about the MySQL service.

1. In your Railway project
2. Click on **Node.js** service
3. Look for a **"Settings"** or **"Connected Services"** section
4. You should see **MySQL** is connected
5. If not, click to add/link MySQL service

---

## ✅ STEP 5: Initialize Database

The database tables need to be created. Choose ONE method:

### Method A: Using Railway MySQL UI (Easiest)

1. Click on **MySQL** service
2. Click **"Data"** or **"Query"** tab
3. You'll see a query editor
4. Copy entire contents of `database.sql` from your repo
5. Paste into the query editor
6. Click **"Execute"** or **"Run"**
7. Wait for success message ✅

### Method B: Using the Auto-Init Script

In your Railway Node.js service **Variables** add:
```
AUTO_INIT_DB → true
```

This will automatically initialize the database on next deployment.

### Method C: Manual Initialization (If deployed locally)

```bash
npm run init-db
```

---

## 🔍 STEP 6: Verify Connection

After completing steps 1-5, test the connection:

1. Go to your app URL
2. Add `/health` to the end
   ```
   https://your-app-url/health
   ```
3. You should see:
   ```json
   {
     "status": "ok",
     "message": "Database connection successful",
     "dbHost": "...",
     "dbName": "classroom_system",
     "timestamp": "..."
   }
   ```

If you see an error instead:
- Go back to Step 2 and verify credentials
- Go back to Step 3 and check variables are correct
- Wait 2 minutes and try again

---

## 🆘 COMMON ERRORS & FIXES

### Error: "ECONNREFUSED"
**Means:** Can't reach the MySQL server
- [ ] Check MySQL service is running (green circle)
- [ ] Check DB_HOST is correct (not localhost)
- [ ] Check you have DB_USER set

### Error: "ER_ACCESS_DENIED_ERROR"
**Means:** Wrong username or password
- [ ] Copy DB_PASSWORD exactly from Railway MySQL
- [ ] Copy DB_USER exactly (usually "root")
- [ ] Check for extra spaces

### Error: "ER_BAD_DB_ERROR"
**Means:** Database doesn't exist
- [ ] Check DB_NAME is exactly: `classroom_system`
- [ ] Initialize database using Step 5

### Error: "Cannot read property 'length'"
**Means:** Query ran but no result
- [ ] Database exists but tables not created
- [ ] Run database initialization (Step 5)

### 502 Bad Gateway / Page Won't Load
**Means:** App crashed, likely database issue
- [ ] Check app logs in Railway dashboard
- [ ] Follow error message in logs
- [ ] Verify MySQL service is running

---

## 📋 QUICK CHECKLIST

- [ ] MySQL service visible in Railway (green status)
- [ ] Got MYSQLHOST, MYSQLUSER, MYSQLPASSWORD values
- [ ] DB_HOST variable set in Node.js app
- [ ] DB_USER variable set in Node.js app
- [ ] DB_PASSWORD variable set in Node.js app
- [ ] DB_NAME = classroom_system
- [ ] MySQL service linked to Node.js app
- [ ] Database initialized with SQL schema
- [ ] Test /health endpoint returns "ok"
- [ ] Can access login page
- [ ] Can register new user (should work if DB connected)

---

## 💡 PRO TIP: Using MYSQL_URL

Railway creates a `MYSQL_URL` variable that contains everything:
```
mysql://user:password@host:port/database
```

If you want to use this instead (for advanced users), you'd need to parse it. For now, stick with individual variables.

---

## 🎯 WHAT'S NEXT

Once /health returns "ok":
1. Go to your app homepage
2. Click "Sign Up"
3. Create a test account
4. Try uploading a file
5. Everything should work! ✅

---

## 📞 STILL HAVING ISSUES?

1. **Check app logs**: Railway dashboard → Logs tab
2. **Verify each variable** one more time (copy-paste from Railway)
3. **Wait 2-3 minutes** and refresh (sometimes takes time)
4. **Delete and re-create variables** if they seem wrong
5. **Restart Node.js service** and wait for green status

---

**Once you complete these steps, your MySQL connection will be perfect!** ✨
