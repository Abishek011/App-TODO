route.post("/addTask",verifyToken,(ctx) => {
   
    jwt.verify(ctx.token, 'secretkey',async (err, authData) => {
        if (err) {
            ctx.body = { msg: "Error while verifying the token err : " + err };
        } else {
            
            console.log(authData);
            var emailId = authData.tokenPayLoad.emailId;
            var userId = authData.tokenPayLoad.userId;
            var taskName = ctx.query.task;
            var taskDescription = ctx.query.description;

            var param = {
                TableName: 'Users',
                ProjectionExpression: 'Task',
                FilterExpression: "#ur = :email",
                ExpressionAttributeNames: {
                    "#ur": "emailId"
                },
                ExpressionAttributeValues: {
                    ":email": emailId
                }
            };
                var pros = new Promise((resolve,reject)=>{
                docClient.scan(param,(err,data)=>{
                        if (err) {
                            console.log(" : Error while fetching data : " + err);
                        } else {
                            var result=true;
                            data.Items[0].Task.forEach(element => {
                                if(element.task_name==taskName){
                                    result=false;
                                    console.log(element.task_name);
                                }
                            });
                            if(!result){
                                //console.log();
                                    reject(data);
                            }else{
                                var params = {
                                    TableName: 'Users',
                                    Key: {
                    
                                        "emailId": emailId,
                                        "userId": userId
                                    },
                                    UpdateExpression: "set #Task=list_append(#Task, :taskm)",
                                    ExpressionAttributeNames: {
                                        '#Task': "Task"
                                    },
                                    ExpressionAttributeValues: {
                                        ":taskm": [({
                                            task_id: uuid4(),
                                            task_name: taskName,
                                            task_description: taskDescription,
                                            task_added_time: Date.now()
                                        })]
                                    },
                                    ReturnValues: "ALL_NEW"
                                };
                                return new Promise((resolve,request)=>{
                                //Update the task list with new tasks
                                docClient.update(params, (err, data) =>{
                                    if (err) {
                                        console.error("Unable to add task. Error JSON:", JSON.stringify(err, null, 2));
                                        ctx.throw(401,"Unable to add task.");
                                    } else {
                                        console.log("Added task : ",JSON.stringify(data,null,2));
                                    }
                                });
                            });
                            }
                        }
                });});
                await pros.then((data)=>{
                    ctx.body={"msg":"yes"};
                    console.log("+++");
                }).catch((data)=>{
                    ctx.body={"msg":"no"};
                    console.log("+++//");
                });
                ctx.body={"msg":pros};
        }
    });
});


// ----------------------------------------------------------------------------------------------

function verifyToken(ctx, next) {
    //getting token from 'Authorization' header
const bearerHeader = ctx.headers['authorization'];

//Check if type is undefined 
if (typeof bearerHeader !== 'undefined') {
    ctx.token =bearerHeader.split(' ')[1];
    next();
} else {
    ctx.throw(401, 'Forbidden');
}; 
}



    //Checking database for emailId of user...
    var emailId = ctx.request.body.emailId;
    var params = {
        TableName: "Users",
        ProjectionExpression: '#ur,password',
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
                console.log(data);
                if (Number(data.Count) < 1 || bcrypt.compareSync(ctx.request.body.password, data.Items[0].password)) {
                    ctx.status = 409;
                    ctx.body = { "Message": "User doesn't exist / check email or password" };
                    console.log("correct22");
                }
                else {
                    logInCredintails=data.Items[0];
                    //Get token from cookie set by [signUp] route...
                    ctx.token = ctx.cookies.get("authToken");

                    //check token for expire..
                    var isExpired = false;
                    try {
                        jwt.verify(ctx.token, process.env.SIGN_TOKEN_KEY)
                    } catch (err) {
                        if (err.name == "TokenExpiredError") {
                            isExpired = true;
                        }
                    }
                    console.log(isExpired);
                    //check for direct login straight from signUp..  
                    if (ctx.token == undefined || isExpired) {
                        console.log("correct");
                        //Signing the token for new login
                        var promiseLogIn = new Promise((resolve, reject) => {
                            jwt.sign(logInCredintails, process.env.SIGN_TOKEN_KEY, { expiresIn: '1h' }, (err, token) => {
                                if (err) {
                                    reject(err);
                                }
                                else {
                                    resolve(token);
                                }
                            });
                        });
                        return promiseLogIn.then((token) => {
                            ctx.token = token;
                            console.log("correct");
                            jwt.verify(ctx.token, process.env.SIGN_TOKEN_KEY, (err, data) => {
                                if (err) {
                                    console.log({ "verify": err });
                                    ctx.status = 412;
                                    ctx.body = { "Message : 'Token verification problem' ": err };
                                }
                                else {
                                    ctx.verifiedData = data;
                                }
                                next();
                            });
                        }).catch((err) => {
                            ctx.status = 412;
                            ctx.body = { "Message": { 'Token  signing problem : ': err } };
                        });
                    }
                }
            }
            resolve();
        });
    });