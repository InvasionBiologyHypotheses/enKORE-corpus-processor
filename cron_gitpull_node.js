
// ##### ==============================================================================
// ##### This script provides the cron for the (git pull)
// ##### It is designed to be applied one a week, or once every forthnight to bring
// ##### contents from the GitHub. Therefore, the results can be generated externally,
// ##### and transferred to GitHub periodically, while this script updates the EndPoint
// ##### ==============================================================================
// ##### Comment about meta and source of input data
// ##### Name: cron_gitpull_node.js
// ##### Purpose: To pull contents from the GitHub into Toolforge
// ##### Authors: https://github.com/InvasionBiologyHypotheses
// ##### Version: unknown and in progress
// ##### Version-date: 00/00/0000
// ##### Additional comments: N/A
// ##### ==============================================================================
// ##### Comment for initialisation
// ##### Note: This script is to run directly with NODE.
// ##### Note: This script is prepared for (cron), but cron was not here implemented because
// ##### DENO options is considred (cron_gitpull_deno.js).
// ##### COMMAND @ anywhere: $ node test1.js (if node is added to path)
// ##### ==============================================================================


// ###########################################
// ##### Import required modules (START) #####
// ###########################################
const execSync = require('child_process').execSync;
// import { execSync } from 'child_process';  // replace ^ if using ES modules

// #########################################
// ##### Import required modules (END) #####
// #########################################


try {
    const command2_string = 'git init; git status; git pull;';
    const command2 = execSync(command2_string, { encoding: 'utf-8' });  // the default is 'buffer'
    console.log('return:\n', command2);
} catch(err) {
    console.log('return:\n', 'failed');
}


