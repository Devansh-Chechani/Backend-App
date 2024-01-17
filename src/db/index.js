import mongoose from 'mongoose'
//import {DB_NAME} from '../constants.js'

const connectDB = async()=>{
    try{
      const connectedInstance = await mongoose.connect(`${process.env.MONGODB_URI}`)
      console.log(`DB Connected Successfuly  !! : DB HOST :${connectedInstance.connection.host}`)
    }
    catch(err){
       console.log("MONGODB AUTH FAILED",err)
    }
  
}

export default connectDB;