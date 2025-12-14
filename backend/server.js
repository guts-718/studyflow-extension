import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();



const app = express();
app.use(cors());
app.use(express.json());

const PORT=process.env.PORT;
// await so so important here
await mongoose.connect(process.env.MONGO_URI)
    .then(()=> console.log("mongodb connected"))
    .catch(err => console.error(err));

const Highlight = mongoose.model("Highlight", new mongoose.Schema({
    userId: String,
    file: String,
    text: String,
    color: String,
    url: String,
    timestamp: Number,
    clientId: String
}));

app.post("/sync/highlights", async (req, res) => {
    const highlights = req.body.highlights;

    if (!Array.isArray(highlights)) {
        return res.status(400).json({ error: "Invalid payload" });
    }
    
    await Highlight.insertMany(highlights);
    res.status(200).json({ success: true });
});

app.listen(PORT, () => console.log("API running on 3000"));
