import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  addTweet,
  deleteTweet,
  getUserTweets,
  updateTweet,
} from "../controllers/tweet.controller.js";

const router = Router();

router.use(verifyJWT);

router.route("/").post(addTweet);

router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

router.route("/user/:userId").get(getUserTweets);

export default router;
