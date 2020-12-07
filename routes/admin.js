const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../authentication.js')
const redisClient = require('../redis-client');


router.get('/users', authenticateToken, async (req, res) => {
  const users = await req.db.user.findAll();
  res.json({ users });
});

router.post('/users/:id', authenticateToken, async (req, res) => {
  const user = await req.db.user.findByPk(req.params.id);
  const updateFields = req.body;
  await user.update(updateFields);
  res.status(200).json({ message: 'Succesfully updated user info' });
});

router.delete('/users/:id', authenticateToken, async (req, res) => {
  try {
    const user = await req.db.user.findByPk(req.params.id);
    await user.update({active: false});
    res.status(200).json({ message: 'Succesfully blocked user' });
} catch (err) {
    res.status(500).json({ message: err.message });
}
});

router.post('/chatrooms/:id', authenticateToken, async (req, res) => {
  await redisClient.flushAsync();
  const chatroom = await req.db.chatroom.findByPk(req.params.id);
  const updateFields = req.body;
  await chatroom.update(updateFields);
  res.status(200).json({ message: 'Succesfully updated Chatroom info' });
});

router.post('/messages/:id', authenticateToken, async (req, res) => {
  await redisClient.flushAsync();
  const message = await req.db.message.findByPk(req.params.id);
  const updateFields = req.body;
  await message.update(updateFields);
  res.status(200).json({ message: 'Succesfully updated message info' });
});

router.post('/makeAdmin', authenticateToken, async (req, res) => {
  const user = await req.db.user.findOne({ where: { id: req.body.id } });
  try {
    await user.update({ admin: true }, { fields: ['admin'] });
    res.status(201).json({ message: 'success' });
  } catch (err) {
    res.status(401).json({ message: err });
  }
  
});

module.exports = router;
