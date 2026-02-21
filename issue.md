В настройки (src/config.ts) добавил параметр stamp.
Если он включен, то начинает работать следующий механизм:

При формировании DDL-скрипта, в его начало скрипта добавляется следующий текст:
/*MENTATOR-DDL-CREATOR.SCHEMA.START
    {
        "schema_name": string, # имя схемы БД
        "object_name": string, # имя объекта (таблицы, процедуры, функции и т.д.)
        "database_name": string, # имя БД
        "kind": enum # тип объекта: "TABLE","VIEW","PROCEDURE" и т.д.
    }
MENTATOR-DDL-CREATOR.SCHEMA.STOP*/

Замечания (на примере MSSQL):

1. Вот тут:

{
    "schema_name": "",
    "object_name": "AdventureWorks",
    "database_name": "AdventureWorks",
    "kind": "DATABASE"
}

сделать "database_name" пустой строкой

2. Вот тут:

{
    "schema_name": "Sales",
    "object_name": "Sales",
    "database_name": "AdventureWorks",
    "kind": "SCHEMA"
}

сделать "schema_name" пустой строкойы