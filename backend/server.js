import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authMiddleware from "./middlewares/auth.js"
import bcrypt from "bcrypt";
import crypto from "crypto";
import User from "./models/User.js";
import RefreshToken from "./models/RefreshToken.js";
import {signAccessToken} from  "./utils/jwt.js";
import dns from "node:dns/promises";
dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

dns.setServers(["1.1.1.1"]);
const PORT=process.env.PORT;
// await so so important here
console.log("MONGO_URI =", process.env.MONGO_URI);

await mongoose.connect(process.env.MONGO_URI)
    .then(()=> console.log("mongodb connected"))
    .catch(err => console.error(err));

const Items = mongoose.model("Items", new mongoose.Schema({
    userId: String,
    file: String,
    text: String,
    color: String,
    url: String,
    timestamp: Number,
    clientId: String,
    type: String
}));

// app.post("/sync/items", async (req, res) => {
//     const highlights = req.body.highlights;

//     if (!Array.isArray(highlights)) {
//         return res.status(400).json({ error: "Invalid payload" });
//     }
    
//     await Highlight.insertMany(highlights);
//     res.status(200).json({ success: true });
// });

app.get("/files", async (req, res) => {
    const files = await Items.distinct("file");
    res.json(files);
});

app.get("/items", authMiddleware, async (req, res) => {
    const bodyy = await Items.find({
        userId: req.user.userId
    });
    res.json(bodyy);
});



app.post("/sync/items", authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    console.log("")
    const bodyy = req.body.items.map(h => ({
        ...h,
        userId
    }));

    await Items.insertMany(bodyy, { ordered: false });
    res.json({ success: true });
});

app.get("/sync/items", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const items = await Items.find({ userId }).lean();

    res.json(items);
  } catch (err) {
    console.error("Fetch items failed:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});




app.post("/auth/signup", async (req, res) => {
    const { email, password, deviceId } = req.body;
    console.log("email, password, device", email, password, deviceId);

    try {
        const existing = await User.findOne({ email });
        if (existing) {
            console.log(email, password, deviceId, existing);
            return res.status(409).json({ error: "Unable to create account" });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        console.log("passhash",passwordHash);
        const user = await User.create({ email, passwordHash });
        console.log("user: ",user);
        console.log("user_id: ",user._id);
        console.log("signactiontoken",signAccessToken);
        const accessToken = signAccessToken(user._id);
        console.log("access: ",accessToken);
        
        const refreshTokenRaw = crypto.randomBytes(64).toString("hex");
        console.log("refresh, ", refreshTokenRaw); 
        const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 12);
        console.log("refreshtokenhash", refreshTokenHash);

        await RefreshToken.create({
            userId: user._id,
            tokenHash: refreshTokenHash,
            deviceId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        res.json({ accessToken, refreshToken: refreshTokenRaw });
    } catch(e){
        res.status(500).json({ error: "Signup failed", messageError:e });
    }
});


app.post("/auth/login", async (req, res) => {
    const { email, password, deviceId } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const accessToken = signAccessToken(user._id);

        const refreshTokenRaw = crypto.randomBytes(64).toString("hex");
        const refreshTokenHash = await bcrypt.hash(refreshTokenRaw, 12);

        await RefreshToken.create({
            userId: user._id,
            tokenHash: refreshTokenHash,
            deviceId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        res.json({ accessToken, refreshToken: refreshTokenRaw });
    } catch {
        res.status(500).json({ error: "Login failed" });
    }
});



app.post("/auth/refresh", async (req, res) => {
    const { deviceId, refreshToken } = req.body;

    const record = await RefreshToken.findOne({ deviceId });
    if (!record || record.expiresAt < new Date()) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const ok = await bcrypt.compare(refreshToken, record.tokenHash);
    if (!ok) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const accessToken = signAccessToken(record.userId);
    res.json({ accessToken });
});

app.listen(PORT, () => console.log(`API running on ${PORT}`));
