import assets = require('@aws-cdk/assets');
import apigateway = require('@aws-cdk/aws-apigateway');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import events = require('@aws-cdk/aws-events');
import kinesis = require('@aws-cdk/aws-kinesis');
import lambda = require('@aws-cdk/aws-lambda');
import eventSource = require('@aws-cdk/aws-lambda-event-sources');
import sns = require('@aws-cdk/aws-sns');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/cdk');
import path = require('path');

/**
 * Example of a web/mobile backend like you might see in SAM.
 */
export class WebMobileBackend extends cdk.Stack {
  /*
  Missing the ability to do elaborate authorizers like SAM:
Auth:
  DefaultAuthorizer: MyCognitoAuth # OPTIONAL
  Authorizers:
    MyCognitoAuth:
      UserPoolArn: !GetAtt MyCognitoUserPool.Arn # Can also accept an array
      Identity: # OPTIONAL
        Header: MyAuthorizationHeader # OPTIONAL; Default: 'Authorization'
        ValidationExpression: myauthvalidationexpression # OPTIONAL

    MyLambdaTokenAuth:
      FunctionPayloadType: TOKEN # OPTIONAL; Defaults to 'TOKEN' when `FunctionArn` is specified
      FunctionArn: !GetAtt MyAuthFunction.Arn
      FunctionInvokeRole: arn:aws:iam::123456789012:role/S3Access # OPTIONAL
      Identity:
        Header: MyCustomAuthHeader # OPTIONAL; Default: 'Authorization'
        ValidationExpression: mycustomauthexpression # OPTIONAL
        ReauthorizeEvery: 20 # OPTIONAL; Service Default: 300

    MyLambdaRequestAuth:
      FunctionPayloadType: REQUEST
      FunctionArn: !GetAtt MyAuthFunction.Arn
      FunctionInvokeRole: arn:aws:iam::123456789012:role/S3Access # OPTIONAL
      Identity:
        # Must specify at least one of Headers, QueryStrings, StageVariables, or Context
        Headers: # OPTIONAL
          - Authorization1
        QueryStrings: # OPTIONAL
          - Authorization2
        StageVariables: # OPTIONAL
          - Authorization3
        Context: # OPTIONAL
          - Authorization4
        ReauthorizeEvery: 0 # OPTIONAL; Service Default: 300
  */
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.String
      }
    });

    const handler = new lambda.Function(this, 'Backend', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'cron.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810
    });
    table.grantReadWriteData(handler.role);

    const api = new apigateway.LambdaRestApi(this, 'Api', {
      handler,
      proxy: false
    });
    const users = api.root.addResource('users');
    const user = users.addResource('{userId}');

    users.addMethod('GET');
    users.addMethod('POST');
    user.addMethod('GET');
  }
}

/**
 * Example of scheduling a function to run on a schedule.
 *
 * Also shows how a dead letter queue and X-Ray tracing can be enabled.
 */
export class CronJob extends cdk.Stack {
/*
MISSING: Ability to encrypt environment variables.
MISSING: ReservedConcurrentExecutions
*/
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dlq = new sqs.Queue(this, 'DLQ');

    const func = new lambda.Function(this, 'Job', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'cron.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810,
      deadLetterQueue: dlq,
      tracing: lambda.Tracing.Active
    });

    new events.EventRule(this, 'Schedule', {
      scheduleExpression: 'rate(1 minute)',
      targets: [func]
    });
  }
}

export class NotificationsProcessing extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Process data from a SNS topic
    const topic = new sns.Topic(this, 'Topic');
    const topicConsumer = new lambda.Function(this, 'TopicConsumer', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'sns-consumer.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810
    });
    topicConsumer.addEventSource(new eventSource.SnsEventSource(topic));
  }
}

export class RealTimeDataProcessing extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Process data in a Kinesis stream
    const stream = new kinesis.Stream(this, 'Stream');
    const streamConsumer = new lambda.Function(this, 'StreamConsumer', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'kinesis-consumer.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810
    });
    streamConsumer.addEventSource(new eventSource.KinesisEventSource(stream, {
      startingPosition: lambda.StartingPosition.TrimHorizon
    }));

    // Process data from a SQS queue
    const queue = new sqs.Queue(this, 'Queue');
    const queueConsumer = new lambda.Function(this, 'QueueConsumer', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'sqs-consumer.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810
    });
    queueConsumer.addEventSource(new eventSource.SqsEventSource(queue, {
      batchSize: 10
    }));

    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'id',
        type: dynamodb.AttributeType.String
      },
      streamSpecification: dynamodb.StreamViewType.NewImage
    });
    const dynamoConsumer = new lambda.Function(this, 'DynamoConsumer', {
      code: new lambda.AssetCode(path.join(__dirname, '..', 'handlers', 'dynamo-consumer.js'), assets.AssetPackaging.File),
      handler: 'index.js',
      runtime: lambda.Runtime.NodeJS810
    });
    dynamoConsumer.addEventSource(new eventSource.DynamoEventSource(table, {
      startingPosition: lambda.StartingPosition.TrimHorizon
    }));
  }
}
