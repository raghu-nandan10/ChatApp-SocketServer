import { parse } from "cookie";
import { jwtDecode } from "../utils/Jwt.js";
import { getUserFromDB } from "./auth.js";
import { chatRepository } from "../model/chats.js";

const getChatFromDB = async (username) => {
  return await chatRepository.findOne({ username });
};

const typingEmit = (socket, io) => {
  if (!socket.handshake.headers.cookie) {
    socket.emit("cookie:notFound", {});
    return;
  }
  const cookies = parse(socket.handshake.headers.cookie);
  if (cookies && cookies.access_token) {
    const typingUser = jwtDecode(cookies.access_token);
    socket.broadcast.emit("show:typing", { username: typingUser.username });
  }
};

const findAndUpdateChats = async (
  chatOfUser,
  payload,
  payloadToSend,
  belongsToUser,
  totheUserChat
) => {
  if (chatOfUser) {
    const receiverExists = chatOfUser.chats.hasOwnProperty(totheUserChat);
    if (receiverExists) {
      chatOfUser.chats[totheUserChat].msges.push(payloadToSend);
    } else {
      chatOfUser.chats[totheUserChat] = { msges: [payloadToSend] };
    }
    chatOfUser.markModified("chats");
    await chatOfUser.save();
  } else {
    console.log({ totheUserChat });
    try {
      const createChat = new chatRepository({
        username: belongsToUser,
        chats: {
          [totheUserChat]: {
            msges: [payloadToSend],
          },
        },
      });
      await createChat.save();
    } catch (error) {
      console.log(error);
    }
  }
};

const sendMessage = async (socket, io, payload) => {
  if (!socket.handshake.headers.cookie) {
    console.log("sendMesage cookie missing");
    socket.emit("cookie:notFound", {});
    return;
  }
  const cookies = parse(socket.handshake.headers.cookie);
  if (cookies && cookies.access_token) {
    const sentUser = jwtDecode(cookies.access_token);
    //if the receiver is a group chat.
    const time = new Date();
    const hours = time.getHours();
    const minutes = time.getMinutes();
    const formattedTime = `${hours}:${minutes}`;
    if (payload.toUser == "Group chat") {
      const payloadToSend = {
        fromUser: sentUser.username,
        message: payload.message,
        time: formattedTime,
        id: payload.id,
        seenByUsers: [],
        isGroupMsg: true,
      };
      io.emit("msg:from:user", payloadToSend);
      const getChatOfReceiver = await getChatFromDB("Group chat");
      findAndUpdateChats(
        getChatOfReceiver,
        payload,
        payloadToSend,
        "Group chat",
        "Group chat"
      );
    } else {
      const toUser = await getUserFromDB(payload.toUser);
      const payloadToSend = {
        fromUser: sentUser.username,
        toUser: payload.toUser,
        message: payload.message,
        time: formattedTime,
        id: payload.id,
        isGroupMsg: false,
        seenByUsers: [],
      };
      io.to(toUser.socketId).emit("msg:from:user", payloadToSend);
      socket.emit("msg:by:user", payloadToSend);
      var belongsToUser = sentUser.username;
      var totheUserChat = payload.toUser;
      var chatOfUser = await getChatFromDB(belongsToUser);
      findAndUpdateChats(
        chatOfUser,
        payload,
        payloadToSend,
        belongsToUser,
        totheUserChat
      );
      belongsToUser = payload.toUser;
      totheUserChat = sentUser.username;
      var chatOfUser = await getChatFromDB(belongsToUser);
      findAndUpdateChats(
        chatOfUser,
        payload,
        payloadToSend,
        belongsToUser,
        totheUserChat
      );
    }
  }
};

const updateMessageSeenToDb = async (socket, payload) => {
  var { id, fromUser, seenByUsers, toUser } = payload;
  if (!toUser) {
    fromUser = "Group chat";
    toUser = "Group chat";
  }

  const sentUserChat = await getChatFromDB(fromUser);

  const tempMsgIndex = sentUserChat.chats[toUser]?.msges.findIndex((msg) => {
    return msg.id == id;
  });

  if (tempMsgIndex > -1) {
    sentUserChat.chats[toUser].msges[tempMsgIndex].seenByUsers = seenByUsers;

    sentUserChat.markModified("chats");
    await sentUserChat.save();
  }
};

const showSeen = (socket, io, payload) => {
  io.emit("msg:seen:show", {
    id: payload.messageId,
    userSeen: payload.userSeen,
    fromUser: payload.fromUser,
    toUser: payload.toUser,
  });
};

const getChat = async (socket, payload) => {
  if (!socket.handshake.headers.cookie) {
    console.log(" cookie missing");
    return;
  }
  const cookies = parse(socket.handshake.headers.cookie);
  if (!cookies.access_token) {
    console.log(" cookie missing");
    return;
  }
  var currentUser = jwtDecode(cookies.access_token);
  const groupChat = await getChatFromDB("Group chat");
  console.log(currentUser.username);
  const result = await getChatFromDB(currentUser.username);
  console.log(result);
  if (result) {
    result.chats["Group chat"] = groupChat.chats["Group chat"];
    socket.emit("fetched:chat", result);
  } else {
    if (groupChat) {
      const groupChatResult = {
        username: currentUser.username,
        chats: {
          ["Group chat"]: groupChat.chats["Group chat"],
        },
      };
      console.log(groupChatResult);
      socket.emit("fetched:chat", groupChatResult);
    }
  }
};

const getGroupChat = async (socket, payload) => {
  const getChat = await getChatFromDB("Group chat");
  socket.emit("fetched:group:chat", getChat);
};

export const chatHandler = (socket, io) => {
  socket.on("user:typing", (payload) => {
    typingEmit(socket, io);
  });
  socket.on("send:msg", (payload) => {
    sendMessage(socket, io, payload);
  });
  socket.on("message:seen", (payload) => {
    showSeen(socket, io, payload);
  });
  socket.on("get:chat", (payload) => {
    getChat(socket, payload);
  });
  socket.on("msg:seen:update", (payload) => {
    updateMessageSeenToDb(socket, payload);
  });
  socket.on("group:chat:get", (payload) => {
    getGroupChat(socket, payload);
  });
};
