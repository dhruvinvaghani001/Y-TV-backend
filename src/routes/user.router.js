import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  registerUser,
  updateUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/register",
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.post("/login", loginUser);

//secured routes
router.post("/logout", verifyJWT, logoutUser);

router.post("/refresh-token", refreshAcessToken);
router.get("/current-user", verifyJWT, getCurrentUser);

router.post("/chnage-password", verifyJWT, changePassword);
router.post("/edit-user", verifyJWT, updateUser);

export default router;
