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
const { v4: uuid4 } = require('uuid');
const { reject } = require("bcrypt/promises");

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
route.post('/createTable', (ctx)=>{
    return new Promise((resolve,reject)=>{
    dataBase.createTable(tableSchema.user, createTable);
    function createTable(err, data) {
        if (err) {
            console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
            ctx.throw(409,'Unable to create table');
        }
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            ctx.body = { Message : "Table created" };
        }
        resolve();
    }
});
});

//DELETE - deleteTable
route.delete('/deleteTable',ctx => {
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
                ctx.body = { Message : "Table Created" };
            }
            resolve();
        }
    });
});

//POST - add task
route.post('/addTask',verifyToken,(ctx)=>{

});

//verifying token - [Add Task]
function verifyToken(){
    
}
//DELETE - task
route.delete("/deleteTask",verifyDelete,(ctx)=>{
    ctx.body={"msg":ctx.authData};
});

//verify token before delete
function verifyDelete(ctx,next){
    const bearerHeader = ctx.headers['authorization'];

    //Check if type is undefined 
    if (typeof bearerHeader !== 'undefined') {
        ctx.token =bearerHeader.split(' ')[1];
        jwt.verify(ctx.token, 'secretkey',async (err, authData)=>{
            if(err)
            {
                ctx.body={"msg err : ":err};
            }
            else{
                ctx.authData=authData;
                next();
            }
        });
    }

}

//POST - logIn
route.post('/logIn', ctx => {
    var emailId = "" + (ctx.query.emailId);
    var password = "" + ctx.query.password;
    /* jwt.verify(ctx.token,'secretkey',async (err,data)=>{
        console.log(data);
    }); */
    var param = {
        TableName: "Users",
        ProjectionExpression: "#ur , password,userId",
        FilterExpression: "#ur =:email",
        ExpressionAttributeNames: {
            "#ur": "emailId",
        },
        ExpressionAttributeValues: {
            ":email": emailId
        }
    };
    return new Promise((resolve, reject) => {
        docClient.scan(param, (err, data) => {
            if (err) {
                console.log("Error while fetching data " + err);
            } else {
                console.log(data);//+"  :  "+(""+data.Items.password));
                if (Number(data.Count) < 1) {
                    ctx.body = { 401: 'User not found' };
                    resolve();
                }
                else {
                    if (bcrypt.compareSync(password, "" + data.Items[0].password)) {
                        console.log("data", JSON.stringify(data, null, 2));
                        var tokenPayLoad = { "emailId": data.Items[0].emailId, "userId": data.Items[0].userId };
                        //Defining jwt-sign
                        jwt.sign({ tokenPayLoad }, 'secretkey', async (err, token) => {
                            if (err) {
                                console.error("Error in signup");
                            } else {
                                console.log(token);
                                ctx.body = { msg: `LogIn sucessfull for User: ${emailId}`, "Token generated ": token }
                                //resolve();
                            }
                        });
                        // });
                    } else {
                        ctx.body = { msg: "Incorrect emailId or password " };
                    }
                    resolve();
                }

            }
        })
    }
    );
});

//GET user Details
route.get("/getUserInfo", async ctx => {
    var param = {
        TableName: 'Users',
        ProjectionExpression: '#ur,password,userId,Task',
        FilterExpression: "#ur = :email",
        ExpressionAttributeNames: {
            "#ur": "emailId"
        },
        ExpressionAttributeValues: {
            ":email": ctx.query.emailId
        }
    };
    return new Promise((resolve, reject) => {
        docClient.scan(param, (err, data) => {
            if (err) {
                console.log(" : Error while fetching data" + err);
            } else {
                console.log("data", JSON.stringify(data, null, 2));
                ctx.body = { msg: data };
                resolve();
            }
        });
    });
});

//POST
route.post("/signUp", duplicateCheck, async (ctx) => {

    //Hashing the password provided by the user
    const hashedPassword = bcrypt.hashSync(ctx.query.password, saltRounds);

    console.log(hashedPassword);
    var params = {
        TableName: 'Users',
        Item: {
            'emailId': ctx.query.emailId,
            'userId': uuid4(),
            'password': hashedPassword,
            'Task': []
        },
    };
    return new Promise((resolve, reject) => {
        docClient.put(params,  (err, data) => {
            if (err) {
                console.log("Error while inserting data to database " + err);
                ctx.throw(409,'Error while Inserting data');
                //ctx.body = { "Error while inserting data to database ": err };
            } else {
                console.log("Added item:", JSON.stringify(params, null, 2));
                ctx.body = { "Added item:": params },
                    { Sucess: `User ${ctx.query.emailId} added to database` };
            }
            resolve();
        });
    });
}
);

//Check for duplicate entry.. [Middleware of signIn]
async function duplicateCheck(ctx, next) {

    var param = {
        TableName: 'Users',
        //ProjectionExpression: '#ur',
        KeyConditionExpression: "#ur = :email",
        ExpressionAttributeNames: {
            "#ur": "emailId"
        },
        ExpressionAttributeValues: {
            ":email": ctx.query.emailId
        }
    };

    return new Promise((resolve, request) => {
        docClient.query(param, async (err, data) => {
            if (err) {
                console.log(" : Error while fetching data : " + err);
            } else {
                if (data.Count >= 1) {
                    ctx.throw();
                }
                else{
                await next();}
                resolve();
            }
        });
    });
}

//POST - signUp to user
route.post("/getToken", async (ctx) => {
    var log = ctx.query;
    console.log(log);

    //Defining jwt-sign
    return new Promise((resolve, reject) => {
        jwt.sign({ log }, 'secretkey', async (err, token) => {
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