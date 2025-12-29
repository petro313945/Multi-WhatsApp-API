const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();
// Middleware to parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Debug middleware to log incoming requests
app.use((req, res, next) => {
    if (req.method === 'POST' && req.path === '/api/send-message') {
        console.log('📥 Received request:', {
            method: req.method,
            path: req.path,
            headers: req.headers['content-type'],
            body: req.body
        });
    }
    next();
});

const PORT = process.env.PORT || 3000;

// Store received messages
const receivedMessages = [];

// Initialize WhatsApp client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// WhatsApp client events
client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
});

client.on('qr', qr => {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    QR CODE FOR WHATSAPP                    ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('\n📱 Scan this QR code with your WhatsApp mobile app:');
    console.log('   Go to WhatsApp > Settings > Linked Devices > Link a Device\n');
    qrcode.generate(qr, {small: true});
    console.log('\n⏳ QR code will refresh every 30 seconds until scanned.\n');
});

client.on('authenticated', () => {
    console.log('✅ Client authenticated!');
});

client.on('auth_failure', msg => {
    console.error('❌ Authentication failure:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ Client disconnected:', reason);
});

client.on('loading_screen', (percent, message) => {
    console.log('Loading:', percent, message);
});

// Listen for incoming messages
client.on('message', async (message) => {
    try {
        let contactName = 'Unknown';
        let chatName = 'Unknown';
        
        // Try to get contact info, but handle errors gracefully
        try {
            const contact = await message.getContact();
            contactName = contact.pushname || contact.name || contact.number || 'Unknown';
        } catch (contactError) {
            console.warn('⚠️ Could not get contact info:', contactError.message);
            // Use the number from the message as fallback
            contactName = message.from.split('@')[0] || 'Unknown';
        }
        
        // Try to get chat info, but handle errors gracefully
        try {
            const chat = await message.getChat();
            chatName = chat.name || 'Unknown';
        } catch (chatError) {
            console.warn('⚠️ Could not get chat info:', chatError.message);
        }
        
        const messageData = {
            id: message.id._serialized,
            from: message.from,
            to: message.to,
            body: message.body,
            timestamp: message.timestamp,
            contactName: contactName,
            isGroup: message.from.includes('@g.us'),
            chatName: chatName,
            date: new Date().toISOString()
        };
        
        receivedMessages.push(messageData);
        console.log('📨 New message received:', messageData);
        
        // Keep only last 100 messages to avoid memory issues
        if (receivedMessages.length > 100) {
            receivedMessages.shift();
        }
    } catch (error) {
        console.error('❌ Error processing message:', error);
        // Still log basic message info even if contact/chat retrieval fails
        console.log('📨 Message (basic info):', {
            from: message.from,
            body: message.body,
            timestamp: message.timestamp
        });
    }
});

client.on('error', (error) => {
    console.error('❌ Client error:', error);
});

// ========== REST API ENDPOINTS ==========

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        message: 'WhatsApp API is running',
        endpoints: {
            getContacts: 'GET /api/contacts',
            sendMessage: 'POST /api/send-message',
            getMessages: 'GET /api/messages',
            getQR: 'GET /api/qr'
        }
    });
});

// Get all contacts
app.get('/api/contacts', async (req, res) => {
    try {
        if (!client.info) {
            return res.status(400).json({ error: 'WhatsApp client is not ready. Please scan QR code first.' });
        }
        
        const contacts = await client.getContacts();
        const contactsList = contacts.map(contact => ({
            id: contact.id._serialized,
            number: contact.number,
            name: contact.pushname || contact.name || contact.number,
            isUser: contact.isUser,
            isMyContact: contact.isMyContact,
            isGroup: contact.id._serialized.includes('@g.us')
        }));
        
        res.json({
            success: true,
            count: contactsList.length,
            contacts: contactsList
        });
    } catch (error) {
        console.error('Error getting contacts:', error);
        res.status(500).json({ error: error.message });
    }
});

// Send a message
app.post('/api/send-message', async (req, res) => {
    try {
        if (!client.info) {
            return res.status(400).json({ error: 'WhatsApp client is not ready. Please scan QR code first.' });
        }
        
        // Check if body is empty or not parsed
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ 
                error: 'Request body is empty or not properly formatted. Make sure Content-Type is application/json',
                received: req.body
            });
        }
        
        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({ 
                error: 'Missing required fields: number and message',
                received: req.body
            });
        }
        
        // Format number (remove any non-digit characters except +)
        let formattedNumber = number.replace(/[^\d+]/g, '');
        
        // If number doesn't include country code, you might need to add it
        // For now, we'll use it as is
        if (!formattedNumber.includes('@')) {
            formattedNumber = formattedNumber.includes('@c.us') 
                ? formattedNumber 
                : formattedNumber + '@c.us';
        }
        
        const response = await client.sendMessage(formattedNumber, message);
        
        res.json({
            success: true,
            messageId: response.id._serialized,
            to: formattedNumber,
            message: message,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get received messages
app.get('/api/messages', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const messages = receivedMessages.slice(-limit).reverse(); // Most recent first
        
        res.json({
            success: true,
            count: messages.length,
            messages: messages
        });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get QR code status (for checking if client is ready)
app.get('/api/status', (req, res) => {
    res.json({
        ready: !!client.info,
        authenticated: !!client.info,
        messageCount: receivedMessages.length
    });
});

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
});

// Initialize WhatsApp client
client.initialize().catch(err => {
    console.error('❌ Failed to initialize client:', err);
});
