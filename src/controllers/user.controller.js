import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}
 
const registerUser = asyncHandler(async(req,res)=>{
   // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    //console.log("email: ", email);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
   // console.log(req.files)
    

     
    

const filePath = req.files?.avatar[0]?.path;
//console.log(filePath)

// Replace backslashes with forward slashes
const avatarLocalPath = filePath.replace(/\\/g, '/');

//console.log(avatarLocalPath);


    
   // console.log(avatarLocalPath )
   //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "AvatarLocalPath file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    // console.log(avatar)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // if (!avatar) {
    //     throw new ApiError(400, "Avatar file is required")
    // }
   

    const user = await User.create({
        fullName,
        avatar: avatar?.url || "",
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, username, password} = req.body
    console.log(email);

    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    const options = {
    httpOnly:true,
    secure:true
   }
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
             refreshToken:undefined
            }
        },
        {
          new:true
        }

      
     )
      return res.status(200)
   .clearCookie("accessToken",accessToken,options)
   .clearCookie("refreshToken",refreshToken,options)
   .json(200,{},"User logged Out Successfully")


})


const refreshAccessToken = asyncHandler(async(req,res)=>{
          try{
              const incomingRefreshToken = req.cookies.refreshToken ||req.body.refreshToken

            if(!incomingRefreshToken){
                throw new ApiError(402," RefreshToken Token not sent")
            }

        const decodedToken =  jwt.verify(token,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedToken?._id)

        if( incomingRefreshToken !== user.refreshToken){
              throw new ApiError(402," Invalid refresh token ")
        }
          
       const {accessToken,newRefreshToken} =  generateAccessAndRefereshTokens(user._id)
    
       const options = {
          httpOnly:true,
          secure:true

       }
        return  res.status(200)
   .Cookie("accessToken",accessToken,options)
   .Cookie("refreshToken",newRefreshToken, options)
   .json(
        200,
        {
            accessToken,refreshToken:newRefreshToken
        },
        "AccessToken refreshed"
    )

          }
          catch(err){
             throw new ApiError(402,err?.message|| "Token Mistake")
          }


})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
   const {oldPassword,newPassword} = req.body

      const user = await User.findById(req.user?._id)
      const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

      if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid Password")
      }

      user.save({validateBeforeSave:false})

      return res.json(
        new ApiResponse(200,{},"password Changed Successfully")
      )
              
   
})

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});

const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})

 export {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword} ;


