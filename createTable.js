//Aws - sdk
const aws = require('aws-sdk');

//Koa modules...
const koa = require("koa");
const bodyParser = require('koa-bodyparser');
const router = require('koa-router');

//Koa
const app = new koa();

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
var createTable=function(){
    //return console.log("yes");
    dataBase.createTable(tableSchema.user, createTable);
    function createTable(err, data) {
        if (err) {
            console.error("Unable to create table Error JSON:", JSON.stringify(err, null, 2));
            ctx.body = { "Unable to create table Error JSON:": err };
        }
        else {
            console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
            ctx.body = { "Created table. Table description JSON:": data };
        }
        next();
    }
}
module.exports.createTable=createTable; 