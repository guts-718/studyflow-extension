import mongoose from "mongoose";
const refreshTokenSchema = new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    tokenHash: String,
    deviceId: String,
    expiresAt: Date
});

export default mongoose.model("RefreshToken", refreshTokenSchema);
