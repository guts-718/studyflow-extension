export default function authMiddleware(req, res, next) {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "No token" });

    const token = auth.split(" ")[1];

    try {
        // TEMP: fake decode (replace with jwt.verify later)
        req.user = { userId: token }; 
        next();
    } catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
