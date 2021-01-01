
//koa js - modules
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//koa
const app = new koa();

//bodyParse (koa)
app.use(bodyParser());

//For swagger server validation
const cors = require('cors');
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

//Koa-Router
const route = new router({
    prefix: '/user'
});

//Koa-Router
const routes = new router();

//Pre-defined path prefix for dashboard
var dashBoard = new router({
    prefix: '/user/dashBoard'
});

//Providing [routes] to all methods
app.use(route.routes()).use(route.allowedMethods());

//Providing [dashBoard] to all methods
app.use(dashBoard.routes()).use(dashBoard.allowedMethods());

//Providing [routes] to all methods
app.use(routes.routes()).use(routes.allowedMethods());

//configuring the environmentVariable using [dotenv]
require('dotenv').config()

//Aws - sdk
const aws = require('aws-sdk');

//Configuring the database..
aws.config.update({
    accessKeyId: process.env.SECRET_ACCESSKEY_ID,
    secretAccessKey: process.env.SECRET_ACCESSKEY,
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

//Port number
var port = process.env.PORT || 3000;

//Getting middlewares from [middleware.js] file
var middleWare= require('./routers/middleWares/middleWares')

var routers = require('./routers/routes');
const { header } = require("koa/lib/response");

route.post('/createTable',routers.createTable);

route.delete('/deleteTable',routers.deleteTable);

//user route for signUp operation 
routes.post('/user', middleWare.checkDuplicate , routers.signUp);

//login route for user login
route.post('/logIn',middleWare.verifyLogIn,routers.logIn);

dashBoard.post('/addTask',middleWare.checkDuplicateTask,routers.addTask);

dashBoard.delete('/deleteTask',middleWare.deleteTask,routers.deleteTask);

dashBoard.post('/viewTasks',middleWare.verifyView,routers.viewTask);

route.get('/logOut',routers.logOut);

routes.get('/',ctx=>{
    ctx.body="server running at 3000";
});

app.listen(port,()=>{
    console.log(`listening to port : ${port}`);
})