import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token =
      req.cookies?.acessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodeddata = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodeddata?._id).select(
      "-password -refreshToken"
    );
    if (!user) {
      throw new ApiError(401, "UNauthorized request");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(400, "token invalid or expired");
  }
});


export {verifyJWT};