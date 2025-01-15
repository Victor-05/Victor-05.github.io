// chat.js

const socket = new WebSocket('ws://localhost:8080'); // Serverul local

// Când conexiunea este deschisă
socket.onopen = () => {
  console.log('Conexiune stabilită cu serverul de chat');
};

// Când serverul trimite un mesaj
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

// Permite trimiterea mesajului și apăsând Enter
document.getElementById('input').addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    document.getElementById('send').click();
  }
});
