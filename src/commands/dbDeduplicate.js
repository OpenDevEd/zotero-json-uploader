const dbDeduplicate = async (yargs) => {
    yargs.option('export', {
        alias: '-e',
        describe: 'Export the deduplicated data',
        type: 'boolean',
        demandOption: true,
        default: false
    }).option('rank', {
        alias: '-r',
        describe: 'Rank the deduplicated data',
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
        demandOption: (await yargs.argv).rank !== null
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
        alias: 'relevance',
        describe: 'Relevance ranking',
        type: 'boolean',
        demandOption: false,
        default: false
    });

    // add just if the user chooses relevance ranking
    const args = await yargs.argv;
    if (args.relevance) {
        yargs.option('fields', {
            alias: 'f',
            describe: 'Specify the fields to export',
            type: 'array',
            demandOption: true,
        }).option('search', {
            alias: 's',
            describe: 'Specify the search term for ranking',
            type: 'string',
            demandOption: true,
        }).option('sort', {
            describe: 'Specify the sort order',
            choices: ['asc', 'desc'],
            default: 'asc',
            demandOption: true,
        });

        const { fields } = await yargs.argv;
        if (!fields || fields.length === 0) {
            console.log('Fields must be specified'.red);
            process.exit(1);
        }

        if (!fields.every(field => ['title',
            'abstract',
            'date',
            'keywords',
            'doi',
            'sourceDatabase',
            'identifierInSource',
            'originalJson',
            'searchId'
        ].includes(field))) {
            console.log('Invalid field name. Field name must be one of title, abstract, keywords, doi, date, key, flag'.red);
            process.exit(1);
        }
    }
}

module.exports = { dbDeduplicate }