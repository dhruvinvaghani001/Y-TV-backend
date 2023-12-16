import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router = Router();

router.get("/h",registerUser);

export default router;