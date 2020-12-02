//Koa modules...
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//Koa
const app = new koa();

//Koa-Router
const route = new router();

//JWT 
const jwt = require('jsonwebtoken');

//Aws - sdk
const aws = require('aws-sdk');

//password encription using bcrypt
const bcrypt = require('bcrypt');

//saltrounds for costing
const saltRounds = 10;

//Configuring the database..
aws.config.update({
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});


//Port number
var port = process.env.PORT || 3000;

//bodyParse (koa)
app.use(bodyParser());

//app.use(async ctx=>(ctx.body="hello"));
//console.log("fello");

//Providing routes to all methods
app.use(route.routes()).use(route.allowedMethods());

//Configuring dynamoDB from aws
var dataBase = new aws.DynamoDB();

//Document client for dynamodb
var docClient = new AWS.DynamoDB.DocumentClient();

//console.log(dataBase.listTables());

//POST
route.post("/signIn", verifyToken, async (ctx) => {
    jwt.verify(ctx.token, 'secretkey', (err, authData) => {
        var ctxBody='';
        if (err) {
            ctx.throw(403);
        } else {
            
            const hashedPassword=bcrypt.hashSync(authData.signUpDetails.password, saltRounds);
            
            console.log(hashedPassword);
            var params = {
                TableName: 'Users',
                Item: {
                    'userName':  {S:""+authData.signUpDetails.name},
                    'password':  {S:""+hashedPassword}
                }
            };
            dataBase.putItem(params,ctxBody=(err,data) => {
                if(err)
                {
                    console.log("Error while inserting data to database "+err);
                }else{
                    console.log("Added item:", JSON.stringify(params,null,2));
                }
            });
            var param = {
                TableName: 'Users',
                KeyConditionExpression: "#uname = :S",
                ExpressionAttributeNames:{
                    "#uname": "userName"
                },
                ExpressionAttributeValues: {
                    ":S": authData.signUpDetails.name
                }
            };
            dataBase.getItem(param, function(err, data) {
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                    ctxBody+=("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                    ctxBody+=("GetItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
            ctx.body = {
                Sucess: `User ${authData.signUpDetails.name} added to database`,
                msg: ctxBody
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
route.post("/signUp", async (ctx) => {
    var signUpDetails = ctx.query;
    console.log(signUpDetails);

    //Defining jwt-sign
    jwt.sign({ signUpDetails }, 'secretkey',async (err,token,tokenFlag) => {
        if(err){
            console.error("Error in signup");
        }else{
            console.log(token);
        }  
    });
    ctx.body = { msg: "Token generated "};
});



//Listening port
app.listen(port);