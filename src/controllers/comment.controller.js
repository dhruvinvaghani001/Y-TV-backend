import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Comment } from "../models/comments.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const getCommetsByVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $limit: page * limit,
    },
  ]);

  if (comments.length == 0) {
    throw new ApiError(500, "commets not found!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched successfully!"));
});

const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { videoId } = req.params;

  if (!content) {
    throw new ApiError(400, "content is required to comment!");
  }

  const newComment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  if (!newComment) {
    throw new ApiError(500, "Error while creating comment!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, newComment, "comment created successfully!"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if ((comment.owner).toString() != (req.user?._id).toString()) {
    throw new ApiError(401, "Unauthorised user!");
  }

  if (!content) {
    throw new ApiError(400, "content required!");
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    {
      $set: {
        content,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedComment) {
    throw new ApiError(500, "error while updating comments");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "comment updated successfully!")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }
  if ((comment.owner).toString() != (req.user?._id).toString()) {
    throw new ApiError(401, "Unauthorised user!");
  }
  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    throw new ApiError(500, "Error while deleting comment!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "comment deleted successfully!"));
});

export { getCommetsByVideo, addComment, updateComment, deleteComment };
