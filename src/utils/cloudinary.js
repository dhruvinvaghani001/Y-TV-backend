import { v2 as cloudinary } from "cloudinary";
import { extractPublicId } from "cloudinary-build-url";
import fs from "fs";
import dotenv from "dotenv";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      return null;
    }
    //upload the file on clodinarry
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: "youtube",
    });
    //file has been uploaded successfully
    // console.log("file is uploaded on cloudinary");
    // console.log(response.url);
    fs.unlinkSync(localFilePath);
    // console.log("clodinary responmse:",response);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath); //remove the localy saved temp file as the upload failed
    return null;
  }
};

const deleteImageOnCloudinray = async (publicId) => {
  try {
    cloudinary.api
      .delete_resources([publicId], { type: "upload", resource_type: "image" })
      .then(console.log);
  } catch (error) {
    console.log(error);
  }
};

const getPublicId = (url) => {
  try {
    const publicId = extractPublicId(url);
    return publicId;
  } catch (error) {
    console.log("cant get public id ", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteImageOnCloudinray, getPublicId };
