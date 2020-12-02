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

var params = {
    TableName: "Users",
    Item: {
        "name":  movie.year,
        "password":  movie.info
    }
};