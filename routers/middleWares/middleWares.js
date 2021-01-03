
//Aws - sdk
const aws = require('aws-sdk');

//Configuring the database..
aws.config.update({
    accessKeyId: process.env.SECRET_ACCESSKEY_ID,
    secretAccessKey: process.env.SECRET_ACCESSKEY,
    region: "us-east-1",
    endpoint: "https://dynamodb.us-east-1.amazonaws.com"
});

var dataBase = new aws.DynamoDB();

//Document client for dynamodb
var docClient = new aws.DynamoDB.DocumentClient();


//password encription using bcrypt
const bcrypt = require('bcryptjs');

//saltrounds for costing
const saltRounds = 10;

//UUID Url-friendly Unique Id for userid
const { v4: uuid4 } = require('uuid');

//JWT 
const jwt = require('jsonwebtoken');

//Tokenexpiration check
function isTokenExpired(token) {
    try {
        jwt.verify(ctx.token, process.env.SIGN_TOKEN_KEY)
    } catch (err) {
        if (err.name == "TokenExpiredError") {
            return false;
        }
    }
    return true;

}


//Middleware [ signUp ] to check for already existing user
async function checkDuplicate(ctx, next) {
    //console.log("called");
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
    var signPromise = new Promise((resolve, reject) => {
        docClient.query(params, async (err, data) => {
            if (err) {
                console.error("Unable to query. Error:", JSON.stringify(err, null, 2));
                ctx.status = 401;
                ctx.body = { "Message : Query Error": err };
            } else {
                if (Number(data.Count) >= 1) {
                    reject();
                }
                else {
                    resolve();
                }
            }
        });
    });
    return signPromise.then(async()=>{
        await next();
    }).catch(()=>{
        ctx.status = 409;
        ctx.body = { "Message": 'User already exist' };
    });
}

//Middleware [ logIn ] to verify Authorization token & login credintials varification
async function verifyLogIn(ctx, next) {

    console.log(ctx.request.body);

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
                if ((Number(data.Count) < 1 || !bcrypt.compareSync(ctx.request.body.password, data.Items[0].password))) {
                    ctx.status = 409;
                    ctx.body = { "Message": "Incorrect LogIn Credentials" };
                    reject({ "Message": "Incorrect LogIn Credentials" });
                } else {
                    var logInCredintails = data.Items[0];
                    console.log(":8");
                    var promiseLogIn = new Promise((resolve, reject) => {
                        jwt.sign(logInCredintails, process.env.SIGN_TOKEN_KEY, { expiresIn: '2d' }, (err, token) => {
                            if (err) {
                                reject(err);
                            }
                            else {
                                console.log(":4");
                                resolve(token);
                            }
                        });
                    });
                    await promiseLogIn.then((token) => {
                        ctx.token = token;
                        resolve();
                    }).catch((err) => {
                        ctx.status = 412;
                        ctx.body = { "Message": { 'Token  signing problem : ': err } };
                        reject({ "Message": { 'Token  signing problem : ': err } });
                    });
                }
            }
        });
    });
    return db.then(async () => {
        console.log("dbs");
        await next();
    }).catch((err) => {
        console.log(err);
    });
}

//Middleware [ addTask ] to check for pre-existing task of same name
async function checkDuplicateTask(ctx, next) {

    var token = ctx.request.body.userAuthCookie;
    var promiseToken = new Promise((resolve, reject) => {
        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
    await promiseToken.then((data) => {
        ctx.verifiedData = data;
        emailId = data.emailId;
    }).catch((err) => {
        ctx.status = 401;
        ctx.body = { Message: "Token expired" };
    });
    if (ctx.status != 401) {
        var taskName = "" + ctx.request.body.taskName;
        var taskDescription = "" + ctx.request.body.taskDescription;
        var taskList = {
            TableName: 'Users',
            ProjectionExpression: 'tasks',
            KeyConditionExpression: '#ur = :email',
            ExpressionAttributeNames: {
                '#ur': 'emailId'
            },
            ExpressionAttributeValues: {
                ':email': emailId
            }
        }
        var promiseTask = new Promise((resolve, reject) => {
            docClient.query(taskList, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
        return promiseTask.then(async (data) => {
            ctx.taskData = {
                taskName: taskName,
                taskDescription: taskDescription,
            }
            if ((Object.keys(data.Items[0]).length === 0) && data.Items.length == 1) {
                next();
            }
            else {
                var taskFlag = true;
                //console.log({noo:data.Items[0].tasks});
                for (var i = 0; i < data.Items[0].tasks.length; i++) {
                    //console.log(data.Items[0].tasks[i],JSON.stringify(data.Items[0].tasks[i].taskName)==JSON.stringify(taskName));
                    if (new String(data.Items[0].tasks[i].taskName).valueOf() == new String(taskName).valueOf()) {
                        console.log(data.Items[0].tasks[i]);
                        taskFlag = false;
                        break;
                    }
                }
                // console.log({mmk:taskFlag});
                if (taskFlag) {
                    await next();
                }
                else {
                    ctx.status = 409;
                    ctx.body = { "Message ": 'Task already exist' };
                }
            }
        }).catch((err) => {
            console.log({ masg: err });
        });
    }
}

//Middleware [ changeTaskStatus ] to verifyToken
async function changeTaskStatus(ctx, next) {

    var token = ctx.request.body.userAuthCookie;
    console.log("body", ctx.request.body);
    var promiseToken = new Promise((resolve, reject) => {
        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
    await promiseToken.then(async (data) => {
        ctx.verifiedData = data;
        await next();
    }).catch((err) => {
        ctx.status = 401;
        console.log("(JSON.stringify(err))");
        ctx.body = { Message: err };
    });
}


//Middleware [ deleteTask ] to verify token
async function deleteTask(ctx, next) {

    var token = ctx.request.body.userAuthCookie;
    console.log("body", ctx.request.body);
    var promiseToken = new Promise((resolve, reject) => {
        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
    await promiseToken.then(async (data) => {
        ctx.verifiedData = data;
        await next();
    }).catch((err) => {
        ctx.status = 401;
        ctx.body = { Message: err };
    });
}

//Middleware [ viewTask ] for token decoding..
async function verifyView(ctx, next) {

    console.log("body",ctx.request.body);
    var token = ctx.request.body.userAuthCookie;
    /* var emailId = "" + ctx.request.body.emailId;
    var password = ctx.request.body.password;
    var userName = ctx.request.body.userName;
    const hashedPassword = bcrypt.hashSync(password, saltRounds);
    var params = {
        TableName: "Users",
        Item: {
            "userId": uuid4(),
            "emailId": emailId,
            "password": hashedPassword,
            "userName": userName,
            'tasks': []
        },
    };
    console.log({ "params": 1 });
    var promiseSign = new Promise((resolve, reject) => {
        jwt.sign(params.Item, process.env.SIGN_TOKEN_KEY, { expiresIn: '2d' }, (err, tokn) => {
            if (err) {
                reject(err);
            }
            token=tokn;
            //ctx.cookies.set("signUpStatusTrue")
            resolve();
        });
    });
    await promiseSign.then(() => {
        console.log("Added user : " + emailId);
    }).catch((err) => {
        console.log(err);
        ctx.status = 409;
        ctx.body = { "Message ": "Error on authentication" };
    }); */

    var emailId;
    var promiseToken = new Promise((resolve, reject) => {
        jwt.verify(token, process.env.SIGN_TOKEN_KEY, (err, data) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
    await promiseToken.then((data) => {
        ctx.verifiedData = data;
        emailId = data.emailId;
    }).catch((err) => {
        ctx.status = 401;
        ctx.body = { Message: err };
    });
    if (ctx.status != 401) {
        var taskList = {
            TableName: 'Users',
            ProjectionExpression: 'tasks',
            KeyConditionExpression: '#ur = :email',
            ExpressionAttributeNames: {
                '#ur': 'emailId'
            },
            ExpressionAttributeValues: {
                ':email': emailId
            }
        }
        var promiseTask = new Promise((resolve, reject) => {
            docClient.query(taskList, (err, data) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            });
        });
        return promiseTask.then(async (data) => {
            await next();
        }).catch((err) => {
            console.log({ msg: err });
        });
    }
}

//Exporting the middlewares
module.exports = {
    checkDuplicate,
    verifyLogIn,
    checkDuplicateTask,
    deleteTask,
    verifyView,
    changeTaskStatus
}