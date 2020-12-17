//Databse table schema
var user = {
    TableName: 'Users',
    KeySchema: [
        {
            AttributeName: 'emailId', KeyType: 'HASH'
        },
        {
            AttributeName: 'userId', KeyType: 'RANGE'
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
