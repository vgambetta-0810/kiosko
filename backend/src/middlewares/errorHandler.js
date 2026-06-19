const { StatusCodes } = require('http-status-codes');

module.exports = (err, _req, res, _next) => {
  const status = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || 'Error interno del servidor';
  const details = err.details ? { details: err.details } : {};
  if (process.env.NODE_ENV !== 'production') {
    return res.status(status).json({ message, ...details, stack: err.stack });
  }
  return res.status(status).json({ message, ...details });
};
