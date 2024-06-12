const dbDeduplicate = async (yargs) => {
    yargs.option('export', {
        alias: '-e',
        describe: 'Export the deduplicated database table to csv or json format, depending on the filename (see --output)',
        type: 'boolean',
        demandOption: true,
        default: false
    }).option('rank', {
        alias: '-r',
        describe: 'Select from the database by rank. By default, ranks smaller than the number provided are selected. Use --compare to modify the selection.',
        type: 'number',
        demandOption: true,
        default: null
    }).option('compare', {
        alias: '-c',
        describe: 'Choose the comparison operator to apply.',
        choices: [
            'equals',  // eq
            'gt',      // greater than
            'gte',     // greater than or equal to
            'lt',      // less than
            'lte',     // less than or equal to
        ],
        default: 'lte'
    }).option('output', {
        alias: 'o',
        describe: 'Specify the output file name with .json or .csv extension',
        type: 'string',
        demandOption: false, // Optional
        default: 'output.json', // Default to output.json if not provided
        coerce: (output) => {
            // Ensure the file name ends with .json or .csv
            if (!output.endsWith('.json') && !output.endsWith('.csv')) {
                console.log('Output file name must end with .json or .csv extension'.red);
                process.exit(1);
            }
            return output;
        }
    }).option('limit', {
        alias: 'l',
        describe: 'Limit the number of records to export',
        type: 'number',
        demandOption: true,
        default: null
    }).option('relevance', {
        alias: 'r',
        describe: 'Perform a relevance ranking of the database, according to the terms provided below.',
        type: 'boolean',
        demandOption: false,
        default: false
    }).option('rstring', {
        alias: 's',
        describe: 'Search the database for the search terms specified, e.g. --string future',
        type: 'string',
    }).option('rfields', {
        alias: 'f',
        describe: 'Specify the fields that will be used for the relevance ranking',
        type: 'array',
        demandOption: false,
        default: [],
    }).option('rsort', {
        alias: 't',
        describe: 'Specify the sort order',
        choices: ['asc', 'desc'],
        default: 'desc',
        demandOption: false
    });

    // console.log(await yargs.argv);
    // process.exit(0);

    // add just if the user chooses relevance ranking
    // const args = await yargs.argv;
    // if (args.relevance) {
    //     const { fields } = await yargs.argv;
    //     if (!fields || fields.length === 0) {
    //         console.log('Fields must be specified'.red);
    //         process.exit(1);
    //     }

    //     if (!fields.every(field => ['title',
    //         'abstract',
    //         'date',
    //         'keywords',
    //         'doi',
    //         'sourceDatabase',
    //         'identifierInSource',
    //         'originalJson',
    //         'searchId'
    //     ].includes(field))) {
    //         console.log('Invalid field name. Field name must be one of title, abstract, keywords, doi, date, key, flag'.red);
    //         process.exit(1);
    //     }
    // }
}

module.exports = { dbDeduplicate }