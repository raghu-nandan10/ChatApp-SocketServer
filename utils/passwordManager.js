import bcrypt from "bcrypt";
import { getUserFromDB } from "../handlers/auth.js";
const hashPassword = async (password) => {
  try {
    const hash = await bcrypt.hash(password, 10);
    return hash;
  } catch (error) {
    return error;
  }
};

const verifyPassword = async (hash, password) => {
  console.log({ hash, password });
  try {
    const result = await bcrypt.compare(password, hash);
    console.log({ result });
    return result;
  } catch (error) {
    return error;
  }
};

export { hashPassword, verifyPassword };
