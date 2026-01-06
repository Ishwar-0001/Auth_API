const mongoose = require("mongoose");

const gameResultSchema = new mongoose.Schema(
  {
    gameId: {
      type: String,
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    resultNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

gameResultSchema.index({ gameId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("GameResult", gameResultSchema);
