//import * as config from '../config'
const config = require('../config')
const mongoose = require('mongoose');
const { Schema } = require('mongoose')


let dbUrl = 'mongodb+srv://admin:Password1@cluster0.qooxs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'

//mongodb+srv://admin:Password1@cluster0.qooxs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority

//if (process.env.NODE_ENV === 'production') {
//    dbUrl = config.mongoProdUri;
//}

//Listening for mongoose connection events
mongoose.connection.on('connected', () => {
    console.log(`Mongoose connected to ${dbUrl}`);
});
mongoose.connection.on('error', err => {
    console.log('Mongoose connection error:', err);
});
mongoose.connection.on('disconnected', () => {
    console.log('Mongoose disconnected');
});

//mongoose.connect('mongodb+srv://admin:Password1@cluster0.qooxs.mongodb.net/myFirstDatabase?retryWrites=true&w=majority')
//mongoose.connect('mongodb://localhost:27917/hotel', {useNewUrlParser: true});

// Connect to database
mongoose.connect(dbUrl, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true
});

// Listen for signals to shutdown, so we can close the connection to the database
const gracefulShutdown = (msg, callback) => {
    mongoose.connection.close(() => {
        console.log(`Mongoose disconnected through ${msg}`);
        callback();
    });
};

// Mongoose Schemas
const HotelSchema = new Schema({
    name: String,
    room: { type: Schema.Types.ObjectId, ref: 'room'}
})
mongoose.model("hotel", HotelSchema)

const RoomSchema = new Schema({
    number: Number,
    available: Boolean,
    roomtype: String, //enum: standard, standard plus, suite,  junior, loft
    extras: String, //enum: baby crip, early check-in, late departure
    user: { type: Schema.Types.ObjectId, ref: 'user' }
})
mongoose.model("room", RoomSchema)

const UserSchema = new Schema({
    email: String,
    password: String,
    firstname: String,
    lastname: String,
    role: String
})
mongoose.model("user", UserSchema)

console.log("HULUBULU")


