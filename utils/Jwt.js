import jwt from "jsonwebtoken";

const jwtSignIn = (data) => {
  return jwt.sign(data, process.env.JWT_SECRET);
};

const jwtVerify = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

const jwtDecode = (token) => {
  return jwt.decode(token);
};

export { jwtSignIn, jwtVerify, jwtDecode };
