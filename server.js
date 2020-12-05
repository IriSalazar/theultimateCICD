require('dotenv').config();

// Set application
const express = require('express');
const path = require('path');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const redisAdapter = require('socket.io-redis');
const expressLayouts = require('express-ejs-layouts');
const PORT = process.env.PORT || 4000;
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_ADAPTER_URL = process.env.REDIS_ADAPTER_URL || 'cache';
const { db, sequelize } = require('./database');
const cookieParser = require('cookie-parser');
const routes = require('./routes');
const cors = require('cors');
const redisClient = require('./redis-client');
const metadata = require('node-ec2-metadata');

// Cors for API
app.use(cors());

// Middleware that passes the database on every route
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Headers for ec2 instance
let instanceHeader;
metadata.getMetadataForInstance('instance-id')
.then((instanceId) => {
    instanceHeader = instanceId;
})
.fail((error) => {
    console.log("Error: " + error);
});

app.use((req, res, next) => {
  req.headers['instance-id'] = `${instanceHeader}`;
  next();
});

// Define layout use
app.use(expressLayouts);

// View engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Set the public folder
app.use(express.static('public'));
// app.use('/css', express.static(path.join(__dirname + 'public/css')));
// app.use('/js', express.static(path.join(__dirname + 'public/js')));

// Body Parser Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser('this is my super secret cookie key jeje'));

// Routes
app.use(routes);

// Attempt connection to the database
try {
  sequelize.authenticate().then(async () => {
    await sequelize.sync({ alter: true });
  });
} catch (error) {
  console.error('Unable to connect to the database:', error);
}

// Close connection to the database if server is terminated
process.on('SIGINT', async () => {
  sequelize.close();
  await redisClient.flushAsync();
  process.exit();
});

const users = {};

io.adapter(redisAdapter({ host: REDIS_ADAPTER_URL, port: REDIS_PORT }));
// Socket connection code start
io.on('connection', (socket) => {
  socket.on('new-connection', (data) => {
    const { userName, chatRoomId }  = data;
    users[socket.id] = { chatRoomId, userName };
    socket.join(chatRoomId);
    socket.to(chatRoomId).emit('user-joined', userName);
  });
  socket.on('send-chat-message', (data) => {
    const user = JSON.parse(data.user);
    const chatRoom = JSON.parse(data.chatRoom);
    socket.to(chatRoom.id).emit('chat-message', { message: data.message, name: user.userName, userId: user.id });
  });
  socket.on('started-typing', (data) => {
    const { userName, chatRoomId }  = data;
    socket.to(chatRoomId).emit('user-is-typing', userName);
  });
  socket.on('finished-typing', (data) => {
    const { userName, chatRoomId }  = data;
    socket.to(chatRoomId).emit('user-stopped-typing', userName);
  });
  socket.on('ban-user', (data) => {
    const chatRoom = JSON.parse(data.chatRoom);
    socket.to(chatRoom.id).emit('ban', data.userName);
  });
  socket.on('disconnect', function() {
    try {
      const userName = users[socket.id].userName;
      const chatRoomId = users[socket.id].chatRoomId;
      socket.to(chatRoomId).emit('user-left', userName);
      delete users[socket.id];
    } catch (error) {
      // Do nothing jeje
    }
  });
});

// Run server
server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
