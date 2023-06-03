// ##### Note: It is needed to bring some standard modules from Node to process some information
// ##### Note: https://reflect.run/articles/how-to-use-node-modules-in-deno/#:~:text=The%20Deno%20std%2Fnode%20library,to%20import%20and%20use%20Node.
import { createRequire } from "https://deno.land/std/node/module.ts";
const require = createRequire(import.meta.url);


// #######################################
// ##### Function to log_new (START) #####
// #######################################
// ##### Note: To write logs which are new
export function function_log_new(dir,filename,c) {

  const content = c;
  const filename_path = `${dir}${filename}`;

  const fs = require('fs/promises');

  try {

    fs.writeFile(filename_path, content);

  } catch (err) {

    console.log(err);

  }

  return 0

}
// #####################################
// ##### Function to log_new (END) #####
// #####################################

// ##########################################
// ##### Function to log_append (START) #####
// ##########################################
// ##### Note: To write logs in independent files
export function function_log_append(dir,filename,c) {

  const content = c;
  const filename_path = `${dir}${filename}`;

  const fs = require('fs');

  // const fs = require('fs'); // ##### Note: just called before synchronous function to check existence of file
  // ##### Note: to append information.
  fs.open(filename_path,'a',666,function(e,id) {
    fs.write(id,"\r\n" + content, null, 'utf8', function(){
      fs.close(id,function(){
      });
    });
  });

  return 0

}
// ########################################
// ##### Function to log_append (END) #####
// ########################################