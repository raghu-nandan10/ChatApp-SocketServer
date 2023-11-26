import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
  username: {
    type: String,
  },
  chats: {
    type: Object,
    requrired: true,
  },
});
const chatRepository = mongoose.model("chats", chatSchema);

export { chatRepository };
