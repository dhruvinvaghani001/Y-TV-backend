import { Router } from "express";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { getUserChannelSubscriber, getUserSubscribedChannel, toggleSubscribe } from "../controllers/subscription.controller.js";

const router = Router();
router.use(verifyJWT);

router
  .route("/c/:channelId")
  .get(getUserSubscribedChannel)
  .post(toggleSubscribe);

router.route("/u/:channelId").get(getUserChannelSubscriber);

export default router;
