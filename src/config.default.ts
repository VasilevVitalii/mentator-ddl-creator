export const DefaultPathOra = {
    table: {
        desc: 'path template for storing table DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TABLE/{{schema-name}}.TBL.{{object-name}}.sql'
    },
    view: {
        desc: 'path template for storing view DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/VIEW/{{schema-name}}.VVW.{{object-name}}.sql'
    },
    mview: {
        desc: 'path template for storing materialized view DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/MVIEW/{{schema-name}}.MVW.{{object-name}}.sql'
    },
    index: {
        desc: 'path template for storing index DDL scripts; supports placeholders {{schema-name}}, {{parent-name}} and {{object-name}}',
        path: '{{schema-name}}/INDEX/{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql'
    },
    trigger: {
        desc: 'path template for storing trigger DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TRIGGER/{{schema-name}}.TRG.{{object-name}}.sql'
    },
    package: {
        desc: 'path template for storing package specification DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/PACKAGE/{{schema-name}}.PKH.{{object-name}}.sql'
    },
    packagebody: {
        desc: 'path template for storing package body DDL scripts; If not set, spec and body are stored in one file; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/PACKAGEBODY/{{schema-name}}.PKB.{{object-name}}.sql'
    },
    procedure: {
        desc: 'path template for storing procedure DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/PROCEDURE/{{schema-name}}.PRC.{{object-name}}.sql'
    },
    function: {
        desc: 'path template for storing function DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/FUNCTION/{{schema-name}}.FUN.{{object-name}}.sql'
    },
    type: {
        desc: 'path template for storing type DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TYPE/{{schema-name}}.TPH.{{object-name}}.sql'
    },
    typebody: {
        desc: 'path template for storing type body DDL scripts; If not set, spec and body are stored in one file; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TYPEBODY/{{schema-name}}.TPB.{{object-name}}.sql'
    },
    sequence: {
        desc: 'path template for storing sequence DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/SEQUENCE/{{schema-name}}.SEQ.{{object-name}}.sql'
    },
    synonym: {
        desc: 'path template for storing synonym DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/SYNONYM/{{schema-name}}.SYN.{{object-name}}.sql'
    },
    job: {
        desc: 'path template for storing job DDL scripts; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/JOB/{{schema-name}}.JOB.{{object-name}}.sql'
    },
    table_fill_full: {
        desc: 'path template for storing full data insert scripts for tables; supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TABLE.FILL.FULL/{{schema-name}}.TBL.{{object-name}}.FF.sql'
    },
    table_fill_demo: {
        desc: 'path template for storing demo data insert scripts (few records) for tables. supports placeholders {{schema-name}} and {{object-name}}',
        path: '{{schema-name}}/TABLE.FILL.DEMO/{{schema-name}}.TBL.{{object-name}}.FD.sql'
    }
}

export const DefaultPathMssql = {
    database: {
        desc: 'path template for storing database DDL script; supports placeholder {{base-name}}',
        path: '{{base-name}}/{{base-name}}.DTB.sql',
    },
    schema: {
        desc: 'path template for storing schema DDL script; supports placeholders {{base-name}}, {{schema-name}}',
        path: '{{base-name}}/{{schema-name}}/{{base-name}}.{{schema-name}}.SCH.sql',
    },
    table: {
        desc: 'path template for storing table DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/TABLE/{{base-name}}.{{schema-name}}.TBL.{{object-name}}.sql',
    },
    view: {
        desc: 'path template for storing view DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/VIEW/{{base-name}}.{{schema-name}}.VVW.{{object-name}}.sql',
    },
    index: {
        desc: 'path template for storing index DDL scripts; supports placeholders {{base-name}}, {{schema-name}}, {{parent-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/INDEX/{{base-name}}.{{schema-name}}.TBL.{{parent-name}}.IDX.{{object-name}}.sql',
    },
    trigger: {
        desc: 'path template for storing trigger DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/TRIGGER/{{base-name}}.{{schema-name}}.TRG.{{object-name}}.sql',
    },
    procedure: {
        desc: 'path template for storing procedure DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/PROCEDURE/{{base-name}}.{{schema-name}}.PRC.{{object-name}}.sql',
    },
    function: {
        desc: 'path template for storing function DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/FUNCTION/{{base-name}}.{{schema-name}}.FUN.{{object-name}}.sql',
    },
    sequence: {
        desc: 'path template for storing sequence DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/SEQUENCE/{{base-name}}.{{schema-name}}.SEQ.{{object-name}}.sql',
    },
    synonym: {
        desc: 'path template for storing synonym DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/SYNONYM/{{base-name}}.{{schema-name}}.SYN.{{object-name}}.sql',
    },
    job: {
        desc: 'path template for storing job DDL scripts; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/JOB/{{base-name}}.{{schema-name}}.JOB.{{object-name}}.sql',
    },
    table_fill_full: {
        desc: 'path template for storing full data insert scripts for tables; supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/TABLE.FILL.FULL/{{base-name}}.{{schema-name}}.TBL.{{object-name}}.FF.sql',
    },
    table_fill_demo: {
        desc: 'path template for storing demo data insert scripts (few records) for tables. supports placeholders {{base-name}}, {{schema-name}} and {{object-name}}',
        path: '{{base-name}}/{{schema-name}}/TABLE.FILL.DEMO/{{base-name}}.{{schema-name}}.TBL.{{object-name}}.FD.sql',
    }
}
