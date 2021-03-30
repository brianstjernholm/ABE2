
//#region ///////////////// IMPORTS ///////////////////////
require('dotenv').config()
require('./models/db')
const config = require('./config')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken')
//const http = require('http')

//Apollo
const { ApolloServer } = require('apollo-server-express')

//graphql
//const { graphqlHTTP } = require('express-graphql');
const { composeWithMongoose } = require('graphql-compose-mongoose')
const { schemaComposer } = require('graphql-compose')

//mongoose
const mongoose = require('mongoose')
//#endregion

const express = require('express')
const { response } = require('express')
//const { request } = require('https')


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
//Adding auth check to all paths (setting isAuth in context.req)
//app.use('/', isAuth)

//, [authMiddleware]
//Method for autogenerating resolvers(queries/mutations) based on mongoose models

// .wrapResolve(next => rp => {
//   console.log(rp.context);
//   if(checkAuthInContext(rp.context)) return next(rp);
// })

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
    //  console.log(context.req.isAuth)
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

//Seting up server
//const server = new ApolloServer({ schema: graphqlSchema, playground: true, introspection: true });
//server.applyMiddleware({ app })

// GraphQL
// app.use(
//   "/graphql",
//   graphqlHTTP(async (req) => ({
//     schema: graphqlSchema,
//     graphiql: true,
//     context: {
//       req,
//     },
//   }))
// );


///////////////// SERVER SETUP ///////////////////////
const server = new ApolloServer({ 
  schema: graphqlSchema, 
  playground: true, 
  introspection: true,
  context: ({req, res}) => ({req, res})
 });

const app = express();

//Using
app.use('/', isAuth)
app.use(express.json())
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// app.use(
//   '/graphql',
//   graphqlHTTP(async (request, response) => {
//     return {
//       schema: graphqlSchema,
//       graphiql: true,
//       context: {
//         req: request,
//       },
//     };
//   })
// );

server.applyMiddleware({ app })

app.listen(config.port, () => {
  console.log(`The server is running at http://localhost:${config.port}/graphql`)
});

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, (err) => {
//   if (err) throw err;
//   console.log(`Server URL: http://localhost:${config.port}${server.graphqlPath}/`);
// });

////#region :ALTERNATIV server setup
//app.listen(config.port)

//ALTERNATIV TIL SERVER SETUP 
//app.listen(3050, () => console.log("Listening on port 3050"))
//module.exports = app;

// const httpServer = http.createServer(app);
// httpServer.listen({ port: 3050 }, () => {
//   console.log(`Server ready at http://0.0.0.0:${config.port}${server.graphqlPath}`);
// } )

//mongoose.connect('mongodb://localhost:27017/hotel', {useNewUrlParser: true});


//  app.listen(config.port, () => {
//      console.log(`Server URL: http://localhost:${config.port}$/`);
//    });
////#endregion