<div id="badges">
  <a href="https://www.linkedin.com/in/vasilev-vitalii/">
    <img src="https://img.shields.io/badge/LinkedIn-blue?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn Badge"/>
  </a>
  <a href="https://www.youtube.com/@user-gj9vk5ln5c/featured">
    <img src="https://img.shields.io/badge/YouTube-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Youtube Badge"/>
  </a>
</div>

[Русский](README.RUS.md)

# mentator-ddl-creator
**mentator-ddl-creator** is a utility for generating DDL scripts and data population scripts for ORACLE or MSSQL databases (support for POSTGRESQL is planned). The utility allows you to flexibly configure which objects and data to export, and supports both full and partial table data extraction.

## Main Features

* Generate DDL scripts for various database objects (tables, views, indexes, procedures, packages, etc.)
* Generate scripts for full or partial table data population (INSERT)
* Flexible configuration via a JSONC config file
* Password encryption for storing credentials in the config

## Usage Modes

#### Generate a configuration template file
Creates a sample config file (JSONC) that you can edit for your needs.

For ORACLE:
```bash
mentator-ddl-creator --conf-gen-ora /path/to/directory
```
For MSSQL:
```bash
mentator-ddl-creator --conf-gen-mssql /path/to/directory
```

#### Encrypt a database password (optional)
```bash
mentator-ddl-creator --crypt your_password
```
Returns an encrypted password that you can safely use in your config. **Note!** This is basic obfuscation, not strong cryptography.

#### Main mode – generate DDL and data scripts based on a config
```bash
mentator-ddl-creator --conf-use /path/to/your/config.jsonc
```
Reads the config file and generates scripts according to the rules described in it.

## Quick Start

1. #### Generate a config file
For ORACLE:
```bash
mentator-ddl-creator --conf-gen-ora ./
```
For MSSQL:
```bash
mentator-ddl-creator --conf-gen-mssql ./
```

2. #### Open the generated file vv-ddl-get.config.TEMPLATE.ORA.jsonc (or vv-ddl-get.config.TEMPLATE.MSSQL.jsonc) and:
    * Replace all occurrences of 'path/to/' with './'
    * **Windows users:** If the host parameter in the "db"."connection" section contains backslashes (e.g., named instances like `SERVER\INSTANCE`), you must escape them by using double backslashes: `SERVER\\INSTANCE`
    * In the "db"."connection" section, set the actual connection parameters
    * In "objects"."schema"."list", specify the schemas present on your server
    * Save the config file

3. #### Run DDL generation
For ORACLE:
```bash
mentator-ddl-creator --conf-use ./vv-ddl-get.config.TEMPLATE.ORA.jsonc
```
For MSSQL:
```bash
mentator-ddl-creator --conf-use ./vv-ddl-get.config.TEMPLATE.MSSQL.jsonc
```

4. #### Check the results
    * The "log" subdirectory contains the utility's log output
    * The "ddl" subdirectory contains the generated scripts

## Supported Database Objects

### Microsoft SQL Server (MSSQL)

The utility extracts the following database objects for MSSQL:

* **DATABASE** - Database creation script with description (if available)
* **SCHEMA** - Schema creation script including:
  - Schema owner (AUTHORIZATION)
  - Schema description (extended properties)
* **TABLE** - Table structure including:
  - Column definitions with data types
  - Primary key constraints
  - Unique constraints
  - Foreign key constraints with references
  - Default values
  - IDENTITY columns
  - FILEGROUP placement (if enabled in config)
  - Table and column descriptions (extended properties)
* **VIEW** - View definitions
* **INDEX** - Index definitions including:
  - Clustered and non-clustered indexes
  - Unique indexes
  - Index columns with sort order (ASC/DESC)
  - FILEGROUP placement (if enabled in config)
* **TRIGGER** - Trigger definitions
* **PROCEDURE** - Stored procedure definitions
* **FUNCTION** - User-defined function definitions (scalar, inline table-valued, multi-statement table-valued)
* **SEQUENCE** - Sequence definitions with all properties (start value, increment, min/max values, cycle option)
* **SYNONYM** - Synonym definitions
* **TABLE_FILL_FULL** - Full data export scripts (INSERT statements) for specified tables
  - TIMESTAMP/ROWVERSION columns are automatically excluded
* **TABLE_FILL_DEMO** - Partial data export scripts (configurable number of rows)
  - TIMESTAMP/ROWVERSION columns are automatically excluded

All generated scripts automatically include `USE [database_name] GO` at the beginning.

### Oracle Database

The utility extracts the following database objects for Oracle:

* **TABLE** - Table structure including:
  - Column definitions with data types
  - Primary key constraints
  - Unique constraints
  - Foreign key constraints with references
  - Check constraints
  - Default values
  - STORAGE parameters (if enabled in config)
  - TABLESPACE placement (if enabled in config)
  - Table and column comments
* **VIEW** - View definitions
* **MATERIALIZED VIEW (MVIEW)** - Materialized view definitions with:
  - Query definition
  - Refresh options
  - STORAGE parameters (if enabled in config)
* **INDEX** - Index definitions including:
  - B-tree, bitmap, function-based indexes
  - Unique and non-unique indexes
  - Index columns with sort order
  - TABLESPACE and STORAGE parameters (if enabled in config)
* **TRIGGER** - Trigger definitions (table and view triggers)
* **PACKAGE** - Package specifications (headers)
* **PACKAGE_BODY** - Package bodies (implementations)
* **PROCEDURE** - Standalone procedure definitions
* **FUNCTION** - Standalone function definitions
* **TYPE** - Object type specifications
* **TYPE_BODY** - Object type bodies (implementations)
* **SEQUENCE** - Sequence definitions with all properties
* **SYNONYM** - Synonym definitions (public and private)
* **JOB** - DBMS_SCHEDULER job definitions
* **TABLE_FILL_FULL** - Full data export scripts (INSERT statements) for specified tables
* **TABLE_FILL_DEMO** - Partial data export scripts (configurable number of rows)

## Important Notes

1. #### Disabling generation via dir = null
In each config section (e.g., table, view, index, etc.), the dir parameter defines the path for saving the corresponding scripts. If you set dir to null, generation for that object type will be completely disabled. This is useful if you want to exclude, for example, indexes or triggers from export.

2. #### Special behavior for the package_body and type_body sections (Oracle only)
In these sections, the dir parameter works differently:
* If dir is set, the body is saved to a separate file.
* If dir is null, the body is appended to the same file as the head (if head generation is enabled).

3. #### Priority of full and demo table data population
If a table is listed in table_fill_full.list, a demo script for it will not be generated in the table_fill_demo section.
This avoids duplication and mixing of full and sample data dumps.

4. #### Not intended for bulk export of large tables
The utility is not intended for bulk export of large tables. Full data export is meant for configuration or small reference tables only.
For exporting large volumes of data, use specialized tools.

5. #### Simple password encryption with the utility
You can encrypt your database password using this utility. This allows you to avoid storing the password in plain text in your config file. **Note!** This is basic obfuscation, not strong cryptography.