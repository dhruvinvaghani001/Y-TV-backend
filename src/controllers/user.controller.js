import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const registerUser = asyncHandler(async (req, res) => {
  //get details from frotend
  const { username, email, fullname, password } = req.body;

  //validation
  if (
    [username, email, password, fullname].some((field) => field?.trim() == "")
  ) {
    throw new ApiError(400, "All fields are required !");
  }
  //user alredy exist
  const existedUser = await User.findOne({
    $or: [{ username, email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  // console.log("files:",req.files);
  //avtar file and cover file
  const avatarLocalPath = req.files?.avatar[0].path;
  // const coverImageLocalPath = req.files?.coverImage[0].path;
  let coverImageLocalPath="";
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required ");
  }
  //upload on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }
  //create user object and create entry in mongodb
  const user = await User.create({
    fullname,
    email,
    password,
    username: username.toLowerCase(),
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
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
    .json(new ApiResponse(200, createdUser, "user registered successfully"));
});

export { registerUser };
