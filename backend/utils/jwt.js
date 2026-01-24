//import jwt from "jsonwebtoken";
import jwt from "jsonwebtoken";


import dotenv from "dotenv";

const ACCESS_TOKEN_EXPIRY = "15m";

dotenv.config();

console.log("JWT_SECRET:", process.env.JWT_SECRET);

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
}

export function signAccessToken(userId) {
    try {
        console.log("signing token for:", userId);
        const token = jwt.sign(
            { userId },
            process.env.JWT_SECRET,
            { expiresIn: ACCESS_TOKEN_EXPIRY }
        );
        return token;
    } catch (err) {
        console.error("JWT SIGN ERRO:", err);
        throw err;
    }
}

export function verifyAccessToken(token) {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch {
        return null;
    }
}
