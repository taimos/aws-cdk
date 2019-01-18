import apigateway = require('@aws-cdk/aws-apigateway');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import lambda = require('@aws-cdk/aws-lambda');
import cdk = require('@aws-cdk/cdk');

/**
 * Example of a web/mobile backend like you might see in SAM.
 */
export class WebMobileBackend extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.String
      }
    });

    const handler = new lambda.Function(this, 'Backend', {
      code: lambda.Code.asset('handler'),
      handler: 'index.handler',
      runtime: lambda.Runtime.NodeJS810,
      environment: {
        tableName: table.tableName
      }
    });
    table.grantReadWriteData(handler.role);

    const api = new apigateway.LambdaRestApi(this, 'Api', {
      handler,
      proxy: false
    });
    const todo = api.root.addResource('todo');
    const list = todo.addResource('{listId}');

    todo.addMethod('POST'); // Create a new list
    list.addMethod('GET'); // Get the list by ID
  }
}

const app = new cdk.App();
const backend = new WebMobileBackend(app, 'backend');

app.run();
