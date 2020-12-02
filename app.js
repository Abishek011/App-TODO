//Koa modules...
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//Koa
const app = new koa();

//Koa-Router
const route = new router();

//Getting schema from the file..
var tableSchema = require('./tableSchema');

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
var docClient = new aws.DynamoDB.DocumentClient();

//console.log(dataBase.listTables());

//POST - create table
route.post('/createTable', async (ctx) => {
    dataBase.createTable(tableSchema.user, createTable);
    async function createTable(err, data) {
        if (err) {
            console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
        }
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    }
});

//DELETE - deleteTable
route.delete('/deleteTable', async ctx => {
    //table to be deleted...
    var params = {
        TableName: "Users"
    };

    dataBase.deleteTable(params, deleteTable);
    function deleteTable(err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
        }
    }
});

//POSt - logIn
route.post('/logIn', ctx => {
    var userName = ctx.query.id;
    var password = ctx.query.password;
    var param = {
        TableName: 'Users',
        KeyConditionExpression: "#uid = :N",
        ExpressionAttributeNames: {
            "#uid": "userId"
        },
        ExpressionAttributeValues: {
            ":N": userId
        }
    };
    docClient.query(param, function (err, data) {
        if (err) {
            console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
            //data.Items[0].
        }
    });
});

//GET user Details
route.get("/getUserInfo", async ctx => {
    var param = {
        TableName: 'Users',
        Key:{'userId':Number(ctx.query.id)}  
    };
    docClient.get(param, (err, data) => {
        if (err) {
            console.log("Error while fetching data"+err);
        } else {
            console.log("data", JSON.stringify(data, null, 2));
        }
    });
});

//POST
route.post("/signUp", verifyToken, async (ctx) => {
    jwt.verify(ctx.token, 'secretkey', (err, authData) => {
        if (err) {
            ctx.throw(403);
        } else {

            //Hashing using bcrypt..
            const hashedPassword = bcrypt.hashSync(authData.signUpDetails.password, saltRounds);

            // console.log(hashedPassword);
            var params = {
                TableName: 'Users',
                Item: {
                    'userId': { N: "" + authData.signUpDetails.id },
                    'password': { S: "" + hashedPassword }
                },
                //KeyConditionExpression: attribute_not_exists(authData.signUpDetails.id)
            };
            dataBase.putItem(params, ctxBody = (err, data) => {
                if (err) {
                    console.log("Error while inserting data to database " + err);
                } else {
                    console.log("Added item:", JSON.stringify(params, null, 2));
                }
            });
            var param = {
                TableName: 'Users',
                KeyConditionExpression: "#uid = :N",
                ExpressionAttributeNames: {
                    "#uid": "userId"
                },
                ExpressionAttributeValues: {
                    ":N": Number(authData.signUpDetails.id)
                }
            };
            docClient.query(param, function (err, data) {
                if (err) {
                    console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
                } else {
                    console.log("GetItem succeeded:", JSON.stringify(data, null, 2));
                }
            });
            ctx.body = {
                Sucess: `User ID: ${authData.signUpDetails.id} added to database`,
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
route.post("/getToken", async (ctx) => {
    var signUpDetails = ctx.query;
    console.log(signUpDetails);

    //Defining jwt-sign
    jwt.sign({ signUpDetails }, 'secretkey', async (err, token) => {
        if (err) {
            console.error("Error in signup");
        } else {
            console.log(token);
        }
    });
    ctx.body = { msg: "Token generated " };
});


//Listening port
app.listen(port);