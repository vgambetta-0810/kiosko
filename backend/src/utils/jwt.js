const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const getSecret = () => {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required');
  return process.env.JWT_SECRET;
};

exports.signToken = (payload) =>
  jwt.sign(payload, getSecret(), { expiresIn: process.env.JWT_EXPIRES_IN || '7d', jwtid: randomUUID() });

exports.verifyToken = (token) => jwt.verify(token, getSecret());
