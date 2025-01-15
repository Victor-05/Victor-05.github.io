// server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

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
