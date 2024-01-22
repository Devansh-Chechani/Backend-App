import jwt from "jsonwebtoken"
import {User} from '../models/user.model.js'
import {ApiError} from '../utils/ApiError.js'
import {asyncHandler} from '../utils/asyncHandler.js'

export const verifyJWT = asyncHandler(async(req,res,next)=>{
   try{
        const token = req.cookies?.accessToken || 
     req.header("Authorisation")?.replace("Bearer ","")

     if(!token){
        throw new ApiError(402,"Invalid Token")
     }

     const decodedToken = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
     const user = await User.find(decodedToken?._id).select("-password -refreshToken")

     if(!user){
        throw new ApiError(401,"Invalid Access Token")
     }
     req.user = user
     next()
     }
     catch(err){
        throw  new ApiError(403,err.message)
     }
})