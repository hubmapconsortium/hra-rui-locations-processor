# HRA - RUI  Locations Processor

The HRA - RUI Locations Processor is a basic tool for processing the RUI Locations to minimize the human efforts and reducing the errors thereby maintaining the consistency across the application.

## Steps to install the software

### 1. Clone the repo

```bash
$ git clone https://github.com/hubmapconsortium/hra-rui-locations-processor.git
$ cd hra-rui-locations-processor
$ git checkout develop
```

### 2. Installing the software

```bash
$ npm ci
```

### 3. Interacting with the software

The software can be interacted with a terminal. There are two options the software provides:

- ```normalize```: With this option, the  ```registrations.yaml``` file will be scanned, the missing metadata will be generated and added, and ```rui_locations.jsonld``` file will be generated.

- ```json-schema```: With this option, a new json schema will be exported which can be used to validate the ```registrations.yaml``` file.

  #### Commands to interact with the softwarea

​		Open a terminal and refer the commands below. (Ensure you are in ```src``` folder to execute the ```cli.js``` commands. )

```bash
$ cd src
$ ./cli.js <option> <path/to/directory>

# Example:
$ ./cli.js normalize ./data/sea-ad/      # This command will normalize the registrations.yaml file. It will search for the file in '.data/sea-ad/' folder.
$ ./cli.js json-schema ./temp/file.json  # This command will generate a new json-schema which will be used to validate against the registrations.yaml file. The new json-schema will be created in the temp folder, the file name will be file.json
$ ./cli.js --help 	# This command will show the help menu which displays the options and descriptions.
```

If everything goes well, after executing the commands, you will not see any error(s). 