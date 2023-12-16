import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
    //get details from frotend
    const {username,email,fullname,password} = req.body;
    console.log(email);
    //validation
    //user alredy exist
    //avtar file and cover file 
    //upload on cloudinary 
    //create user object and create entry in mongodb 
    // remove password and refresh token  
    //res is there or n ot 

});

export { registerUser };
