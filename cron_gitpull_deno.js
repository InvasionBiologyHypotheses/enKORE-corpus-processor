
// ##### ==============================================================================
// ##### This script provides the cron for the (git pull)
// ##### It is designed to be applied one a week, or once every forthnight to bring
// ##### contents from the GitHub. Therefore, the results can be generated externally,
// ##### and transferred to GitHub periodically, while this script updates the EndPoint
// ##### ==============================================================================
// ##### Comment about meta and source of input data
// ##### Name: cron_gitpull_deno.js
// ##### Purpose: To pull contents from the GitHub into Toolforge
// ##### Authors: https://github.com/InvasionBiologyHypotheses
// ##### Version: unknown and in progress
// ##### Version-date: 00/00/0000
// ##### Additional comments: N/A
// ##### ==============================================================================
// ##### Comment for initialisation
// ##### Note: This script is to run directly with DENO.
// ##### COMMAND @ anywhere: $ deno run -A --unstable cron_gitpull_deno.js (if deno is added to path)
// ##### COMMAND @ local-machine: $ /home/fernando/.deno/bin/deno run -A --unstable cron_gitpull_deno.js
// ##### COMMAND @ Toolforge: /data/project/enkore/.deno/bin/deno run -A --unstable cron_gitpull_deno.js
// ##### ==============================================================================


// ###########################################
// ##### Import required modules (START) #####
// ###########################################
//import * as mod from "https://deno.land/std@0.110.0/node/child_process.ts"; // ##### Note: Can be further used
import {cron, daily, monthly, weekly} from 'https://deno.land/x/deno_cron/cron.ts';

// #########################################
// ##### Import required modules (END) #####
// #########################################

// ###########################################
// ##### Function to run gitpull (START) #####
// ###########################################
async function run_gitpull() {

    const td = new TextDecoder();

    console.log("##########     Command-1     ##########");
    const p1 = await new Deno.Command("git", { args: ["init"] })
    .output();
    const out1 = td.decode(p1.stdout).trim();
    const err1 = td.decode(p1.stderr).trim();
    console.log("STDOUT ==> ", out1);
    console.log("STDERR ==> ", err1);

    console.log("##########     Command-2     ##########");
    const p2 = await new Deno.Command("git", { args: ["status"] })
    .output();
    const out2 = td.decode(p2.stdout).trim();
    const err2 = td.decode(p2.stderr).trim();
    console.log("STDOUT ==> ", out2);
    console.log("STDERR ==> ", err2);

    console.log("##########     Command-3     ##########");
    const p3 = await new Deno.Command("git", { args: ["pull"] })
    .output();
    const out3 = td.decode(p3.stdout).trim();
    const err3 = td.decode(p3.stderr).trim();
    console.log("STDOUT ==> ", out3);
    console.log("STDERR ==> ", err3);

    console.log("##########     Command-4     ##########");
    const p4 = await new Deno.Command("git", { args: ["checkout"] })
    .output();
    const out4 = td.decode(p4.stdout).trim();
    const err4 = td.decode(p4.stderr).trim();
    console.log("STDOUT ==> ", out4);
    console.log("STDERR ==> ", err4);

}
// run_gitpull();
// #########################################
// ##### Function to run gitpull (END) #####
// #########################################


// ########################################
// ##### Function to run cron (START) #####
// ########################################
async function run_cron_option1(sec1,min1,hr1,weekday1) {

    console.log(`Log(run_cron_option1): Started cron`);  

    // #################################################
    // ##### Adjusting weekday from word to number #####
    let weekday_1number = 0; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
    if (weekday1 == "Monday" || weekday1 == "monday" || weekday1 == "Mon" || weekday1 == "mon") { weekday_1number++; }
    if (weekday1 == "Tuesday" || weekday1 == "tuesday" || weekday1 == "Tue" || weekday1 == "tue") { weekday_1number+=2; }
    if (weekday1 == "Wednesday" || weekday1 == "wednesday" || weekday1 == "Wed" || weekday1 == "wed") { weekday_1number+=3; }
    if (weekday1 == "Thursday" || weekday1 == "thursday" || weekday1 == "Thu" || weekday1 == "thu") { weekday_1number+=4; }
    if (weekday1 == "Friday" || weekday1 == "friday" || weekday1 == "Fri" || weekday1 == "fri") { weekday_1number+=5; }
    if (weekday1 == "Saturday" || weekday1 == "saturday" || weekday1 == "Sat" || weekday1 == "sat") { weekday_1number+=6; }
    if (weekday1 == "Sunday" || weekday1 == "sunday" || weekday1 == "Sun" || weekday1 == "sun") { weekday_1number+=7; }
    const weekday_1string = weekday_1number.toString();
    // #################################################

    // ##### passed variables: Function-1
    const sec_1 = sec1;
    const min_1 = min1;
    const hr_1 = hr1;
    // const weekday_1 = weekday1; // ##### Note: Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7)
    const cron_string_control1 = '' + sec_1 + ' ' + min_1 + ' ' + hr_1 + ' * * */' + weekday_1string + '';
  
    // ##### Function-1
    cron(cron_string_control1, () => { console.log(`################################################################## Log(run_cron_option1): to process run_gitpull()!`); run_gitpull(); });
  
}
// ######################################
// ##### Function to run cron (END) #####
// ######################################

// ##### Input: Function-1
const sec1 = "1";
const min1 = "40";
const hr1 = "17"; // ##### Note: 24format
const weekday1 = "Monday"; 
// ##### Note: It has been adjusted inside the function so use words (e.g. Monday, or monday, or Mon, or mon)
// ##### Note: Before it was required to apply numbers. For example, Monday (1), Tuesday (2),..., Saturday (6), Sunday (0 or 7). 
  
// ##### Function to call Functions
run_cron_option1(sec1,min1,hr1,weekday1);