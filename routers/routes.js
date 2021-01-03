
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

//password encription using bcryptjs
const bcrypt = require('bcryptjs');

//saltrounds for costing
const saltRounds = 10;

//UUID Url-friendly Unique Id for userid
const { v4: uuid4 } = require('uuid');

//JWT 
const jwt = require('jsonwebtoken');

//Getting schema from the file..
var tableSchema = require('../tableSchema');

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
    var emailId = ctx.request.body.emailId;
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
        docClient.put(params, function (err, data) {
            if (err) {
                console.log("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                reject(err);
            } else {
                resolve();
            }
        });
    });
    return promiseSign.then(() => {
        ctx.status = 200;
        ctx.body = { message: "User Created" };
    }).catch((err) => {
        console.log(err);
        ctx.status = 409;
        ctx.body = { "Message ": "Error while signUp" };
    });
};

//POST - logIn [DashBoard]
var logIn = (ctx) => {
    console.log("login");
    ctx.status = 200;
    ctx.body = {
        'cookie': ctx.token,
        'message': "logIn Successful"
    }
};

//POST - adding task
var addTask = (ctx) => {
    console.log({ mmh: ctx.verifiedData }, ctx.taskData);
    var taskDetails = {
        taskId: uuid4(),
        taskName: ctx.taskData.taskName,
        taskDescription: ctx.taskData.taskDescription,
        taskAddedTime: Date.now(),
        taskStatus:'Not Completed'
    };
    var emailId = ctx.verifiedData.emailId;
    var userId = ctx.verifiedData.userId;
    var params = {
        TableName: 'Users',
        Key: {
            "userId": userId,
            "emailId": emailId
        },
        UpdateExpression: "set tasks=list_append(tasks, :newTask)",

        ExpressionAttributeValues: {
            ":newTask": [taskDetails],
        },
        ReturnValues: "UPDATED_NEW"
    };
    console.log("params", params);
    var promiseAddTask = new Promise((resolve, reject) => {
        docClient.update(params, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
    return promiseAddTask.then((data) => {
        ctx.body = { Message: "Task Added successfully" };
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { Error: "problem durinig updation" };
        console.log(err);
    });
};

//DELETE - deleting task
var deleteTask = async (ctx) => {
    var deleteTaskName = ctx.request.body.taskName;
    var emailId = ctx.verifiedData.emailId;
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
    await promiseDashBoard.then(async (data) => {
        tasks = data;
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
    for (var i = 0; i < tasks.length; i++) {
        if (new String(tasks[i].taskName).valueOf() == new String(deleteTaskName).valueOf()) {
            tasks.splice(i, 1);
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
            } else {
                resolve(data);
            }
        });
    });
    return promiseAddTask.then((data) => {
        ctx.body = { Message: "Task deleted successfully" };
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { Error: "problem durinig deletion" };
        console.log(err);
    });
};

//POST - view Tasks
var viewTask = (ctx) => {
    var loggerCredintails = ctx.verifiedData;
    console.log(loggerCredintails);
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
        var tasks;
        if (data.tasks.length == 0) {
            tasks = [{
                "taskName": "default task",
                "taskAddedTime": new Date(Date.now()).toString(),
                "taskId": uuid4(),
                "taskDescription": "No task Added yet, this is the defaut task",
                "taskStatus":"Not Completed"
            }];
        }
        else {
            tasks = data.tasks;
            for (var i = 0; i < tasks.length; i++) {
                tasks[i].taskAddedTime = new Date(tasks[i].taskAddedTime).toString();
            }
        }
        ctx.body = {
            "tasks": tasks
        }
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
}

var changeTaskStatus = async (verifiedData,taskName) => {
    console.log("erdfgvhbjnkm,l///",ctx.verifiedData);

    //var taskName = ctx.verifiedData.taskName;
    var emailId = verifiedData.emailId;
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
    await promiseDashBoard.then(async (data) => {
        tasks = data;
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { "Error while accessing dashBoard data": err };
    });
    for (var i = 0; i < tasks.length; i++) {
        if (new String(tasks[i].taskName).valueOf() == new String(taskName).valueOf()) {
            tasks[i].taskStatus=(tasks[i].taskStatus.includes("Not Completed"))?"Completed":"Not Completed";
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
            } else {
                resolve(data);
            }
        });
    });
    return promiseAddTask.then((data) => {
        ctx.status=200;
        ctx.body = { Message: "Task status updated" };
    }).catch((err) => {
        ctx.status = 409;
        ctx.body = { Error: "problem while changing status" };
        console.log(err);
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
    viewTask,
    changeTaskStatus
}
