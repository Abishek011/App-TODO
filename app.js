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

//UUID Url-friendly Unique Id for userid
const {v4:uuid4} =require('uuid');

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
    return new Promise((resolve, reject) => {
    dataBase.createTable(tableSchema.user, createTable);
    async function createTable(err, data) {
        if (err) {
            console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
            ctx.body={"Unable to create table Error JSON:": err};
        }
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            ctx.body={"Created table. Table description JSON:": data};
        }
        resolve();
    }
});
});

//DELETE - deleteTable
route.delete('/deleteTable', async ctx => {
    //table to be deleted...
    var params = {
        TableName: "Users"
    };
    return new Promise((resolve, reject) => {
    dataBase.deleteTable(params, deleteTable);
    function deleteTable(err, data) {
        if (err) {
            console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
            ctx.body={"Unable to delete table. Error JSON:": JSON.stringify(err, null, 2)};
        } else {
            console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
            ctx.body={"Deleted table. Table description JSON:": JSON.stringify(data, null, 2)};
        }
        resolve();
    }
    });
});

//POSt - logIn
route.post('/logIn',ctx => {
    var emailId = (ctx.query.emailId);
    var password = ctx.query.password;
    /* jwt.verify(ctx.token,'secretkey',async (err,data)=>{
        console.log(data);
    }); */
    var param = {
        TableName: 'Users',
        Key: { 'emailId': ""+emailId }
    };
    return new Promise((resolve, reject) => {
        docClient.get(param, (err, data) => {
            if (err) {
                console.log("Error while fetching data" + err);
            } else {
                if (bcrypt.compareSync(password, data.Item.password)) {
                    console.log("data", JSON.stringify(data, null, 2));
                    ctx.body = { "LogIn sucessfull for User: ": data };
                    
                } else {
                    ctx.body = { msg: "LogIn failed check password " };
                }
                resolve();
            }
        })
    }
    );
});

//GET user Details
route.get("/getUserInfo", async ctx => {
    var param = {
        TableName: 'Users',
        Key: { 'emailId': Number(ctx.query.emailId) }
    };
    docClient.get(param, (err, data) => {
        if (err) {
            console.log("Error while fetching data" + err);
        } else {
            console.log("data", JSON.stringify(data, null, 2));
        }
    });
});

//POST
route.post("/signUp", async (ctx) => {
    /* jwt.verify(ctx.token, 'secretkey', (err, authData) => {
        if (err) {
            ctx.throw(403);
        } else { 
        }*/
    //Hashing using bcrypt..
    const hashedPassword = bcrypt.hashSync(ctx.query.password, saltRounds);

    console.log(hashedPassword);
    var params = {
        TableName: 'Users',
        Item: {
            'emailId': { S: "" + ctx.query.emailId },
            'userId' : { S: ""+ uuid4()},
            'password': { S:  "" + hashedPassword }
        },
    };
    return new Promise((resolve, reject) => {
        dataBase.putItem(params, ctxBody = (err, data) => {
            if (err) {
                console.log("Error while inserting data to database " + err);
                ctx.body = { "Error while inserting data to database ": err };
            } else {
                console.log("Added item:", JSON.stringify(params, null, 2));
                ctx.body = { "Added item:": params },
                    { Sucess: `User ${ctx.query.emailId} added to database` };
            }
            resolve();
        });
    });
});
/* 
async function verifyUserId(ctx,next){

} */

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
    return new Promise((resolve, reject) => {
        jwt.sign({ signUpDetails }, 'secretkey', async (err, token) => {
            if (err) {
                console.error("Error in signup");
            } else {
                console.log(token);
                ctx.body = { "Token generated ": token }
                resolve();
            }
        });
    });
});


//Listening port
app.listen(port);