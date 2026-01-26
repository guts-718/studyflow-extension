import {verifyAccessToken} from "../utils/jwt.js";

export default function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    console.log("auth ", auth);
    if (!auth) return res.status(401).json({ error: "Unauthorized" });

    const token = auth.split(" ")[1];

    try {
        const payload = verifyAccessToken(token);
        req.user = { userId: payload.userId };
        next();
    } catch {
        return res.status(401).json({ error: "Unauthorized" });
    }
};

