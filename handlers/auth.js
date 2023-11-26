import { parse } from "cookie";
import { jwtDecode, jwtSignIn, jwtVerify } from "../utils/Jwt.js";
import { userRepository, userSchema } from "../model/userModel.js";
import { hashPassword, verifyPassword } from "../utils/passwordManager.js";

export const getUserFromDB = async (usernameToFind) => {
  return await userRepository.findOne({ username: usernameToFind });
};

export const getAllUsers = async () => {
  return await userRepository.find({});
};

export const addNewUser = async (user) => {
  return await new userRepository(user).save();
};

export const updateSocketIdOfUser = async (username, socketId) => {
  const result = await userRepository.updateOne(
    { username },
    {
      $set: {
        socketId: socketId,
      },
    }
  );
  return result;
};

const create = async (payload, socket, io) => {
  const { formData } = payload;
  const { username, password } = formData;

  try {
    const userFromDb = await getUserFromDB(username);
    console.log(userFromDb == null);
    console.log({ userFromDb });
    if (userFromDb == null) {
      const hash = await hashPassword(password);
      if (hash) {
        console.log("Saving...");
        const newUser = await addNewUser({
          username,
          password: hash,
          socketId: socket.id,
        });
      }

      socket.emit("store:cookie", {
        access_token: jwtSignIn({ username, socketId: socket.id }),
        cookieName: "access_token",
      });
      const users = await getAllUsers();
      socket.broadcast.emit("users:fetched", {
        userDB: users,
        newUser: true,
        newUsername: username,
      });
      socket.emit("creation:true", {
        message: "Created successfully.",
        username,
      });
    } else {
      socket.emit("user:exists", { message: "User already exists", username });
    }
  } catch (error) {
    console.log(error);
  }
};

const login = async (payload, socket, io) => {
  const { formData } = payload;
  const { username, password } = formData;
  const userFromDB = await getUserFromDB(username);
  if (userFromDB != null) {
    console.log({ userFromDB });
    const isPasswordVerified = await verifyPassword(
      userFromDB.password,
      password
    );
    console.log({ isPasswordVerified });
    if (isPasswordVerified) {
      console.log("login success");
      socket.emit("store:cookie", {
        access_token: jwtSignIn({
          username: userFromDB.username,
          socketId: socket.id,
        }),
        cookieName: "access_token",
      });
      socket.emit("user:login:successfull", { username });
      socket.broadcast.emit("users:fetched", {
        userDB: await getAllUsers(),
        newUser: true,
        newUsername: username,
      });
    } else {
      socket.emit("user:login:failed", {
        message: "Incorrect credentials",
        username,
      });
    }
  } else {
    socket.emit("user:login:failed", { username, message: "No user found" });
  }
};

const tokenValidate = (socket) => {
  const cookies = parse(socket.handshake.headers.cookie);
  var user;

  if (cookies && cookies.access_token) {
    user = jwtDecode(cookies.access_token);
    console.log(user);
    if (jwtVerify(cookies.access_token)) {
      socket.emit("user:loggedIn", {});
    } else {
      socket.emit("user:expired", { message: "Session exipred." });
    }
  } else {
    socket.emit("user:notAuthenticated", {
      message: "Login / Signup to continue",
    });
  }
};

const getCurrentUser = (socket) => {
  if (socket.handshake.headers.cookie) {
    const cookies = parse(socket.handshake.headers.cookie);
    if (cookies.access_token) {
      const currentUser = jwtDecode(cookies.access_token);
      socket.emit("currentUser:send", { currentUser });
    }
  }
};

export const authHandler = (io, socket) => {
  socket.on("user:signup", (payload) => {
    create(payload, socket, io);
  });
  socket.on("user:login", (payload) => {
    login(payload, socket, io);
  });
  socket.on("token:validate", (payload) => {
    tokenValidate(socket);
  });
  socket.on("user:current", (payload) => {
    getCurrentUser(socket);
  });
};
