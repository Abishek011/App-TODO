//Koa modules...
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//Koa
const app = new koa();

//Koa-Router
const route = new router();

//Aws - sdk
const aws = require('aws-sdk');

//JWT 
const jwt = require('jsonwebtoken');

//Configuring the database..
aws.config.update({
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

//Getting schema from the file..
var tableSchema = require('./tableSchema');

//Port number
var port = process.env.PORT || 3000;

console.log(tableSchema);

//bodyParse (koa)
app.use(bodyParser());

//app.use(async ctx=>(ctx.body="hello"));
//console.log("fello");

//Providing routes to all methods
app.use(route.routes()).use(route.allowedMethods());

//Configuring dynamoDB from aws
var dataBase = new aws.DynamoDB();

//console.log(dataBase.listTables());

//Table Creation
dataBase.createTable(tableSchema.user, (err, data) => {
    if (err) {
        console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
    }
    else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});

//GET
route.post("/users", verifyToken, async (ctx) => {
    jwt.verify(ctx.token, 'secretkey', (err, authData) => {
        if (err) {
            ctx.throw(403);
        } else {
            ctx.body = {
                msg: "post called",
                authData
            }
        }

    });
});

async function verifyToken(ctx, next) {
    //getting token from header
    const bearerHeader = ctx.headers['authorization'];

    //Check if type is undefined 
    if (typeof bearerHeader !== 'undefined') {
        ctx.token = bearerHeader.split(' ')[1];
        next();
    } else {
        ctx.throw(401, 'Forbidden');
    }
}
//POST - signUp to user
route.post("/signUp", signUp);
async function signUp(ctx) {
    var signUpDetails = ctx.query;
    console.log(signUpDetails);

    //Defining jwt-sign
    jwt.sign({ signUpDetails }, 'secretkey', (err, token) => {
        {
            console.log(token);
        }
    });
    ctx.body = { msg: "Token generated" };
}



//Listening port
app.listen(port);