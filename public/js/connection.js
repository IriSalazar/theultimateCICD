const messageContainer = document.getElementById('message-container');
const messageForm = document.getElementById('send-container');
const messageInput = document.getElementById('message-input');


if (messageContainer && messageForm) {
  const socket = io();
  const user = messageContainer.getAttribute('user');
  const owner = messageContainer.getAttribute('owner');
  const chatRoom = messageContainer.getAttribute('chatRoom');
  const parsedUser = JSON.parse(user); const parsedChatRoom = JSON.parse(chatRoom);
  const submitPath = messageContainer.getAttribute('submitPath');
  const banPath = messageContainer.getAttribute('banPath');
  const leavePath = messageContainer.getAttribute('leavePath');
  let messages = JSON.parse(messageContainer.getAttribute('previousMessages'));
  let messageCount;
  if (messages) {
    messageCount = messages.length;
    messages.forEach((elem) => {
      appendMessage(elem.userName, elem.userId, elem.content, new Date(elem.date), parsedUser);
    });
    messages = {};
  }

  // Socket functions
  socket.emit('new-connection', { chatRoom, userName: parsedUser.userName });
  socket.on('user-joined', (userName) => { appendAlert(userName, 'joined'); });
  socket.on('user-left', (userName) => { appendAlert(userName, 'left'); });
  socket.on('chat-message', (data) => { appendMessage(data.name, data.userId, data.message, new Date(), parsedUser); messageCount++; });
  socket.on('user-is-typing', (name) => appendTyper(name));
  socket.on('user-stopped-typing', (name) => removeTyper(name));
  socket.on('ban', (userName) => { if (userName == parsedUser.userName) window.location.href = leavePath; });


  // Message functions
  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value;
    const command = getCommand(message);
    switch (command.start) {
      case '/ban':
        if (parsedChatRoom.userId == parsedUser.id) {
          $.post(banPath, { userName: command.user });
          setTimeout(() => { socket.emit('ban-user', { userName: command.user, chatRoom }); }, 500);
        }
        break;
      case '/leave':
        window.location.href = leavePath;
        break;
      case '/info':
        const messageElement = document.createElement('div');
        const ownerTitle = document.createElement('p');
        const chatOwner = document.createElement('p');
        const allMessages = document.createElement('p');
        messageElement.setAttribute('class', 'message'); ownerTitle.setAttribute('class', 'name'); chatOwner.setAttribute('class', 'content'); allMessages.setAttribute('class', 'content');
        messageElement.style.marginLeft = 'auto';
        messageElement.style.marginRight = '0';
        messageElement.style.backgroundColor = 'lightgray';
        chatOwner.style.marginLeft = '30px';
        ownerTitle.innerText = 'Owner:';
        chatOwner.innerText = owner;
        allMessages.innerText = `Total messages: ${messageCount}`;
        messageElement.appendChild(ownerTitle); messageElement.appendChild(chatOwner); messageElement.appendChild(allMessages); messageContainer.append(messageElement);
        messageContainer.scrollTop = messageContainer.scrollHeight;
        break;
      case 'message':
        appendMessage(parsedUser.name, parsedUser.id, message, new Date(), parsedUser);
        socket.emit('send-chat-message', { message, user, chatRoom });
        const data = {
          "userId": messageForm.elements.namedItem('userId').value,
          "chatRoomId": messageForm.elements.namedItem('chatRoomId').value,
          "userName": messageForm.elements.namedItem('userName').value,
          "content": messageForm.elements.namedItem('content').value,
          "date": new Date(),
        }
        $.post(submitPath, data);
        messageCount++;
        break;
    }
    removeTyper(parsedUser.name);
    messageInput.value = '';
  });

  function appendMessage(senderName, senderId, message, date, thisUser) {
    let formattedDate = `${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })} ${date.toLocaleTimeString('it-IT')}`.split(':');
    formattedDate.pop();
    formattedDate = formattedDate.join(':');
    const messageElement = document.createElement('div');
    messageElement.setAttribute('class', 'message');
    const name = document.createElement('p');
    name.setAttribute('class', 'name');
    const content = document.createElement('p');
    content.setAttribute('class', 'content');
    const datetime = document.createElement('p');
    datetime.setAttribute('class', 'datetime');
    if (senderId === thisUser.id) {
      messageElement.style.marginLeft = 'auto';
      messageElement.style.marginRight = '0';
      messageElement.style.backgroundColor = 'lightgreen';
    } else {
      name.innerText = senderName;
      messageElement.style.marginLeft = '0';
      messageElement.style.marginRight = 'auto';
      messageElement.style.backgroundColor = 'lightblue';
    }
    content.innerText = message;
    datetime.innerText = formattedDate;
    messageElement.appendChild(name);
    messageElement.appendChild(content);
    messageElement.appendChild(datetime);
    messageContainer.append(messageElement);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  // Alert function
  function appendAlert(userName, type) {
    const alert = document.createElement('div');
    alert.setAttribute('class', 'alert');
    const content = document.createElement('p');
    content.innerText = `${userName} ${type}`;
    alert.append(content);
    messageContainer.append(alert);
    messageContainer.scrollTop = messageContainer.scrollHeight;
  }

  // Typer functions
  $('#message-input').focus(() => { socket.emit('started-typing', { user, chatRoom }); });
  $('#message-input').focusout(() => { socket.emit('finished-typing', { user, chatRoom }); });

  function appendTyper(name) {
    const typer = document.createElement('div');
    typer.setAttribute('class', 'typer');
    typer.innerText = `${name} is typing...`;
    typer.id = name;
    messageContainer.append(typer);
    messageContainer.scrollTop = messageContainer.scrollHeight;
    setTimeout(() => {
      removeTyper(name);
    }, 10000);
  }

  function removeTyper(name) {
    const typer = document.getElementById(name);
    if (typer) {
      typer.remove();
    }
  }
}

function getCommand(command) {
  const words = command.split(' ');
  if (words[0].includes('/')) {
    let user = words.slice(1, words.length);
    user = user.join(' ');
    return { start: words[0], user };
  }
  return { start: 'message' };
}