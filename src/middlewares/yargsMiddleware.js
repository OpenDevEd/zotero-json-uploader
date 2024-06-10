const path = require('path');
const defaultPath = path.join(__dirname, '../../');
const fs = require('fs');

const yargsMiddleware = async (args) => {
    if (!['zotero', 'db-upload'].includes(args._[0]))
        return;
    if (args.transform === 'jq' && !args.jq) {
        console.log('JQ option is missing');
        process.exit(1);
    }

    const transformOptions = [
        'jq',
        'openalex',
        'openalexjs',
        'scholarly',
        'scopus',
        'scitejq',
    ];

    if (args.transform == "openalexjs") {
        // TODO: openalexjs transform option not implemented yet
        console.log('openalexjs transform option not implemented yet');
        process.exit(1);
    };

    if (args.transform && !transformOptions.includes(args.transform)) {
        console.log('Transformation option is not one of the options');
        process.exit(1);
    }

    if (args.jq) {
        if (!fs.existsSync(args.jq)) {
            console.log('JQ file not found');
            process.exit(1);
        }
    }

    if (args.jq && !args.transform) {
        // Allow both `--jq abc.jq --transform jq` and just `--jq abc.jq`.
        /* 
        If these conditions are met, the code sets the transform argument to "jq". 
        This allows the user to either provide both --jq abc.jq --transform jq or just --jq abc.jq when running the script. 
        In the latter case, the transform argument is automatically set to "jq".
        */
        args.transform = "jq";
    };
    if (args.jq && args.transform != 'jq') {
        // If jq file is provided, transform option must be jq
        // Disallow, e.g. `--jq abc.jq --transform openalexjq`
        console.log('JQ file provided but transform option is not jq: Remove --jq or change transform option (--transform) to jq');
        process.exit(1);
    };

    if (args.files && args.files.length > 0) {
        for (file of args.files) {
            try {
                const stats = fs.statSync(path.join(defaultPath, file));
                if (!stats.isFile()) {
                    console.log('Path is not a file: ' + file);
                    process.exit(1);
                }
            } catch {
                console.log('File not found: ' + file);
                process.exit(1);
            }
        }
    } else {
        console.log('No files provided');
        process.exit(1);
    }
}

module.exports = { yargsMiddleware }