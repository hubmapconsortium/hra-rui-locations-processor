# HRA - RUI  Locations Processor

The HRA - RUI Locations Processor is a basic tool for processing the RUI Locations to minimize the human efforts and reducing the errors thereby maintaining the consistency across the application.

## Steps to install the software

### Prerequisite

- Microsoft Visual Studio Code ( VS Code) - https://code.visualstudio.com/download
- Adding the YAML Extension - In the VS Code, on the vertical ribbon (Activity Bar) to the left click on Extension icon (![extensions_icon](https://github.com/hubmapconsortium/hra-rui-locations-processor/assets/88348124/9c2a58f6-d292-40cf-baf4-dae371c0f015)) and search for ```yaml``` and chose the one developed by Red Hat (![YAML_RedHat](https://github.com/hubmapconsortium/hra-rui-locations-processor/assets/88348124/9e88d2c7-b412-4f4f-9eff-6139b05d3fdf)) and install. 

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

  #### Commands to interact with the software

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

## Documentation

The tool uses YAML file to generate the jsonld file containing the providers, and the RUI Locations. The examples (refer [here](https://github.com/hubmapconsortium/hra-rui-locations-processor/tree/develop/examples)) provides 3 schemas. Refer the ```registrations.yaml``` file in each folder to view the schemas. 

Notice the first line of each ```registrations.yaml``` file, (``` # yaml-language-server: $schema=../../registrations.schema.json```). The YAML file will be validated against this ``` registrations.schema.json``` file. 

So, on first line of every ```registrations.yaml``` file, you need to mention the path of schema file (schema.json) file.

``` # yaml-language-server: $schema=<path/to/schema.json>```

Once the schema file is set, and loaded properly into the yaml file ( Setting the first line) you can start entering the data. 

**YAML is case-sensitive and whitespace-sensitive and indentation defines the structure.**

