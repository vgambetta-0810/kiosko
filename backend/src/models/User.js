const mongoose = require('mongoose');
const { roles } = require('../constants/enums');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String },
    googleId: { type: String, index: true },
    role: { type: String, enum: Object.values(roles), default: roles.CLIENT },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    age: { type: Number, min: 0, max: 120 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
