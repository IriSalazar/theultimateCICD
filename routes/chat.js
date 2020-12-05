require('dotenv').config();

const express = require('express');
const router = express.Router();
const redisClient = require('../redis-client');
const { authenticateToken } = require('../authentication.js')

const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);


router.get('/lobby', authenticateToken, async (req, res) => {
    // await redisClient.flushAsync();
    let chatRooms = await redisClient.getAsync(`chatRooms`);
    if (!chatRooms) {
        chatRooms = await req.db.chatroom.findAll();
        await redisClient.setAsync(`chatRooms`, JSON.stringify(chatRooms));
    } else {
        console.log('Using cache for lobby');
        chatRooms = JSON.parse(chatRooms);
    }
    res.json({ chatRooms });
});

router.post('/createChatroom', authenticateToken, async (req, res) => {
    try {
        const chatRoom = await req.db.chatroom.build(req.body);
        await chatRoom.save().then(async (chatRoom) => {
            let chatRooms = await redisClient.getAsync(`chatRooms`);
            if (chatRooms) {
                chatRooms = JSON.parse(chatRooms);
                chatRooms.push(chatRoom);
                await redisClient.setAsync(`chatRooms`, JSON.stringify(chatRooms));
            }
        });
        res.status(201).json(chatRoom);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.get('/chatroom/:id', authenticateToken, async (req, res) => {
    let chatRoom; let messages;
    chatRoom = await redisClient.getAsync(`chatRoom-${req.params.id}`);
    messages = await redisClient.getAsync(`messages-${req.params.id}`);
    if (!chatRoom) {
        chatRoom = await req.db.chatroom.findByPk(req.params.id);
        await redisClient.setAsync(`chatRoom-${req.params.id}`, JSON.stringify(chatRoom));
    } else {
        chatRoom = JSON.parse(chatRoom);
    }
    if (!messages) {
        messages = await req.db.message.findAll({ where: { chatRoomId: chatRoom.id } });
        await redisClient.setAsync(`messages-${req.params.id}`, JSON.stringify(messages), 'EX', 5*60);
    } else {
        console.log('Using cache for messages');
        messages = JSON.parse(messages);
    }
    res.json({ chatRoom, messages });
});

router.post('/chatroom/:id/message', authenticateToken, async (req, res) => {
    try {
        const message = await req.db.message.build(req.body);
        await message.save().then(async (message) => {
            let messages = await redisClient.getAsync(`messages-${req.params.id}`);
            if (messages) {
                messages = JSON.parse(messages);
                messages.push(message);
                await redisClient.setAsync(`messages-${req.params.id}`, JSON.stringify(messages), 'EX', 5*60);
            }
        });
        res.status(201).json(message);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/deleteChatroom/:id', authenticateToken, async (req, res) => {
    try {
        const chatRoom = await req.db.chatroom.findByPk(req.params.id);
        const messages = await req.db.message.findAll({ where: { chatRoomId: chatRoom.id } });
        messages.forEach(async (msg) => {
            await msg.destroy();
        });
        await chatRoom.destroy();
        let chatRooms = await redisClient.getAsync(`chatRooms`);
        if (chatRooms) {
            chatRooms = JSON.parse(chatRooms);
            chatRooms.splice(chatRooms.indexOf(chatRoom), 1);
            await redisClient.setAsync(`chatRooms`, JSON.stringify(chatRooms));
            await redisClient.delAsync(`messages-${req.params.id}`);
        }
        res.status(204).json({ message: 'Succesfully deleted Chatroom and messages' });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

router.post('/chatroom/:id/mention', async (req, res) => {
    const chatRoom = await req.db.chatroom.findByPk(req.params.id);
    const msg = {
        to: 'receiver.mail',
        from: process.env.SENDGRID_USER,
        subject: `You have been mentioned in ${chatRoom.name}`,
        text: 'You better answer them!',
        html: '<strong>You better answer them! You can go clicking </strong><a href=#>here<a>',
    }
    await sgMail.send(msg);
});

module.exports = router;
