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
        messages = await req.db.message.findAll({ where: { chatRoomId: req.params.id } });
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
    const receiver = await req.db.user.findOne( { where: { userName: req.body.name } } );
    const msg = {
        to: `${receiver.mail}`,
        from: process.env.SENDGRID_USER,
        subject: `You have been mentioned in ${chatRoom.name}`,
        text: 'You better answer them!',
        html: `<strong>You better answer them! You can go clicking </strong><a href=${process.env.FRONTEND_LINK}>here!<a>`,
    }
    await sgMail.send(msg);
});


router.post('/request', authenticateToken, async (req, res) => {
    const requestInDB = await req.db.request.findOne( { where: { userId: req.body.userId, chatRoomId: req.body.chatRoomId } } );
    if (requestInDB) {
        return res.status(200)
    }
    try {
        const request = await req.db.request.build(req.body);
        await request.save();
        const chatRoom = await req.db.chatroom.findByPk(req.body.chatRoomId);
        const receiver = await req.db.user.findByPk(chatRoom.userId)
        const requester = await req.db.user.findByPk(req.body.userId);
        const msg = {
            to: `${receiver.mail}`,
            from: process.env.SENDGRID_USER,
            subject: `${requester.userName} wants to join ${chatRoom.name}`,
            text: 'Enter the website and accept/decline them.',
            html: `<strong>Enter the website by clicking </strong><a href=${process.env.FRONTEND_LINK}>here<a><strong> and accept/decline them.</strong>`,
        }
        await sgMail.send(msg);
        res.status(201).json(request);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
})

router.get('/chatRoom/:id/requests', authenticateToken, async (req, res) => {
    // Se puede implementar cache
    let users = []; const userPromises = [];
    const requests = await req.db.request.findAll( { where: { chatRoomId: req.params.id } } );
    requests.forEach((request) => {
        userPromises.push(req.db.user.findByPk(request.userId));
    });
    await Promise.all(userPromises).then( (elem) => {
        users = elem;
    })
    const chatRoom = await req.db.chatroom.findByPk(req.params.id);
    res.status(200).json({ requests, users, chatRoomName: chatRoom.name });
});

router.post('/acceptRequest', authenticateToken, async (req, res) => {
    const request = await req.db.request.findOne( { where: { userId: req.body.acceptedUser, chatRoomId: req.body.chatRoomId } } );
    if (!request) {
        res.status(404);
    };
    await request.update({ admitted: true }, { fields: ['admitted'] });

    const chatRoom = await req.db.chatroom.findByPk(req.body.chatRoomId);
    const receiver = await req.db.user.findByPk(req.body.acceptedUser);
    const msg = {
        to: `${receiver.mail}`,
        from: process.env.SENDGRID_USER,
        subject: `You have been accepted to ${chatRoom.name}!`,
        text: 'Enter the website.',
        html: `<strong>Enter the website by clicking </strong><a href=${process.env.FRONTEND_LINK}>here!<a>`,
    }
    console.log('MAIL SENT TO ACCEPTED USER')
    await sgMail.send(msg);
    res.status(201).json({ request, message: 'Mail sent to accepted user' });
})

router.post('/rejectRequest', authenticateToken, async (req, res) => {
    const request = await req.db.request.findOne( { where: { userId: req.body.acceptedUser, chatRoomId: req.body.chatRoomId } } );
    if (!request) {
        res.status(404);
    };

    const chatRoom = await req.db.chatroom.findByPk(req.body.chatRoomId);
    const receiver = await req.db.user.findByPk(req.body.acceptedUser);

    await request.destroy();

    const msg = {
        to: `${receiver.mail}`,
        from: process.env.SENDGRID_USER,
        subject: `Your request for ${chatRoom.name} has been declined :(`,
        text: 'Enter the website.',
        html: `<strong>Enter the website by clicking </strong><a href=${process.env.FRONTEND_LINK}>here!<a>`,
    }
    console.log('MAIL SENT TO REJECTED USER')
    await sgMail.send(msg);
    res.status(201).json({ request, message: 'Mail sent to rejected user' });
})

router.get('/chatRoom/:chatRoomId/admitted/:id', authenticateToken, async (req, res) => {
    const chatRoom = await req.db.chatroom.findByPk(req.params.chatRoomId)
    if (!chatRoom.privacy) {
        res.status(200).json( { admitted: true, chatRoom } );
    } else {
        const request = await req.db.request.findOne( { where: { chatRoomId: req.params.chatRoomId, userId: req.params.id } } )
        if (request) {
            res.status(200).json({ admitted: request.admitted, chatRoom })
        } else {
            res.status(200).json( { admitted: false, chatRoom } )
        }
    }
});

router.get('/chatroomGet/:id', authenticateToken, async (req, res) => {
    const chatRoom = await req.db.chatroom.findOne({ where: { id: req.params.id } });
    console.log('Hola');
    if (chatRoom) {
        res.status(200).json({ chatRoom });
    } else {
        res.status(404);
    }
})

module.exports = router;
