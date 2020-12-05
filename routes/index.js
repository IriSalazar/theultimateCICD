require('dotenv').config();

const express = require('express');
const router = express.Router();
const faker = require('faker');
const nodemailer = require('nodemailer');
const googleOAuth = require('../GoogleOAuth');

const jwt = require('jsonwebtoken');

const { generateToken } = require('../authentication.js');


router.get('/', async (req, res) => {
    let lastUser;
    res.json(lastUser);
});

router.post('/createUser', async (req, res) => {
    let toSendUser;
    const user = await req.db.user.build(req.body);
    if (req.body.userName) {
        const refreshToken = jwt.sign(req.body, process.env.REFRESH_TOKEN_SECRET);
        user.refreshToken = refreshToken;
    } else {
        const fakeName = faker.name.findName();
        const refreshToken = jwt.sign({ userName: fakeName,
            mail: req.body.mail, password: req.body.password }, process.env.REFRESH_TOKEN_SECRET);
        user.userName = fakeName;
        user.refreshToken = refreshToken;
    }
    await user.save().then((user) => { toSendUser = user });
    const accessToken = generateToken(req.body);
    // const refreshToken = jwt.sign(toSendUser.dataValues, process.env.REFRESH_TOKEN_SECRET);
    // await toSendUser.update({ refreshToken }, { fields: ['refreshToken'] });
    res.status(201).json({ user: { id: toSendUser.id, userName: toSendUser.userName, mail: toSendUser.mail, token: accessToken } });
});

router.post('/logIn', async (req, res) => {
    let user = await req.db.user.findOne({ where: { mail: req.body.mail, password: req.body.password } });
    if (!user) {
        return res.sendStatus(404);
    }
    const refreshToken = jwt.sign({ userName: user.userName, mail: user.mail, password: user.password }, process.env.REFRESH_TOKEN_SECRET);
    await user.update({ refreshToken }, { fields: ['refreshToken'] }) // TODO check if this works
    const accessToken = generateToken({ userName: user.userName, mail: user.mail, password: user.password });
    // const refreshToken = jwt.sign(user.dataValues, process.env.REFRESH_TOKEN_SECRET);
    res.status(200).json({ user: { id: user.id, userName: user.userName, mail: user.mail, token: accessToken } });
})

router.post('/googleLogin', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const user = await googleOAuth(token);
    res.status(200).json(user);
});

module.exports = router;
