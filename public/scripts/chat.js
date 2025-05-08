document.addEventListener('DOMContentLoaded', () => {
    // Get current user from session storage
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = '/';
        return;
    }
    
    // Display user info
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    
    // Set avatar color based on username
    const avatar = document.getElementById('userAvatar');
    const colors = ['#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#7209b7'];
    const colorIndex = hashCode(currentUser.username) % colors.length;
    avatar.style.backgroundColor = colors[colorIndex];
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('currentUser');
        window.location.href = '/';
    });
    
    // WebSocket connection
    const socket = new WebSocket(`ws://${window.location.host}`);
    
    // Track online users
    const onlineUsers = new Map();
    
    // When socket opens
    socket.addEventListener('open', () => {
        // Notify server that we're logged in
        socket.send(JSON.stringify({
            type: 'login',
            userId: currentUser.userId
        }));
        
        // Load online users
        fetch('/api/users')
            .then(response => response.json())
            .then(data => {
                updateOnlineUsers(data.onlineUsers);
            });
    });
    
    // Handle incoming messages
    socket.addEventListener('message', (event) => {
        const message = JSON.parse(event.data);
        
        if (message.type === 'chat') {
            displayMessage(message);
        } else if (message.type === 'userStatus') {
            updateUserStatus(message.userId, message.status);
        }
    });
    
    // Send message
    document.getElementById('messageForm').addEventListener('submit', (e) => {
        e.preventDefault();
        
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        
        if (messageText === '') return;
        
        // Send message via WebSocket
        socket.send(JSON.stringify({
            type: 'chat',
            userId: currentUser.userId,
            username: currentUser.username,
            text: messageText
        }));
        
        messageInput.value = '';
    });
    
    // Display a message in the chat
    function displayMessage(message) {
        const messagesContainer = document.getElementById('messages');
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message');
        
        if (message.userId === currentUser.userId) {
            messageDiv.classList.add('sent');
        } else {
            messageDiv.classList.add('received');
        }
        
        const messageInfo = document.createElement('div');
        messageInfo.classList.add('message-info');
        messageInfo.innerHTML = `
            <span>${message.username}</span>
            <span>${formatTime(message.timestamp)}</span>
        `;
        
        const messageText = document.createElement('div');
        messageText.classList.add('message-text');
        messageText.textContent = message.text;
        
        messageDiv.appendChild(messageInfo);
        messageDiv.appendChild(messageText);
        messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // Update online users list
    function updateOnlineUsers(userIds) {
        const usersList = document.getElementById('usersList');
        usersList.innerHTML = '';
        
        userIds.forEach(userId => {
            if (userId !== currentUser.userId) {
                const li = document.createElement('li');
                li.textContent = userId; // In a real app, you'd want to store usernames
                usersList.appendChild(li);
            }
        });
    }
    
    // Update user status
    function updateUserStatus(userId, status) {
        if (userId === currentUser.userId) return;
        
        const usersList = document.getElementById('usersList');
        const existingUser = Array.from(usersList.children).find(li => li.textContent === userId);
        
        if (status === 'online') {
            if (!existingUser) {
                const li = document.createElement('li');
                li.textContent = userId;
                usersList.appendChild(li);
            }
        } else {
            if (existingUser) {
                existingUser.remove();
            }
        }
    }
    
    // Format timestamp
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
});