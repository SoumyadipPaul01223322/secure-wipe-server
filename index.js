const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;
const host = '0.0.0.0'; // Listen on all available network interfaces

// --- Middleware ---
// The URL of your live React app will go here
const clientURL = process.env.CLIENT_URL || 'https://secure-wipe-client.onrender.com';
app.use(cors({ origin: clientURL }));

// Parse incoming JSON requests
app.use(express.json());

// --- MySQL Database Connection ---
// Use environment variables for security and flexibility
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
};

let db;

async function connectToDatabase() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Successfully connected to the MySQL database.');
    } catch (error) {
        console.error('Error connecting to the database:', error);
        // Exit the process if the database connection fails
        process.exit(1);
    }
}


// --- API Endpoints ---

// Health Check Endpoint
app.get('/api', (req, res) => {
    res.json({ message: "SecureWipe API is running!" });
});


// Mock User Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    // In a real application, you would validate credentials against the database.
    if (username && password) {
        res.json({
            success: true,
            user: {
                id: 'user-123', // This ID would come from your users table in the DB
                name: 'Demo User'
            }
        });
    } else {
        res.status(400).json({ success: false, message: 'Username and password required.' });
    }
});

// Get all certificates for a specific user
app.get('/api/certificates/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [rows] = await db.execute('SELECT * FROM certificates WHERE user_id = ? ORDER BY wipe_date DESC', [userId]);
        res.json(rows);
    } catch (error) {
        console.error('Failed to fetch certificates:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Add a new certificate from a QR code scan
app.post('/api/certificates', async (req, res) => {
    const { userId, encryptedData } = req.body;

    if (!userId || !encryptedData) {
        return res.status(400).json({ error: 'userId and encryptedData are required.' });
    }

    try {
        // --- DECRYPTION LOGIC GOES HERE ---
        // This is where you will decrypt the 'encryptedData'.
        // For now, we'll use a mock decrypted object.
        console.log(`Received encrypted data for user ${userId}:`, encryptedData);
        
        // **REPLACE THIS MOCK OBJECT WITH YOUR ACTUAL DECRYPTION RESULT**
        const decryptedDetails = {
            deviceName: 'Decrypted Device from QR',
            serialNumber: `SN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
            wipeMethod: 'NIST SP 800-88 Purge',
            status: 'Completed',
        };
        // --- END OF DECRYPTION LOGIC ---

        const newCert = {
            user_id: userId,
            device_name: decryptedDetails.deviceName,
            serial_number: decryptedDetails.serialNumber,
            wipe_method: decryptedDetails.wipeMethod,
            status: decryptedDetails.status,
            wipe_date: new Date()
        };

        const [result] = await db.execute(
            'INSERT INTO certificates (user_id, device_name, serial_number, wipe_method, status, wipe_date) VALUES (?, ?, ?, ?, ?, ?)',
            [newCert.user_id, newCert.device_name, newCert.serial_number, newCert.wipe_method, newCert.status, newCert.wipe_date]
        );
        
        const insertedId = result.insertId;
        const [newRow] = await db.execute('SELECT * FROM certificates WHERE id = ?', [insertedId]);

        res.status(201).json(newRow[0]);

    } catch (error) {
        console.error('Failed to add certificate:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// --- Start Server ---
connectToDatabase().then(() => {
    app.listen(port, host, () => {
        console.log(`Server running on http://${host}:${port}`);
    });
});


