import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { authHandler } from "./handlers/auth.js";
import { userHandler } from "./handlers/users.js";
import { configDotenv } from "dotenv";
import cookieParser from "cookie-parser";
import { updateSocketId } from "./utils/UpdateUserSocket.js";
import { chatHandler } from "./handlers/chat.js";
import cors from "cors";
import mongoose from "mongoose";
configDotenv();
const app = express();
const httpServer = createServer(app);
const corsOptions = {
  origin: [process.env.FRONTEND_ORIGIN, process.env.LOCAL_ORIGIN],
  credentials: true,
  methods: ["GET", "POST"],
};
const io = new Server(httpServer, {
  cors: corsOptions,
});

app.use(cors(corsOptions));

app.use(cookieParser());

const onConnection = (socket) => {
  updateSocketId(socket, io);
  authHandler(io, socket);
  userHandler(io, socket);
  chatHandler(socket, io);
};

io.on("connection", onConnection);

mongoose
  .connect(process.env.DB_URL, {
    dbName: "chatapp",
  })
  .then(() => {
    httpServer.listen(3000, () => {
      console.log("socket is listening on port 3000");
    });
  });
