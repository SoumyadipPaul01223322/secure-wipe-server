const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
// Railway provides the PORT variable automatically.
const port = process.env.PORT || 3001; 

// This is the crucial line for security. We will set CLIENT_URL in Railway.
// It defaults to localhost for local testing.
const clientURL = process.env.CLIENT_URL || 'http://localhost:3000';

// --- Middleware ---
app.use(cors({ origin: clientURL }));
app.use(express.json());

// --- PostgreSQL Database Connection ---
// Railway automatically provides the DATABASE_URL environment variable.
// This code will work both locally (if you set the variable) and on Railway.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // This is required for connecting to Railway's database
  ssl: {
    rejectUnauthorized: false
  }
});

// --- API Endpoints ---
app.get('/api', (req, res) => {
    res.json({ message: "SecureWipe API (Postgres) is running!" });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username && password) {
        res.json({ success: true, user: { id: 'user-123', name: 'Demo User' }});
    } else {
        res.status(400).json({ success: false, message: 'Username and password required.' });
    }
});

app.get('/api/certificates/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query('SELECT * FROM certificates WHERE user_id = $1 ORDER BY wipe_date DESC', [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/certificates', async (req, res) => {
    const { userId, encryptedData } = req.body;
    if (!userId || !encryptedData) {
        return res.status(400).json({ error: 'userId and encryptedData are required.' });
    }
    try {
        const decryptedDetails = {
            deviceName: 'Scanned Production Device',
            serialNumber: `SN-RAILWAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            wipeMethod: 'NIST SP 800-88 Purge',
            status: 'Completed',
        };
        const query = 'INSERT INTO certificates (user_id, device_name, serial_number, wipe_method, status, wipe_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
        const values = [userId, decryptedDetails.deviceName, decryptedDetails.serialNumber, decryptedDetails.wipeMethod, decryptedDetails.status, new Date()];
        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Failed to add certificate:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

