// chat.js

// Conectare la serverul WebSocket
const socket = new WebSocket('ws://chat-app-server.herokuapp.com'); // Înlocuiește cu URL-ul real al serverului tău

// Așteaptă până când conexiunea este stabilită
socket.onopen = () => {
  console.log('Conexiune stabilită cu serverul de chat');
};

// Când serverul trimite un mesaj, se va adăuga în chat
socket.onmessage = (event) => {
  const chatDiv = document.getElementById('chat');
  const message = document.createElement('div');
  message.textContent = event.data;
  chatDiv.appendChild(message);
  chatDiv.scrollTop = chatDiv.scrollHeight; // Răsfoiește automat la ultimul mesaj
};

// Când un utilizator trimite un mesaj
document.getElementById('send').onclick = () => {
  const message = document.getElementById('input').value;
  if (message.trim() !== '') {
    socket.send(message); // Trimite mesajul la server
    document.getElementById('input').value = ''; // Golește câmpul de input
  }
};

// Opțional: Poți trimite mesaje și apăsând Enter (fără să dai click pe butonul "Trimite")
document.getElementById('input').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    document.getElementById('send').click();
  }
});
