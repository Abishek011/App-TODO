
//Aws - sdk
const aws = require('aws-sdk');

//Configuring the database..
aws.config.update({
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

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

//Middleware [ signUp ] to check for already existing user
async function checkDuplicate(ctx, next) {
    var emailId = ctx.request.body.emailId;
    var params = {
        TableName: "Users",
        ProjectionExpression: '#ur',
        KeyConditionExpression: "#ur = :email",
        ExpressionAttributeNames: {
            "#ur": "emailId"
        },
        ExpressionAttributeValues: {
            ":email": emailId
        }
    };
    return new Promise((resolve, reject) => {
        docClient.query(params, async (err, data) => {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                ctx.status = 401;
                ctx.body = { "Message": "Query Error" };
            } else {
                if (Number(data.Count) >= 1) {
                    ctx.status = 409;
                    ctx.body = { "Message": 'User already exist' };
                }
                else {
                    await next();
                }
            }
            resolve();
        });
    });
}

//Middleware [ logIn ] to verify Authorization token & login credintials varification
async function verifyLogIn(ctx, next) {

    var isExpired = false;
    try {
        jwt.verify(ctx.token, process.env.SIGN_TOKEN_KEY)
    } catch (err) {
        if (err.name == "TokenExpiredError") {
            isExpired = true;
        }
    }console.log(":1"+isExpired);
    console.log({isExpired:ctx.token});
    //check for direct login straight from signUp..  
    if (ctx.token == undefined || isExpired) {
        console.log(":2");
        //Checking database for emailId of user...
        var emailId = ctx.request.body.emailId;
        var params = {
            TableName: "Users",
            ProjectionExpression: 'emailId,password,userId',
            KeyConditionExpression: "#ur = :email",
            ExpressionAttributeNames: {
                "#ur": "emailId"
            },
            ExpressionAttributeValues: {
                ":email": emailId
            }
        };
        var db = new Promise((resolve, reject) => {
            docClient.query(params, async (err, data) => {
                if (err) {
                    console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                    ctx.status = 401;
                    ctx.body = { "Message": "Query Error" };
                    reject(err);
                } else {
                    console.log({":3":JSON.stringify(data)});
                    if((Number(data.Count) < 1 ||  !bcrypt.compareSync(ctx.request.body.password, data.Items[0].password))) {
                        ctx.status = 409;
                        ctx.body = { "Message": "User doesn't exist / check email or password" };
                        resolve();
                    }else{
                        var logInCredintails=data.Items[0];
                        console.log(":8");
                    var promiseLogIn = new Promise((resolve, reject) => {
                        jwt.sign(logInCredintails, process.env.SIGN_TOKEN_KEY, { expiresIn: '1h' }, (err, token) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log(":4");
                                resolve(token);
                            }
                        });
                    });
                    return promiseLogIn.then((token)=>{
                        ctx.cookies.set("authToken",token,ctx.verifiedData);
                        console.log(":5");
                        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
                            if (err) {
                                console.log({ "verify": err });
                                ctx.status = 412;
                                ctx.body = { "Message : 'Token verification problem' ": err };
                            }
                            else {
                                console.log(":7 : ");
                                ctx.verifiedData = data;
                                resolve();
                            }
                        });
                    }).catch((err) => {
                        ctx.status = 412;
                        ctx.body = { "Message": { 'Token  signing problem : ': err } };
                    });
                    }
                }
            });
        });
        return db.then(async ()=>{
            console.log("dbs");
            await next();
        }).catch((err)=>{
            console.log(err);
        }); 
    }
    return promiseLogIn.then((token)=>{
        ctx.token = token;
        console.log(":5");
        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
            if (err) {
                console.log({ "verify": err });
                ctx.status = 412;
                ctx.body = { "Message : 'Token verification problem' ": err };
            }
            else {
                console.log(":7");
                ctx.verifiedData = data;
                next();
                resolve();
            }
        });
    }).catch((err) => {
        ctx.status = 412;
        ctx.body = { "Message": { 'Token  signing problem : ': err } };
    });
}

//Middleware [ addTask ] to check for pre-existing task of same name
async function checkDuplicateTask(ctx,next){
    //get token from the cookie saved from [logIn] or [signUp]
    var token=ctx.cookies.get('authToken');
    var emailId;

    var promiseToken = new Promise((resolve,reject)=>{
        jwt.verify(token,process.env.SIGN_TOKEN_KEY,(err,data)=>{
            if(err){
                reject(err);
            }
            else{
                resolve(data);
            }
        });
    });
    await promiseToken.then((data)=>{
            ctx.verifiedData=data;
            emailId=data.emailId;
    }).catch((err)=>{
        ctx.status=401;
        ctx.body={Message:"Token expired"};
    });
    if(ctx.status!=401){
    var taskName=""+ctx.request.body.taskName;
    var taskDescription=""+ctx.request.body.taskDescription;
    var taskList ={
        TableName: 'Users',
        ProjectionExpression: 'tasks',
        KeyConditionExpression: '#ur = :email',
        ExpressionAttributeNames:{
            '#ur': 'emailId'
        },
        ExpressionAttributeValues:{
            ':email':emailId
        }
    }
    var promiseTask = new Promise((resolve,reject)=>{
        docClient.query(taskList,(err,data)=>{
            if(err){
                reject(err);
            }
            else{
                resolve(data);
            }
        });
    });
    return promiseTask.then(async (data)=>{
        ctx.taskData={
            taskName:taskName,
            taskDescription:taskDescription,
        }
        if((Object.keys(data.Items[0]).length === 0) && data.Items.length==1){
            next();
        }
        else{
            var taskFlag=true;/* 
            console.log(data.Items[0].tasks[0].taskName);
            var s1=new String(data.Items[0].tasks[0].taskName);
            var s2=new String(taskName);
            console.log(taskName,JSON.stringify(s1)==JSON.stringify(s2)); */
            for(var i=0;i<data.Items[0].tasks.length;i++){
                //console.log(JSON.stringify(data.Items[0].tasks[i].taskName)==JSON.stringify(taskName));
                if(data.Items[0].tasks[i].taskName==taskName){
                    console.log(data.Items[0].tasks[i].taskName==taskName);
                    taskFlag=false;
                    break;
                }
            }
            console.log({mmk:taskFlag});
            if(taskFlag){
                await next();
            }
            else{
                ctx.status=409;
                ctx.body={"Message " : 'Task already exist'};
            }
        }
    }).catch((err)=>{
        console.log({masg:err});
    });}
}

module.exports = {
    checkDuplicate,
    verifyLogIn,
    checkDuplicateTask
}