# Multi-WhatsApp API

A simple REST API to interact with WhatsApp via Postman.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Scan the QR code displayed in the terminal with your WhatsApp mobile app:
   - Open WhatsApp on your phone
   - Go to Settings > Linked Devices > Link a Device
   - Scan the QR code

## API Endpoints

Base URL: `http://localhost:3000`

### 1. Get All Contacts
**GET** `/api/contacts`

Returns a list of all contacts.

**Example Response:**
```json
{
  "success": true,
  "count": 150,
  "contacts": [
    {
      "id": "1234567890@c.us",
      "number": "1234567890",
      "name": "John Doe",
      "isUser": true,
      "isMyContact": true,
      "isGroup": false
    }
  ]
}
```

### 2. Send Message
**POST** `/api/send-message`

Send a message to a WhatsApp number.

**Request Body:**
```json
{
  "number": "1234567890",
  "message": "Hello from API!"
}
```

**Example Response:**
```json
{
  "success": true,
  "messageId": "3EB0C767F26F8B4DE0",
  "to": "1234567890@c.us",
  "message": "Hello from API!",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Get Received Messages
**GET** `/api/messages?limit=50`

Get all received messages (stored in memory).

**Query Parameters:**
- `limit` (optional): Number of messages to return (default: 50)

**Example Response:**
```json
{
  "success": true,
  "count": 10,
  "messages": [
    {
      "id": "3EB0C767F26F8B4DE0",
      "from": "1234567890@c.us",
      "to": "me@c.us",
      "body": "Hello!",
      "timestamp": 1234567890,
      "contactName": "John Doe",
      "isGroup": false,
      "chatName": "John Doe",
      "date": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### 4. Check Status
**GET** `/api/status`

Check if the WhatsApp client is ready and authenticated.

**Example Response:**
```json
{
  "ready": true,
  "authenticated": true,
  "messageCount": 5
}
```

## Postman Examples

### Get Contacts
- Method: `GET`
- URL: `http://localhost:3000/api/contacts`

### Send Message
- Method: `POST`
- URL: `http://localhost:3000/api/send-message`
- Headers: `Content-Type: application/json`
- Body (raw JSON):
```json
{
  "number": "1234567890",
  "message": "Hello from Postman!"
}
```

### Get Messages
- Method: `GET`
- URL: `http://localhost:3000/api/messages?limit=50`

## Notes

- The server stores received messages in memory (last 100 messages)
- Phone numbers should be in international format (without + or spaces)
- Make sure to scan the QR code before using the API endpoints
- The server runs on port 3000 by default

