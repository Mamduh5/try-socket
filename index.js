// index.js (Server)

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Store player data (e.g., name) using the socket.id as key
const activePlayers = {}; // { socket.id: { name: 'PlayerName', /* other game data */ } }

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // --- NEW: Handle setting the player's name ---
  // When a client sends their name
  socket.on('set_name', (name) => {
    const trimmedName = name.trim();
    if (trimmedName) {
      activePlayers[socket.id] = { name: trimmedName };
      console.log(`User ${socket.id} set name to: ${trimmedName}`);
      // Notify everyone that a new user has joined with their name
      io.emit('chat message', `[SERVER] ${trimmedName} has joined the chat.`);
      // Optionally send a welcome message just to the new user
      socket.emit('chat message', `[SERVER] Welcome, ${trimmedName}!`);
    } else {
      // If for some reason an empty name is sent, prompt again (client-side handles this too)
      socket.emit('chat message', '[SERVER] Please enter a valid name.');
    }
  });
  // --- END NEW ---


  // Listen for 'chat message' events from the client
  socket.on('chat message', (msg) => {
    const player = activePlayers[socket.id];
    let senderName = player ? player.name : `Guest_${socket.id.substring(0, 4)}`; // Fallback name

    // Prepend the sender's name to the message
    const formattedMessage = `${senderName}: ${msg}`;
    console.log(formattedMessage);

    // Broadcast the message to all connected clients
    io.emit('chat message', formattedMessage);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const player = activePlayers[socket.id];
    let disconnectedName = player ? player.name : `Guest_${socket.id.substring(0, 4)}`; // Use stored name or fallback
    
    console.log(`User disconnected: ${disconnectedName} (${socket.id})`);
    // Notify everyone that the user has left
    io.emit('chat message', `[SERVER] ${disconnectedName} has left the chat.`);

    // Clean up player data
    delete activePlayers[socket.id];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});