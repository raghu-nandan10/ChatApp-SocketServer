import { getAllUsers } from "./auth.js";
const handleGetUsers = async (payload, socket) => {
  socket.emit("users:fetched", { userDB: await getAllUsers() });
};

export const userHandler = (io, socket) => {
  socket.on("users:get", (payload) => handleGetUsers(payload, socket));
};
