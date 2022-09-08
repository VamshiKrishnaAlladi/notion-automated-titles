const { Client } = require( "@notionhq/client" );

const notion = new Client( { auth: process.env.NOTION_INTEGRATION_SECRET_KEY } );

const log = ( message, details ) => {
    const newLine = '\n';

    console.log( `${newLine}${message}${details ? JSON.stringify( details, null, 4 ) : ''}${newLine}` );
}

const getNotionDatabaseEntires = async ( { databaseId, filter, sorts } ) => {
    const entries = [];
    let cursor;

    while ( true ) {
        const { results, has_more, next_cursor } = await notion.databases.query( {
            database_id: databaseId,
            start_cursor: cursor,
            filter,
            sorts
        } );

        entries.push( ...results );

        cursor = next_cursor;

        if ( !has_more ) {
            break;
        }
    }

    return entries;
};

const updateModifiedEntries = async ( modifiedEntries ) => {
    try {
        return Promise.all( modifiedEntries.map( entry => notion.pages.update( {
            page_id: entry.id,
            properties: {
                "Title": {
                    "title": [
                        {
                            "type": "text",
                            "text": {
                                "content": entry.properties.GeneratedTitle.formula.string
                            }
                        }
                    ]
                },
            }
        } ) ) );
    } catch ( error ) {
        log( 'Something went wrong. Error:', error );
    }
};

const updateTitles = async ( { name, databaseId } ) => {
    log( `Fetching the modified entries in "${name}" DB.` );

    const modifiedEntries = await getNotionDatabaseEntires( {
        databaseId,
        filter: {
            and: [
                {
                    "property": "MatchingTitles?",
                    "checkbox": {
                        "equals": false
                    }
                }
            ]
        }
    } );

    log( `Found ${modifiedEntries.length} modified entries in "${name}" DB.` );

    if ( modifiedEntries.length === 0 ) { return true; }

    log( `Attempting to update the modified Titles in the DB "${name}" ...` );

    const updationPromise = updateModifiedEntries( modifiedEntries );

    log( `Successfully updated the modified Titles in the DB "${name}".` );

    return updationPromise;
};

const handler = async () => {
    const automationConfigurationDBId = process.env.NOTION_AUTOMATION_CONFIGURATION_DATABASE_ID;

    const automationConfigurationEntries = await getNotionDatabaseEntires( {
        databaseId: automationConfigurationDBId
    } );

    const databasesToUpdate = automationConfigurationEntries.map( db => ( {
        id: db.id,
        name: db.properties.Name.title[ 0 ]?.plain_text,
        databaseId: db.properties.DatabaseID.rich_text[ 0 ]?.plain_text,
    } ) );

    log( `Found ${databasesToUpdate.length} Database Entries to update.` );

    log( `Attempting to update the Databases now...` );

    await Promise.all( databasesToUpdate.map( updateTitles ) );
};

module.exports = { handler };
