require('dotenv').config();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function authenticateToken(req, res, next) {
  const sessionType = req.headers['session'];
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (sessionType === 'app') {
    if (!token) res.status(401);
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err) => {
      if (err) res.status(403);
      next();
    });
  } else if (sessionType === 'google') {
    googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    }, (err) => {
      if (err) res.status(403);
      next();
    });
  } else {
    res.status(403);
  }
}

function generateToken(data) {
  return jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
}

module.exports = { authenticateToken, generateToken };