
const mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');


const UserSchema = new mongoose.Schema({
  firstName : {
    type: String,
    minLength: 5,
    maxLength: 55,
    required: 'This field is required'
  },

  lastName : {
    type: String,
    minLength: 5,
    maxLength: 55,
    required : 'This field is required'
  },

  email : {
    type: String,
    minLength: 5,
    maxLength: 255,
    required : 'This field is required'
  },

  password : {
    type: String,
    required : 'This field is required',
    minLength: 8,
    maxLength: 255
  },

  dateOfBirth: {
    type: Date,
    required: 'This field is required'
  },

  profilePic: {
    type: String,
    required: true,
  },

  biography: {
    type: String,
    required: true,
  }, 

  token: {
    type: String,
    minLength: 64
  },

  isVerified: {
    type: Boolean,
    required: true,
    default: false,
  },

  passwordResetToken: {

    type: String,
    minlength: 64

  }

});

UserSchema.plugin(timestamps);
mongoose.model("User", UserSchema)