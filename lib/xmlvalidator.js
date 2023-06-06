// ###########################################
// ##### Import required modules (START) #####
// ###########################################

// ##### Note: It is needed to bring some standard modules from Node to process some information
// ##### Note: https://reflect.run/articles/how-to-use-node-modules-in-deno/#:~:text=The%20Deno%20std%2Fnode%20library,to%20import%20and%20use%20Node.
import { createRequire } from "https://deno.land/std/node/module.ts";
const require = createRequire(import.meta.url);

// ##### Note: function to log in different files when needed
import { function_log_new } from "./log.js";
import { function_log_append } from "./log.js";

// #########################################
// ##### Import required modules (END) #####
// #########################################