import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, index: true },
    passwordHash: String,
    createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
