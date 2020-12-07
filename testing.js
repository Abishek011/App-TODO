
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

//Providing routes to all methods
app.use(route.routes()).use(route.allowedMethods());

//Aws - sdk
const aws = require('aws-sdk');

//Configuring the database..
aws.config.update({
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

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

//Port number
var port = process.env.PORT || 3000;

//Getting schema from the file..
var tableSchema = require('./tableSchema');

//POST create table
route.post('/createTable', (ctx) => {
    return new Promise((resolve, reject) => {
        dataBase.createTable(tableSchema.user, createTable);
        function createTable(err, data) {
            if (err) {
                console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
                ctx.throw(409, 'Unable to create table');
            }
            else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                ctx.body = { Message: "Table created" };
            }
            resolve();
        }
    });
});

//DELETE - deleteTable
route.delete('/deleteTable', ctx => {
    //table to be deleted...
    var params = {
        TableName: "Users"
    };
    return new Promise((resolve, reject) => {
        dataBase.deleteTable(params, deleteTable);
        function deleteTable(err, data) {
            if (err) {
                console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
                ctx.body = { "Unable to delete table. Error JSON:": err };
            } else {
                console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
                ctx.body = { Message: "Table Created" };
            }
            resolve();
        }
    });
});

//POST signUp
route.post('/signUp', checkDuplicate, async (ctx) => {
    var emailId = "" + ctx.request.body.emailId;
    var password = ctx.request.body.password;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    console.log({ "vada": uuid4() });
    var params = {
        TableName: "Users",
        Item: {
            "userId": uuid4(),
            "emailId": emailId,
            "password": hashedPassword,
        },
    };
    console.log({ "params": params });
    return new Promise((resolve, reject) => {
        docClient.put(params, function (err, data) {
            if (err) {
                console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                ctx.throw(409, "cannot input data");
            } else {
                console.log("Added user : " + emailId);
                ctx.status = 301;
                ctx.redirect('/logIn', 'Redirecting to logIn');
                resolve();
            }
        });
    });
});

//Middleware [ signUp ] to check for already existing user
async function checkDuplicate(ctx, next) {
    var emailId = ctx.request.body.emailId;
    console.log((ctx.request.body));
    var params = {
        TableName: "Users",
        KeyConditionExpression: "#ur = :email",
        ExpressionAttributeNames: {
            "#ur": "emailId"
        },
        ExpressionAttributeValues: {
            ":email": emailId
        }
    };
    return new Promise((resolve, reject) => {
        docClient.query(params, async (err, data)=>{
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                ctx.status=401;
                ctx.body={"Message":"Query Error"};
            } else {
                console.log({ "Query succeeded.": data });
                if (Number(data.Count) >= 1) {
                    ctx.status=409;
                    ctx.body={"Message":'User already exist'};
                }
                else{
                    await next();
                }
            }
            resolve();
        });
    });
}

//POST - logIn
route.get("/logIn", (ctx) => {
    console.log("log");
});

//Listening to server
app.listen(port, () => {
    console.log(`Listening to port : ${port}`);
})