const mongoose = require('mongoose');
var timestamps = require('mongoose-timestamp');
const PostSchema = new mongoose.Schema({

  content: {
    type: String,
    required: true,
  },

  picture: {
    type: String,
  },

  user: {
    type: String,
    required: true
  },

  userFullName : {
    type: String,
    required: true
  }
})
PostSchema.plugin(timestamps);
mongoose.model("Post", PostSchema);