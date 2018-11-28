const fs = require('fs');

tokenFile = process.argv[2];

if (!fs.existsSync(tokenFile)) {
    console.error(`Could not find file ${tokenFile}, aborting...`)
}

process.stdout.write(fs.readFileSync(tokenFile));
