
//koa js - modules
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//koa
const app = new koa();

//bodyParse (koa)
app.use(bodyParser());

//Koa-Router
const route = new router();

//Pre-defined path prefix for dashboard
var dashBoard = new router({
    prefix: '/dashBoard'
});

//Providing [routes] to all methods
app.use(route.routes()).use(route.allowedMethods());

//Providing [dashBoard] to all methods
app.use(dashBoard.routes()).use(dashBoard.allowedMethods());

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
/* 
//Configuring dynamoDB from aws
var dataBase = new aws.DynamoDB();

//Document client for dynamodb
var docClient = new aws.DynamoDB.DocumentClient();

//password encription using bcrypt
const bcrypt = require('bcrypt');

//saltrounds for costing
const saltRounds = 10;

//UUID Url-friendly Unique Id for userid
const { v4: uuid4 } = require('uuid');

//JWT 
const jwt = require('jsonwebtoken');
 */
//Port number
var port = process.env.PORT || 3000;

//Getting middlewares from [middleware.js] file
var middleWare= require('./routers/middleWares/middleWares')

var routers = require('./routers/routes');

route.post('/signUp', middleWare.checkDuplicate , routers.signUp);

route.post('/createTable',routers.createTable);

route.delete('/deleteTable',routers.deleteTable);

route.post('/logIn',middleWare.verifyLogIn,routers.logIn);

dashBoard.post('/addTask',middleWare.checkDuplicateTask,routers.addTask);

dashBoard.delete('/deleteTask',routers.deleteTask);

app.listen(port,()=>{
    console.log(`listening to port : ${port}`);
})