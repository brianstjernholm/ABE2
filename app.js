
//#region ///////////////// IMPORTS ///////////////////////
require('dotenv').config()
require('./models/db')
const config = require('./config')

//JWT
const jwt = require('jsonwebtoken')

//Apollo
const { ApolloServer } = require('apollo-server-express')

//Graphql
const { composeWithMongoose } = require('graphql-compose-mongoose')
const { schemaComposer } = require('graphql-compose')

//Mongoose
const mongoose = require('mongoose')

//Express
const express = require('express')
//#endregion



//requirering mongoose models
const Hotel = mongoose.model('hotel')
const Room = mongoose.model('room')
const User = mongoose.model('user')

///// ADDING MIDDLEWARE FOR AUTH /////
//Middelware
const isAuth = (req, res, next) => {
  //https://stackoverflow.com/questions/55058851/unable-to-retrieve-value-added-to-req-object-via-middleware
  let decodedToken;
  const authHeader = req.headers.authorization //get('authorization');
  if(!authHeader) {
    req.isAuth = false;
    return next();
  }
  const token = authHeader.slice(7);
  if(!token || token === '') {
    req.isAuth = false;
    return next();
  }
  try{
    decodedToken = jwt.verify(token, config.JWT_SECRET)
  } catch (err){
    req.isAuth = false;
    return next();
  }
  if(!decodedToken) {
    req.isAuth = false;
    return next();
  }
  req.isAuth = true;
  req._id = decodedToken.userId;
  return next();
};

async function authMiddleware(resolve, source, args, context, info) {
  if (checkAuthInContext(context)) {
     return resolve(source, args, context, info);
  }
  throw new Error('You must be authorized');
};

//authCheck
function checkAuthInContext(context){
  console.log("CHECKAUTH", context);
  console.log("auth" + context.req._id)
  if(context.req.isAuth){
    tokenUserId = context.req._id;
    if(tokenUserId) {
      userId = findUser(tokenUserId)
      //userId = await User.findOne({ _id: tokenUserId });
    }
    if(!userId){
      return false;
    }  
    return true;
  }
};
async function findUser(id){
  return userId = await User.findOne({ _id: tokenUserId });
}

//Method for autogenerating resolvers(queries/mutations) based on mongoose models
//https://www.youtube.com/watch?v=RXcY-OoGnQ8&list=PLvz7Wgo5pCqawFhP7oqpccU--C6ne2ZVN&index=3

const addToSchema = (collection, TC) => {
  let query = {}
  query[`${collection}Many`] = TC.getResolver('findMany', [authMiddleware])
  query[`${collection}ById`] = TC.getResolver('findById')
  query[`${collection}One`] = TC.getResolver('findOne')
  query[`${collection}Count`] = TC.getResolver('count')
  schemaComposer.Query.addFields(query);
  let mutation = {}
  mutation[`${collection}CreateOne`] = TC.getResolver('createOne')
  mutation[`${collection}UpdateById`] = TC.getResolver('updateById')
  mutation[`${collection}RemoveById`] = TC.getResolver('removeById')
  schemaComposer.Mutation.addFields(mutation);
}
//Creating resolvers for all mongoose models
for(const name of mongoose.modelNames()) {
  addToSchema (name, composeWithMongoose(mongoose.model(name), {}))
}

//requirering graphql schemas (needed to add relations)
const HotelTC = schemaComposer.getAnyTC('hotel')
const RoomTC = schemaComposer.getAnyTC('room')
const UserTC = schemaComposer.getAnyTC('user')

//#region :adding relations between mongoose models  in graphql
HotelTC.addRelation('room', {
  resolver: () => RoomTC.getResolver('findById'),
  prepareArgs: {
      _id: source => source.room || null,
  },
  projection: { room: true},
})

RoomTC.addRelation('user', {
  resolver: () => UserTC.getResolver('findById'),
  prepareArgs: {
      _id: source => source.user || null,
  },
  projection: { user: true},
})
//#endregion

//#region :ADDING LOGIN
///// ADDING PREREQUISITES FOR LOGIN TO SCHEMA /////
//Adding prerequisites for auth
UserTC.addFields({
  token: {
      type: 'String',
      description: 'Token of authenticated user.'
  }
})
//Adding resolver for login
UserTC.addResolver({
  kind: 'mutation',
  name: 'login',
  args: {
      identity: 'String!',
      password: 'String!',
  },
  type: UserTC.getResolver('updateById').getType(),
  resolve: async({args, context}) => {
      let user = null;
      if(isNaN(Number(args.identity))){
          user = await User.findOne({ email: args.identity });
      }
      if(!user) {
          throw new Error('User does not exist.')
      }
      // const isEqual = await bcrypt.compare(args.password, user.password);
      // if(!isEqual) {
      //     throw new Error('Password is not correct.');
      // }
      const token = jwt.sign({userId: user.id}, config.JWT_SECRET, {
          expiresIn: '24h'
      });
      return {
          recordId: user._id,
          record: {
              email: user.email,
              token: token,
              createdShops: user.createdShops,
          }
      }
  }
})

schemaComposer.Mutation.addFields({
  login: UserTC.getResolver('login'),
});
//#endregion

//Adding and building the above schema modifications
const graphqlSchema = schemaComposer.buildSchema();

///////////////// SERVER SETUP ///////////////////////
const server = new ApolloServer({ 
  schema: graphqlSchema, 
  playground: true, 
  introspection: true,
  context: ({req, res}) => ({req, res})
 });

const app = express();

//Using
//Adding auth check to all paths (setting isAuth in context.req)
app.use('/', isAuth)

server.applyMiddleware({ app })

app.listen(config.port, () => {
  console.log(`The server is running at http://localhost:${config.port}/graphql`)
});