
//koa js - modules
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//koa
const app = new koa();

//bodyParse (koa)
app.use(bodyParser());

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
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

//Port number
var port = process.env.PORT || 3000;

//Getting middlewares from [middleware.js] file
var middleWare= require('./routers/middleWares/middleWares')

var routers = require('./routers/routes');

routes.post('/user', middleWare.checkDuplicate , routers.signUp);

route.post('/createTable',routers.createTable);

route.delete('/deleteTable',routers.deleteTable);

route.post('/logIn',middleWare.verifyLogIn,routers.logIn);

dashBoard.post('/addTask',middleWare.checkDuplicateTask,routers.addTask);

dashBoard.delete('/deleteTask',middleWare.deleteTask,routers.deleteTask);

dashBoard.get('/viewTask',middleWare.verifyView,routers.viewTask);

route.get('/logOut',routers.logOut);

app.listen(port,()=>{
    console.log(`listening to port : ${port}`);
})