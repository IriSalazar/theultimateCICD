const express = require('express');
const router = express.Router();

const index = require('./routes/index');
const chat = require('./routes/chat');
const admin = require('./routes/admin');
 

router.use('/', index);
router.use('/admin', admin);
router.use('/chat', chat);

module.exports = router;