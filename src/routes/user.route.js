import { Router } from "express";
import {
  changePassword,
  getCurrentUser,
  getUserChannelInfo,
  getWatchHIstory,
  loginUser,
  logoutUser,
  refreshAcessToken,
  registerUser,
  updateAvatar,
  updateCoverImage,
  updateUser,
  getUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
// import { verify } from "jsonwebtoken";

const router = Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/get-user", getUser);

//secured routes
router.post("/logout", verifyJWT, logoutUser);

router.post("/refresh-token", refreshAcessToken);
router.post("/change-password", verifyJWT, changePassword);

router.get("/current-user", verifyJWT, getCurrentUser);
router.patch("/update-user", verifyJWT, updateUser);
router.patch("/avatar", verifyJWT, upload.single("avatar"), updateAvatar);

router.patch(
  "/coverimage",
  verifyJWT,
  upload.single("coverImage"),
  updateCoverImage
);

router.get("/channel/:username", verifyJWT, getUserChannelInfo);
router.get("/watch-history", verifyJWT, getWatchHIstory);

export default router;
