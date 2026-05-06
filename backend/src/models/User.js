const mongoose = require('mongoose');
const { roles } = require('../constants/enums');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    password: { type: String, select: false },
    googleId: { type: String, index: true },
    role: { type: String, enum: Object.values(roles), default: roles.CLIENT },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    age: { type: Number, min: 0, max: 120 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
