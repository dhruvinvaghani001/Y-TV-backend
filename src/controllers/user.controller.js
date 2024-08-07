import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  deleteOnCloudinray,
  getPublicId,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const genrateAcessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.log(error);
    throw new ApiError(500, "something went wrong while genrating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get details from frontend
  const { username, email, fullname, password } = req.body;
  //validation
  console.log(username, email, password, fullname);
  if (
    [username, email, password, fullname].some(
      (field) => field?.trim() === undefined
    )
  ) {
    throw new ApiError(400, "All fields are required !");
  }
  //user alredy exist
  const existUserPipeline = [
    {
      $match: {
        $or: [
          {
            username: username,
          },
          {
            email: email,
          },
        ],
      },
    },
  ];

  const existedUser = await User.aggregate(existUserPipeline);
  console.log(existedUser);
  if (existedUser.length > 0) {
    throw new ApiError(409, "User with email or username already exists");
  }
  // console.log("files:",req.files);
  //avtar file and cover file
  // const avatarLocalPath = req.files?.avatar[0].path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  // let coverImageLocalPath = "";
  // if (
  //   req.files &&
  //   Array.isArray(req.files.coverImage) &&
  //   req.files.coverImage.length > 0
  // ) {
  //   coverImageLocalPath = req.files.coverImage[0].path;
  // }

  // if (!avatarLocalPath) {
  //   throw new ApiError(400, "Avatar is required ");
  // }
  //upload on cloudinary
  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  // const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  // if (!avatar) {
  //   throw new ApiError(400, "Avatar file is required");
  // }
  //create user object and create entry in mongodb
  const user = await User.create({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
    avatar: `https://avatars.abstractapi.com/v1/?api_key=d232541fdfc546d989ad961e58f4c5a3&name=${username}`,
    coverImage: "",
  });

  //remove password and refrewshtoken
  const createdUser = await User.find({ _id: user._id }).select(
    "-password -refreshtoken"
  );

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registration");
  }
  //res is there or n ot
  return res
    .status(200)
    .json(new ApiResponse(200, createdUser[0], "user registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body get data

  const { email, password } = req.body;
  // console.log(username, email);
  if (!email) {
    throw new ApiError(400, "email si required required");
  }
  if (!password) {
    throw new ApiError(400, "password required");
  }

  const user = await User.findOne({ $or: [{ email }] });

  if (!user) {
    throw new ApiError(404, "user does not exists");
  }

  const passCheck = await user.isPasswordCorrect(password);

  if (!passCheck) {
    throw new ApiError(401, "Invalid user credential");
  }

  const { refreshToken, accessToken } = await genrateAcessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const userTosend = loggedInUser._doc;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...loggedInUser._doc,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
      "User logged in successfully"
    )
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("acessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User Logged Out !"));
});

const refreshAcessToken = asyncHandler(async (req, res) => {
  try {
    const incomingtoken = req.cookies?.refreshToken || req.body.refreshToken;

    if (!incomingtoken) {
      throw new ApiError(401, "unathorised request");
    }
    const decodedData = jwt.verify(
      incomingtoken,
      processs.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedData?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (user?.refreshToken !== incomingtoken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken } = await genrateAcessAndRefreshToken(
      user._id
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("acessToken", accessToken)
      .cookie("refreshToken", refreshToken)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "invalid token ");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "UNathorised user");
  }
  const passCheck = await user.isPasswordCorrect(oldPassword);
  if (!passCheck) {
    throw new ApiError(400, "Password is not correct");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password change successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "current user fetched"));
});

const updateUser = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "All fields are required");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "account detail chnaged successfully"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const avatarLocalpath = req.file?.path;
  const oldAvatarUrl = req.user?.avatar;

  const oldAvatarpublicId = getPublicId(oldAvatarUrl);

  if (!avatarLocalpath) {
    throw new ApiError(400, "avatar file required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalpath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading on clodinary");
  }

  const responseOfDelete = await deleteOnCloudinray(oldAvatarpublicId);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar chnaged successfully"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  const oldCoverImageUrl = req.user?.coverImage;

  const oldCOverImagePublicId = getPublicId(oldCoverImageUrl);

  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover image file required");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading on cloudinary");
  }
  const deleteResponse = deleteOnCloudinray(oldCOverImagePublicId);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully"));
});

const getUserChannelInfo = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username not found");
  }

  const channelInfo = await User.aggregate([
    {
      $match: {
        username: username?.trim(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscriberCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullname: 1,
        username: 1,
        subscriberCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channelInfo?.length) {
    throw new ApiError(404, "channel does not exist");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        channelInfo[0],
        "user channel info fetched successfully"
      )
    );
});

const getWatchHIstory = asyncHandler(async (req, res) => {
  const user = User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistroy",
        foreignField: "_id",
        as: "WatchHistory",
        pipeline: [
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
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watch histroy get successfully"
      )
    );
});

const getUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.aggregate([
    {
      $match: {
        email: email,
      },
    },
  ]);
  const existUser = user[0];
  console.log(existUser);
  if (!existUser) {
    throw new ApiError(404, "user does nmot found!");
  }

  const passCheck = await bcrypt.compare(password, existUser.password);
  if (passCheck) {
    return res
      .status(200)
      .json(new ApiResponse(200, existUser, "user get successfully!"));
  } else {
    throw new ApiError(409, "incorrrect password");
  }
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAcessToken,
  changePassword,
  getCurrentUser,
  updateUser,
  updateAvatar,
  updateCoverImage,
  getUserChannelInfo,
  getWatchHIstory,
  getUser,
};
