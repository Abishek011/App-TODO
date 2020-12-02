//Aws - sdk
const aws = require('aws-sdk');

//Configuring the database..
aws.config.update({
    accessKeyId: 'rajaram',
    secretAccessKey: 'rajaram',
    region: "us-west-2",
    endpoint: "http://localhost:8000"
});

//Getting schema from the file..
var tableSchema = require('./tableSchema');

//Configuring dynamoDB from aws
var dataBase = new aws.DynamoDB();

//Table Creation
dataBase.createTable(tableSchema.user, (err, data) => {
    if (err) {
        console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
    }
    else {
        console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
    }
});
