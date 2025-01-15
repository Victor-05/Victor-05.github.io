// server.js
const WebSocket = require('ws');
const http = require('http');

// Creăm un server HTTP
const server = http.createServer();

// Creăm serverul WebSocket și îl asociem cu serverul HTTP
const wss = new WebSocket.Server({ server });

// Când un client se conectează
wss.on('connection', (ws) => {
  console.log('Un client s-a conectat');
  
  // Trimite un mesaj de bun venit când un client se conectează
  ws.send('Bun venit în chat!');

  // Când un client trimite un mesaj
  ws.on('message', (message) => {
    console.log('Mesaj primit: %s', message);
    // Trimite mesajul la toți clienții conectați
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('Un client s-a deconectat');
  });
});

// Ascultă pe IP-ul public și portul 8080
const IP_ADDRESS = '185.199.108.153'; // IP-ul tău public
const PORT = 8080; // Portul 8080

server.listen(PORT, IP_ADDRESS, () => {
  console.log(`Serverul WebSocket rulează pe ws://${IP_ADDRESS}:${PORT}`);
});
