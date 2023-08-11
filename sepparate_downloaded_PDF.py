
import os

#####################################################
#####################################################

def file_remove(file_path):

    try:

        os.remove(file_path);

        print(f"File '{file_path}' has been successfully removed.");
    
    except FileNotFoundError:

        print(f"The file '{file_path}' was not found.");
    
    except Exception as e:

        print(f"An error occurred: {e}");

output_file_path1 = "PDF_obtained.txt"  # Replace with the desired output file path
output_file_path2 = "PDF_not_obtained.txt"  # Replace with the desired output file path

try:

    file_remove(output_file_path1);
    open(output_file_path1, 'a').close();
    print(f"The file '{output_file_path1}' has just been emptied.");

    file_remove(output_file_path2);
    open(output_file_path2, 'a').close();
    print(f"The file '{output_file_path2}' has just been emptied.");

except:

    print(f"The file '{output_file_path1}' was not found.");
    print(f"The file '{output_file_path2}' was not found.");

finally:

    print(f"Proceeding.");

#####################################################
#####################################################

file_read = "Log_DOI_list_8906items_complete.txt";

try:

    with open(file_read, "r") as file:

        for line in file:

            # Process each line here
            line = line.strip();  # Remove leading and trailing whitespace

            with open(output_file_path1, "r") as file_path1:

                #read whole file to a string
                data1 = file_path1.read();

                if line not in data1 and "## NOT" in line:

                    with open(output_file_path1, "a") as output_file_temp:

                        output_file_temp.write(line);
                        output_file_temp.write("\n");

            with open(output_file_path2, "r") as file_path2:

                #read whole file to a string
                data2 = file_path2.read();

                if line not in data2 and "## NOT" not in line:

                    with open(output_file_path2, "a") as output_file_temp:

                        output_file_temp.write(line);
                        output_file_temp.write("\n");

except Exception as e:
    
    print(f"An error occurred: {e}");

###########################################################



