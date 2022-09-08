const path = require( 'path' );

const { Stack, Duration } = require( 'aws-cdk-lib' );

const lambda = require( 'aws-cdk-lib/aws-lambda' );
const lambdaNodeJs = require( 'aws-cdk-lib/aws-lambda-nodejs' );
const events = require( 'aws-cdk-lib/aws-events' );
const eventTargets = require( 'aws-cdk-lib/aws-events-targets' );

class NotionAutomatedTitlesStack extends Stack {
    constructor( scope, id, props ) {
        super( scope, id, props );

        const fn = new lambdaNodeJs.NodejsFunction( this, 'NotionAutomatedTitles', {
            runtime: lambda.Runtime.NODEJS_16_X,
            entry: path.join( __dirname, '../src/index.js' ),
            bundling: {
                nodeModules: [ '@notionhq/client' ]
            },
            environment: {
                'NOTION_INTEGRATION_SECRET_KEY': '<--update-this-before-deploying-->',
                'NOTION_AUTOMATION_CONFIGURATION_DATABASE_ID': '<--update-this-before-deploying-->'
            },
            timeout: Duration.minutes( 3 )
        } );

        const triggerRule = new events.Rule( this, 'NotionAutomatedTitlesTriggerRule', {
            ruleName: 'NotionAutomatedTitlesTriggerRule',
            schedule: events.Schedule.expression( 'cron(0/15 * * * ? *)' ),
            targets: [ new eventTargets.LambdaFunction( fn ) ]
        } );
    }
}

module.exports = { NotionAutomatedTitlesStack }
