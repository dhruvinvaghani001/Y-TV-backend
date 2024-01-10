import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comments.model.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const isLikedAllRedy = await Like.find({
    video: videoId,
    likedBy: req.user?._id,
  });

  if (isLikedAllRedy.length == 0) {
    const likeDoc = await Like.create({
      video: videoId,
      likedBy: req.user?._id,
    });
    return res.status(200).json(new ApiResponse(200, {}, "liked video!"));
  } else {
    const deleteDoc = await Like.findByIdAndDelete(isLikedAllRedy[0]._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "remove liked from video!"));
  }
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found!");
  }

  const isLikedAllRedy = await Like.find({
    comment: commentId,
    likedBy: req.user?._id,
  });

  if (isLikedAllRedy.length == 0) {
    const likeDoc = await Like.create({
      comment: commentId,
      likedBy: req.user?._id,
    });
    return res.status(200).json(new ApiResponse(200, {}, "liked comment!"));
  } else {
    const deleteDoc = await Like.findByIdAndDelete(isLikedAllRedy[0]._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "remove liked from comment!"));
  }
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "tweet not found!");
  }

  const isLikedAllRedy = await Like.find({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  if (isLikedAllRedy.length == 0) {
    const likeDoc = await Like.create({
      tweet: tweetId,
      likedBy: req.user?._id,
    });
    return res.status(200).json(new ApiResponse(200, {}, "liked tweet!"));
  } else {
    const deleteDoc = await Like.findByIdAndDelete(isLikedAllRedy[0]._id);
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "remove liked from tweet!"));
  }
});

const getlikedVideoes = asyncHandler(async (req, res) => {
  const userId = new mongoose.Types.ObjectId(req.user?._id);
  
  const pipline = [
    {
      '$match': {
        'video': {
          '$exists': true
        },
        'likedBy':userId,

      }
    }, {
      '$lookup': {
        'from': 'videos', 
        'localField': 'video', 
        'foreignField': '_id', 
        'as': 'result'
      }
    }, {
      '$addFields': {
        'video': {
          '$first': '$result'
        }
      }
    }, {
      '$project': {
        'video': 1
      }
    }
  ]

  const videoes = await Like.aggregate(pipline);

  if (videoes.length == 0) {
    throw new ApiError(404, "No Liked videos !");
  }
  res.status(200).json(new ApiResponse(200, videoes, "liked videoes!"));
});

export { toggleCommentLike, toggleVideoLike, toggleTweetLike, getlikedVideoes };
