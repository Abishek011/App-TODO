const { LexModelBuildingService } = require("aws-sdk");

//Databse table schema
var user = {
    TableName: 'Users',
    KeySchema: [
        {
            AttributeName: 'userId', KeyType: 'HASH'
        }
    ],
    AttributeDefinitions: [
        {
            AttributeName: 'userId', AttributeType: "N"
        }
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 10, 
        WriteCapacityUnits: 10
    }
};

module.exports.user = user;
