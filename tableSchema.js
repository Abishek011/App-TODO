const { LexModelBuildingService } = require("aws-sdk");

//Databse table schema
var user = {
    TableName: 'Users',
    KeySchema: [
        {
            AttributeName: 'userId', KeyType: 'HASH'
        },
        {
            AttributeName: 'emailId', KeyType: 'RANGE'
        }
    ],
    AttributeDefinitions: [
        {
            AttributeName: 'userId', AttributeType: "S"
        },
        {
            AttributeName: 'emailId', AttributeType: 'S'
        }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

module.exports.user = user;
