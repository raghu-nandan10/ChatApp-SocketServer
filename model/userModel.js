import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    requried: true,
  },
  password: {
    type: String,
    required: true,
  },
  socketId: {
    type: String,
    requried: true,
  },
});

const userRepository = mongoose.model("users", userSchema);

export { userRepository, userSchema };
