const express = require('express');
const path = require('path');
const fs = require('fs');
const ws = require('ws');
const bcrypt = require('bcrypt');
const uuid = require('uuid');

const app = express();
const PORT = 3000;

// Create data directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// User database file
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

// Add error handling for corrupted or missing users.json
try {
  const users = JSON.parse(fs.readFileSync(USERS_FILE));
} catch (err) {
  console.error('Error reading users.json:', err);
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// WebSocket server
const wss = new ws.Server({ noServer: true });

// Track connected users
const connectedUsers = new Map();

// Broadcast message to all clients
function broadcast(message) {
  for (const client of wss.clients) {
    if (client.readyState === ws.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

// Handle WebSocket connections
wss.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'login') {
        // Track this user as connected
        connectedUsers.set(socket, message.userId);
        broadcast({
          type: 'userStatus',
          userId: message.userId,
          status: 'online'
        });
      } else if (message.type === 'chat') {
        // Broadcast chat message to all clients
        broadcast({
          type: 'chat',
          userId: message.userId,
          username: message.username,
          text: message.text,
          timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });
  
  socket.on('close', () => {
    const userId = connectedUsers.get(socket);
    if (userId) {
      connectedUsers.delete(socket);
      broadcast({
        type: 'userStatus',
        userId,
        status: 'offline'
      });
    }
    console.log('Client disconnected');
  });
});

// API Routes

// Register new user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Load existing users
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    
    // Check if email already exists
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: uuid.v4(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    // Save user
    users.push(newUser);
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    
    res.json({ 
      success: true,
      userId: newUser.id,
      username: newUser.username
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Load users
    const users = JSON.parse(fs.readFileSync(USERS_FILE));
    
    // Find user
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.json({ 
      success: true,
      userId: user.id,
      username: user.username
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get online users
app.get('/api/users', (req, res) => {
  const onlineUsers = Array.from(connectedUsers.values());
  res.json({ onlineUsers });
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.get('/auth', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'auth.html'));
});

app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'chat.html'));
});

// Create HTTP server
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Upgrade HTTP server to WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});