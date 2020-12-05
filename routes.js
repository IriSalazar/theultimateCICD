const express = require('express');
const router = express.Router();

const index = require('./routes/index');
const chat = require('./routes/chat');
 

router.use('/', index);
router.use('/chat', chat);

module.exports = router;