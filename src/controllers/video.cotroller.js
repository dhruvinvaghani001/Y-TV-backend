import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteOnCloudinray,
  getPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  const videos = await Video.aggregate([
    {
      $match: {
        query,
      },
    },
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $sort: {
        [sortBy]: sortType == "asc" ? 1 : -1,
      },
    },
    {
      $limit: limit * page,
    },
  ]);

  if (!videos) {
    throw new ApiError(404, "No videos found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "video fetched successfully !"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "vedio get succeessfully !"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() == "")) {
    throw new ApiError(400, "All fields are required !");
  }

  const thumbnailLocalPath = req.files?.thumbnail[0].path;
  const videoFileLocalPath = req.files?.videoFile[0].path;

  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required !");
  }
  if (!videoFileLocalPath) {
    throw new ApiError(400, "video file is required !");
  }

  const responseThumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  const responseVideoFile = await uploadOnCloudinary(videoFileLocalPath);

  if (!responseThumbnail && !responseThumbnail) {
    throw new ApiError(
      500,
      "could not upload video and thumbnail on cloudinary!"
    );
  }

  const video = await Video.create({
    title: title,
    description,
    videoFile: responseVideoFile.url,
    thumbnail: responseThumbnail.url,
    duration: responseVideoFile.duration,
    owner: req.user?._id,
  });

  const newVideo = await Video.findById(video._id).select("-owner");

  if (!newVideo) {
    throw new ApiError(500, "something went wrong in publishing video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "video published succeessfully !"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!title && !description) {
    throw new ApiError(400, "All fields are required");
  }

  const videoC = await Video.findById(videoId);
  if (!videoC) {
    throw new ApiError(404, "video not found !");
  }

  if (videoC.owner != req.user?._id) {
    throw new ApiError(401, "Unauthorised user!");
  }

  const thumbnailLocalFilePath = req.file?.path;

  if (thumbnailLocalFilePath) {
    var response = await uploadOnCloudinary(thumbnailLocalFilePath);
    console.log(response);
    if (!response.url) {
      throw new ApiError(500, "error while uploadnig in cloudinray");
    }
  }
  const video = await Video.findById(videoId);
  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: response?.url ? response.url : video.thumbnail,
      },
    },
    {
      new: true,
    }
  );

  if (!updatedVideo) {
    throw new ApiError(500, "error while updating video!");
  }

  const publicId = getPublicId(video.thumbnail);
  const deleteres = response?.url ? await deleteOnCloudinray(publicId) : null;

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "update viodeo successfully !"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const videoC = await Video.findById(videoId);
  if (!videoC) {
    throw new ApiError(404, "video not found !");
  }

  if (videoC.owner != req.user?._id) {
    throw new ApiError(401, "Unauthorised user!");
  }
  const deltedVideo = await Video.findByIdAndDelete(videoId);

  const thumbnailPublicId = getPublicId(deltedVideo.thumbnail);
  const videoPublicId = getPublicId(deltedVideo.videoFile);

  const deleteThumbanilResponse = await deleteOnCloudinray(thumbnailPublicId);
  const deletedVideoResponse = await deleteOnCloudinray(videoPublicId, "video");

  return res
    .status(200)
    .json(new ApiResponse(200, deltedVideo, "deleted successfully !"));
});

const getUserVideo = asyncHandler(async (req, res) => {
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
  ]);

  if (videos.length == 0) {
    throw new ApiError(404, "No videos Found!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "All videos of user"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found !");
  }

  if (video.owner != req.user?._id) {
    throw new ApiError(401, "Unauthorised user!");
  }
 
  video.isPublished = !video.isPublished;
  await video.save();

  return res.status(200).json(new ApiResponse(200, "toggled state of publish"));
});

export {
  getAllVideos,
  getVideoById,
  publishVideo,
  updateVideo,
  deleteVideo,
  getUserVideo,
  togglePublishStatus,
};
