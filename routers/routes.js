
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

//Getting schema from the file..
var tableSchema = require('../tableSchema');
const { reject, promise } = require('bcrypt/promises');

//POST create table
var createTable = (ctx) => {
    return new Promise((resolve, reject) => {
        dataBase.createTable(tableSchema.user, createTable);
        function createTable(err, data) {
            if (err) {
                console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
                ctx.status = 409;
                ctx.body = { "Message": "User already exist" };
            }
            else {
                console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
                ctx.body = { Message: "Table created" };
            }
            resolve();
        }
    });
};

//DELETE - deleteTable
var deleteTable = (ctx) => {
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
};

//POST signUp
var signUp = async (ctx) => {
    var emailId = "" + ctx.request.body.emailId;
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
    //console.log({ "params": params });
    var promiseSign = new Promise((resolve, reject) => {
        docClient.put(params, function (err, data) {
            if (err) {
                console.log("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                reject();
            } else {
                //signing token for auto login
                jwt.sign(params.Item, process.env.SIGN_TOKEN_KEY, { expiresIn: '1h' }, (err, token) => {
                    ctx.cookies.set("authToken", token, { httpOnly: false });
                    //ctx.cookies.set("signUpStatusTrue")
                });
                resolve();
            }
        });
    });
    return promiseSign.then(() => {
        console.log("Added user : " + emailId);
        ctx.status = 307;
        ctx.redirect('/logIn', 'Redirecting to logIn');
    }).catch((err) => {
        console.log(err);
        ctx.status = 409;
        ctx.body = { "Message ": "Error while signUp" };
    });
};


//POST - logIn [DashBoard]
var logIn = (ctx) => {
    var loggerCredintails = ctx.verifiedData;
    var userDetails = {
        TableName: 'Users',
        ProjectionExpression: 'userId,userName,emailId,tasks',
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: {
            "#email": 'emailId',
        },
        ExpressionAttributeValues: {
            ":email": loggerCredintails.emailId
        }
    }
    var promiseDashBoard = new Promise((resolve, reject) => {
        docClient.query(userDetails, async (err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log(data);
                resolve(data.Items[0]);
            }
        });
    });
    return promiseDashBoard.then((data) => {
        const dashBoard = data;
        if (data.tasks.length == 0) {
            dashBoard.tasks = "No Tasks Added Yet";
        }
        else {
            dashBoard.tasks = data.tasks;
        }
        data.routes = {
            addTask: "/dashBoard/addtask",
            removeTask: "/dashBoard/removetask",
            viewTask: "/dashBoard/viewtasks",
        }
        ctx.body = {
            "dashBoard": dashBoard
        }
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
};

//POST - adding task
var addTask = (ctx) => {
    console.log({mmh:ctx.taskData});
    var taskDetails = {
        taskId: uuid4(),
        taskName: ctx.taskData.taskName,
        taskDescription: ctx.taskData.taskDescription,
        taskAddedTime: Date.now(),
    };
    var emailId = ctx.verifiedData.emailId;
    var userId = ctx.verifiedData.userId;
    var params = {
        TableName: 'Users',
        Key: {
            "userId": userId,
            "emailId": emailId
        },
        UpdateExpression: "set #Task=list_append(#Task, :newTask)",
        ExpressionAttributeNames: {
            "#Task": 'tasks'
        },
        ExpressionAttributeValues: {
            ":newTask": [taskDetails],
        },
        ReturnValues: "UPDATED_NEW"
    };
    var promiseAddTask = new Promise((resolve, reject) => {
        docClient.update(params, (err, data) => {
            if (err) {
                reject(err);
            }else{
                resolve(data);
            }
        });
    });
    return promiseAddTask.then((data)=>{
        ctx.body={Message:"Task Added successfully",toCheck:"/dashBoard/viewTask"};
    }).catch((err)=>{
        ctx.status=409;
        ctx.body={Error:"problem durinig updation"};
        console.log(err);
    }); 
};

//DELETE - deleting task
var deleteTask=async (ctx)=>{
    var deleteTaskName = ctx.request.body.taskName;
    var emailId= ctx.verifiedData.emailId;
    var tasks;
    var userDetails = {
        TableName: 'Users',
        ProjectionExpression: 'tasks',
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: {
            "#email": 'emailId',
        },
        ExpressionAttributeValues: {
            ":email": emailId
        }
    }
    var promiseDashBoard = new Promise((resolve, reject) => {
        docClient.query(userDetails, async (err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log(data);
                resolve(data.Items[0].tasks);
            }
        });
    });
    await promiseDashBoard.then(async(data) => {
        tasks=data;
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
    for(var i=0;i<tasks.length;i++){
        if(new String(tasks[i].taskName).valueOf()==new String(deleteTaskName).valueOf()){
            tasks.splice(i,1);
            break;
        }
    }
    var userId = ctx.verifiedData.userId;
    var params = {
        TableName: 'Users',
        Key: {
            "userId": userId,
            "emailId": emailId
        },
        UpdateExpression: "set #Task=:newTask",
        ExpressionAttributeNames: {
            "#Task": 'tasks'
        },
        ExpressionAttributeValues: {
            ":newTask": tasks,
        },
        ReturnValues: "UPDATED_NEW"
    };
    var promiseAddTask = new Promise((resolve, reject) => {
        docClient.update(params, (err, data) => {
            if (err) {
                reject(err);
            }else{
                resolve(data);
            }
        });
    });
    return promiseAddTask.then((data)=>{
        ctx.body={Message:"Task deleted successfully",toCheck:"/dashBoard/viewTask"};
    }).catch((err)=>{
        ctx.status=409;
        ctx.body={Error:"problem durinig deletion"};
        console.log(err);
    });
};

//Get - view Tasks
var viewTask = (ctx)=>{
    var loggerCredintails = ctx.verifiedData;
    var userDetails = {
        TableName: 'Users',
        ProjectionExpression: 'userId,userName,emailId,tasks',
        KeyConditionExpression: "#email = :email",
        ExpressionAttributeNames: {
            "#email": 'emailId',
        },
        ExpressionAttributeValues: {
            ":email": loggerCredintails.emailId
        }
    }
    var promiseDashBoard = new Promise((resolve, reject) => {
        docClient.query(userDetails, async (err, data) => {
            if (err) {
                reject(err);
            } else {
                console.log(data);
                resolve(data.Items[0]);
            }
        });
    });
    return promiseDashBoard.then((data) => {
        const dashBoard = data.tasks;
        if (data.tasks.length == 0) {
            dashBoard.tasks = "No Tasks Added Yet";
        }
        else {
            for(var i=0;i<dashBoard.length;i++){
                dashBoard[i].taskAddedTime=new Date(dashBoard[i].taskAddedTime).toString();
            }
        }
        data.routes = {
            addTask: "/dashBoard/addtask",
            removeTask: "/dashBoard/removetask",
            viewTask: "/dashBoard/viewtasks",
        }
        ctx.body = {
            "dashBoard": dashBoard
        }
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
}

//Exporting all routes [createTable , deleteTable , signUp , login]
module.exports = {
    createTable,
    deleteTable,
    signUp,
    logIn,
    addTask,
    deleteTask,
    viewTask
}
