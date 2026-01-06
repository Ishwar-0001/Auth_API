const GameResult = require("../models/GameResult");

exports.addSingleGameResult = async (req, res) => {
  try {
    const { gameId, date, resultNumber } = req.body;

    // 🔒 Required fields check
    if (!gameId || !date || !resultNumber) {
      return res.status(400).json({
        success: false,
        message: "gameId, date and resultNumber are required",
      });
    }

    // ✅ Strict DD-MM-YYYY validation
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-(\d{4})$/;

    if (!dateRegex.test(date)) {
      return res.status(400).json({
        success: false,
        message: "Date must be in DD-MM-YYYY format",
      });
    }

    // ✅ Save AS-IS (STRING)
    const result = await GameResult.create({
      gameId,
      date, // 👈 stored exactly like "01-01-2026"
      resultNumber,
    });

    res.status(201).json({
      success: true,
      message: "Game result added successfully",
      data: result,
    });

  } catch (error) {
    // 🚫 Duplicate entry (gameId + date)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Result already exists for this game & date",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};



exports.getAllGameResults = async (req, res) => {
  try {
    const results = await GameResult.aggregate([
      {
        $sort: { gameId: 1, date: 1 }, // sort inside group
      },
      {
        $group: {
          _id: "$gameId",
          results: {
            $push: {
              _id: "$_id",
              gameId: "$gameId",
              date: "$date",
              resultNumber: "$resultNumber",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          gameId: "$_id",
          results: 1,
        },
      },
    ]);

    res.status(200).json({
      success: true,
      totalGames: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch game results",
      error: error.message,
    });
  }
};



