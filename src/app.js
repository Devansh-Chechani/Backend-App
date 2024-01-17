import express, { urlencoded } from 'express';
import cors from "cors"
import cookieParser from "cookie-parser"


const app = express();

app.use(cors({
    origin:process.env.CROSS_ORIGIN,
    credentials:true
}))
app.use(express.json({limit:'16Kb'}));
app.use(express.urlencoded({extended:true,limit:'16Kb'} ))
app.use(express.static("public"))
app.use(cookieParser())

import userRouter from './routes/user.route.js'

app.use('/api/v1/users',userRouter)


export default app;