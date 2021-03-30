//import dotenv from 'dotenv';


//const dotenv = require('dotenv');

//dotenv.config();

//require('dotenv').config()

console.log("dotenv:")

//export 
const isDev = process.env.NODE_ENV !== 'production';
exports.isDev = isDev;
//export 
const port = process.env.PORT;
exports.port = port 
//export 
const mongoDevUri = process.env.MONGODB_DEV_URI;
exports.mongoDevUri = mongoDevUri
//export 
const mongoProdUri = process.env.MONGODB_PROD_URI;
exports.mongoProdUri = mongoProdUri

const JWT_SECRET = process.env.JWT_SECRET;
exports.JWT_SECRET = JWT_SECRET