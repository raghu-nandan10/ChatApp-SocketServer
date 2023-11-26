import { parse } from "cookie";
import { jwtDecode, jwtSignIn } from "./Jwt.js";
import {
  updateSocketIdOfUser,
  getUserFromDB,
  getAllUsers,
} from "../handlers/auth.js";

const updateSocketId = async (socket, io) => {
  if (!socket.handshake.headers.cookie) {
    socket.emit("user:noAuth", { message: "User not authenticated" });
    return false;
  }
  const cookies = parse(socket.handshake.headers.cookie);
  if (!cookies || !cookies.access_token) {
    socket.emit("user:noAuth", { message: "User not authenticated" });
    return false;
  }
  const access_token = cookies.access_token;

  if (access_token) {
    const userObject = jwtDecode(access_token);
    const userFromDB = getUserFromDB(userObject.username);
    socket.emit("currentUser:fetch", { currentUser: userObject.username });

    if (userObject.socketId != socket.id) {
      if (!userFromDB) {
        socket.emit("user:noAuth", { message: "User doesn't exists " });
      } else {
        updateSocketIdOfUser(userObject.username, socket.id);
      }
      userObject.socketId = socket.id;
      const updateUserToken = jwtSignIn(userObject);
      socket.emit("store:cookie", {
        cookieName: "access_token",
        access_token: updateUserToken,
      });
      socket.broadcast.emit("users:fetched", {
        userDB: await getAllUsers(),
        newUser: true,
        newUsername: userObject.username,
      });
    }
    console.log(userObject.socketId + " " + socket.id);
  }
};

export { updateSocketId };
