import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteOnCloudinray,
  getPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import { exec } from "child_process";
import { v2 as cloudinary } from "cloudinary";

const getAllVideos = asyncHandler(async (req, res) => {
  let { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

  page = isNaN(page) ? 1 : Number(page);
  limit = isNaN(page) ? 10 : Number(limit);

  //because 0 is not accepatabl ein skip and limit in aggearagate pipelien
  if (page < 0) {
    page = 1;
  }
  if (limit <= 0) {
    limit = 10;
  }

  const matchStage = {};
  if (userId && isValidObjectId(userId)) {
    matchStage["$match"] = {
      owner: new mongoose.Types.ObjectId(userId),
    };
  } else if (query) {
    matchStage["$match"] = {
      $or: [
        { title: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ],
    };
  } else {
    matchStage["$match"] = {};
  }
  if (userId && query) {
    matchStage["$match"] = {
      $and: [
        { owner: new mongoose.Types.ObjectId(userId) },
        {
          $or: [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
          ],
        },
      ],
    };
  }

  const sortStage = {};
  if (sortBy && sortType) {
    sortStage["$sort"] = {
      [sortBy]: sortType === "asc" ? 1 : -1,
    };
  } else {
    sortStage["$sort"] = {
      createdAt: -1,
    };
  }

  const skipStage = { $skip: (page - 1) * limit };
  const limitStage = { $limit: limit };

  const videos = await Video.aggregate([
    matchStage,
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              fullname: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    sortStage,
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: limit,
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likes: {
          $size: "$likes",
        },
      },
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
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is invalid or requied");
  }

  let video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found");
  }

  video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $project: {
              username: 1,
              fullname: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $addFields: {
        owner: {
          $first: "$owner",
        },
        likes: {
          $size: "$likes",
        },
      },
    },
    {
      $addFields: {
        views: {
          $add: [1, "$views"],
        },
      },
    },
  ]);

  if (video.length != 0) {
    video = video[0];
  }
  await Video.findByIdAndUpdate(videoId, {
    $set: {
      views: video.views,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "vedio get succeessfully !"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title or description is required!!!");
  }
  // const uniqueId = uuidv4();
  // const outputPath = `./videos/${uniqueId}`;
  // const hlsPath = `${outputPath}/index.m3u8`;

  // if (!fs.existsSync(outputPath)) {
  //   fs.mkdirSync(outputPath, { recursive: true });
  // }
  // console.log("VIDEOPATH", videoPath);
  // const ffmpegCommand = `ffmpeg -i ${videoPath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outputPath}/segment%03d.ts" -start_number 0 ${hlsPath}`;

  // exec(ffmpegCommand, (error, stdout, stderr) => {
  //   if (error) {
  //     console.error(`exec error: ${error}`);
  //     return;
  //   }
  //   console.log(`stdout: ${stdout}`);
  //   console.log(`stderr: ${stderr}`);
  //   res.json({
  //     message: "Video converted to HLS format",
  //     // videoUrl: videoUrl,
  //     // lessonId: lessonId,
  //   });
  // });
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
    videoFile: responseVideoFile.playback_url,
    thumbnail: responseThumbnail.url,
    duration: responseVideoFile.duration,
    owner: new mongoose.Types.ObjectId(req.user?._id),
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

  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is required or invalid !");
  }

  if (!title && !description) {
    throw new ApiError(400, "All fields are required");
  }

  const videoC = await Video.findById(videoId);
  if (!videoC) {
    throw new ApiError(404, "video not found !");
  }

  if (videoC.owner.toString() != (req.user?._id).toString()) {
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

  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is required or invalid !");
  }

  const videoC = await Video.findById(videoId);
  if (!videoC) {
    throw new ApiError(404, "video not found !");
  }

  if (videoC.owner.toString() != (req.user?._id).toString()) {
    throw new ApiError(401, "Unauthorised user!");
  }
  const deltedVideo = await Video.findByIdAndDelete(videoId);

  const thumbnailPublicId = getPublicId(deltedVideo.thumbnail);
  const videoPublicId = getPublicId(deltedVideo.videoFile);

  if (delResponse) {
    await Promise.all([
      Like.deleteMany({ video: _id }),
      Comment.deleteMany({ video: _id }),
      deleteOnCloudinray(videoPublicId, "video"),
      deleteOnCloudinray(thumbnailPublicId),
    ]);
  } else {
    throw new ApiError(500, "Something went wrong while deleting video");
  }

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
  if (!videoId.trim() || !isValidObjectId(videoId)) {
    throw new ApiError(400, "video id is required or invalid !");
  }
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "video not found !");
  }

  if (video.owner.toString() != (req.user?._id).toString()) {
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
