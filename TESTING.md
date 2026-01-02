# Local Multiplayer Testing Guide

This guide helps you test the multiplayer functionality locally by running multiple client instances.

## Setup

### 1. Start the Game Server (Backend)

```bash
cd server
npm start
```

The server will run on `http://localhost:3001`

### 2. Start Multiple Client Instances

Open **3 separate terminal windows** and run:

**Terminal 1 (Player 1):**
```bash
node test-server.js 5500
```
Open: `http://localhost:5500`

**Terminal 2 (Player 2):**
```bash
node test-server.js 5501
```
Open: `http://localhost:5501`

**Terminal 3 (Player 3 - Optional):**
```bash
node test-server.js 5502
```
Open: `http://localhost:5502`

## Testing Multiplayer Flow

### Step 1: Create a Room
1. In browser window on `localhost:5500`:
   - Enter a player name (e.g., "Alice")
   - Click "Create Room"
   - You'll see a 6-character room code (e.g., "ABCD12")
   - Click "Ready"

### Step 2: Join the Room
2. In browser window on `localhost:5501`:
   - Enter a different player name (e.g., "Bob")
   - Click "Join Room"
   - Enter the room code from Step 1
   - Click "Ready"

### Step 3: Start the Game
3. In the first browser window (host):
   - Click "Start Game" (only appears for the host)

### Step 4: Play Together
4. Start typing guesses in both windows:
   - Watch the other player's progress in real-time
   - See typing indicators when they're entering letters
   - Try to solve the word first!

## What to Watch For (CORS Testing)

✅ **Working correctly:**
- Both clients connect to the server
- Room creation and joining works
- Real-time updates appear in both windows
- No CORS errors in browser console (F12)

❌ **CORS Issues:**
- "CORS blocked" errors in console
- Unable to connect to server
- Socket.IO connection failures

## Debugging

### Check Browser Console (F12)
- Look for connection messages: "Connected to server"
- Check for any red error messages
- Socket.IO should show successful connection

### Check Server Logs
The server terminal should show:
```
Connected to server
Player joined room: <room-code>
```

### Common Issues

**Issue:** "Failed to connect to server"
- **Fix:** Make sure the server is running on port 3001

**Issue:** CORS errors
- **Fix:** Check that the ports are in the allowedOrigins array in [server/index.js](server/index.js#L27-L36)

**Issue:** Can't join room
- **Fix:** Make sure room code is entered correctly (6 characters, case-insensitive)

## Quick Test Script

Run all at once (requires 4 terminals):

```bash
# Terminal 1: Backend
cd server && npm start

# Terminal 2: Player 1
node test-server.js 5500

# Terminal 3: Player 2
node test-server.js 5501

# Terminal 4: Player 3
node test-server.js 5502
```

Then open:
- http://localhost:5500 (Player 1 - Create room)
- http://localhost:5501 (Player 2 - Join room)
- http://localhost:5502 (Player 3 - Join room)
