const { LexModelBuildingService } = require("aws-sdk");

//Databse table schema
var user = {
    TableName: 'Users',
    KeySchema: [
        {
            AttributeName: 'userName', KeyType: 'HASH'
        },
        {
            AttributeName: 'password', KeyType: 'RANGE'
        }
    ],
    AttributeDefinitions: [
        {
            AttributeName: 'userName', AttributeType: "S"
        },
        {
            AttributeName: 'password', AttributeType: "S"
        }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

module.exports.user = user;
