const { StatusCodes } = require('http-status-codes');

module.exports = (err, _req, res, _next) => {
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Internal server error';
  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ message, stack: err.stack });
  }
  return res.status(status).json({ message });
};
