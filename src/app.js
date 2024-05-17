import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config({
  path: "./.env",
});

const app = express();

app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5174"],
    credentials: true,
  })
);

app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      errors: err.errors,
    });
  } else {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

//importing router
import userRouter from "./routes/user.route.js";
import viedoRouter from "./routes/video.route.js";
import tweetRouter from "./routes/tweet.route.js";
import commentRouter from "./routes/comment.route.js";
import likeRouter from "./routes/like.route.js";
import playlistRouter from "./routes/playlist.route.js";
import subscribtionRouter from "./routes/subscription.route.js";
import healthchekcRouter from "./routes/healthcheck.route.js";
import dashboardRouter from "./routes/dashboard.route.js";

// Error handling middleware

app.use("/videos", express.static("videos"));

app.use("/api/users", userRouter);

app.use("/api/video", viedoRouter);

app.use("/api/tweets", tweetRouter);

app.use("/api/comment", commentRouter);

app.use("/api/like", likeRouter);

app.use("/api/playlist", playlistRouter);

app.use("/api/subscribe", subscribtionRouter);

app.use("/api/dashboard", dashboardRouter);

app.use("/api/healthcheck", healthchekcRouter);

export default app;
