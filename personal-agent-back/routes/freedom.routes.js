// routes/freedom.routes.js

const { Router } = require("express");
const {
  createFreedomTimeBlocks,
  getTodaySchedule,
  updateFreedomBlock,
  approveAllBlocks,
  deleteBlock,
  setBlockAlarm,
  setBlockTaskMagic,
} = require("../controllers/freedomBlocks.controller");
const { isAuthenticated } = require("../middleware/auth");

const router = Router();

router.post("/", isAuthenticated, createFreedomTimeBlocks);
router.get("/today", isAuthenticated, getTodaySchedule);
router.put("/:id", isAuthenticated, updateFreedomBlock);
router.post("/approveAll", isAuthenticated, approveAllBlocks);
router.delete("/:id", isAuthenticated, deleteBlock);
router.post("/:id/phoneAlarm", isAuthenticated, setBlockAlarm);
router.post("/:id/taskMagic", isAuthenticated, setBlockTaskMagic);

module.exports = router;
