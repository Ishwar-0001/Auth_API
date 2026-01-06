const express = require("express");
const router = express.Router();

const {
  addSingleGameResult,
   getAllGameResults,
} = require("../controllers/gameResult.controller");
const { verifyToken } = require('../middlewares/auth.middleware');

router.post("/game-results/add",verifyToken, addSingleGameResult);

router.get("/game-results",getAllGameResults);

module.exports = router;
