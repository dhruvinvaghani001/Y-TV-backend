import { asyncHandler } from "../utils/asyncHandler.js";
import { Tweet } from "../models/tweet.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const addTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (!content) {
    throw new ApiError(400, "content is required to tweet !");
  }

  const newTweet = await Tweet.create({
    content,
    owner: req.user?._id,
  });

  if (!newTweet) {
    throw new ApiError(500, "Error while creating Tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newTweet, "Tweet created successfully !"));
});

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "tweet not found!");
  }
   
  if ((tweet.owner).toString() != (req.user?._id).toString()) {
    throw new ApiError(401, "Unauthorised user!");
  }

  if (!content) {
    throw new ApiError(400, "content is required!");
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedTweet) {
    throw new ApiError(500, "error while updating tweet");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "updated Tweet succssfully"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "tweet not found!");
  }
  if ((tweet.owner).toString() != (req.user?._id).toString()) {
    throw new ApiError(401, "Unauthorised user!");
  }
  const deletedTweet = await Tweet.findByIdAndDelete(tweetId);

  if (!deleteTweet) {
    throw new ApiError(400, "error while deleting tweet!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "deleted tweet succssfully!"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
  ]);

  if (tweets.length == 0) {
    throw new ApiError(400, "No tweets Available");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fetched successfully !"));
});

export { addTweet, updateTweet, deleteTweet, getUserTweets };
