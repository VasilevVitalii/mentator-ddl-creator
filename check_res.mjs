import { readFileSync, readdirSync } from 'fs'
import { join, relative } from 'path'

const DIR = '/home/vitalii/Work/mentator_new/_process/data/1_RESULT_DDL_FILES_RAW'

const STAMP_START = '/*MENTATOR-DDL-CREATOR.SCHEMA.START'
const STAMP_STOP = 'MENTATOR-DDL-CREATOR.SCHEMA.STOP*/'

const MAX_EXAMPLES = 5

function getAllFiles(dir) {
    const result = []
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name)
        if (entry.isDirectory()) {
            result.push(...getAllFiles(fullPath))
        } else {
            result.push(fullPath)
        }
    }
    return result
}

function extractStamp(content) {
    const startIdx = content.indexOf(STAMP_START)
    if (startIdx === -1) return null
    const jsonStart = startIdx + STAMP_START.length
    const stopIdx = content.indexOf(STAMP_STOP, jsonStart)
    if (stopIdx === -1) return null
    try {
        return JSON.parse(content.slice(jsonStart, stopIdx).trim())
    } catch {
        return null
    }
}

// Статистика
const stats = {
    totalFiles: 0,
    filesWithStamp: 0,
    filesWithUsesList: 0,
    totalUsesItems: 0,
}

// Для каждого поля — счётчик ошибок и примеры (файл + элемент)
const fields = ['kind', 'schema_name', 'object_name', 'database_name']
const errors = Object.fromEntries(fields.map(f => [f, { count: 0, examples: [] }]))

for (const filePath of getAllFiles(DIR)) {
    stats.totalFiles++

    const content = readFileSync(filePath, 'utf-8')
    const stamp = extractStamp(content)
    if (!stamp) continue
    stats.filesWithStamp++

    if (!Array.isArray(stamp.uses_list) || stamp.uses_list.length === 0) continue
    stats.filesWithUsesList++

    for (const item of stamp.uses_list) {
        stats.totalUsesItems++
        const relPath = relative(DIR, filePath)

        for (const field of fields) {
            if (!item[field] && item[field] !== undefined) {
                // пустая строка — ошибка
                errors[field].count++
                if (errors[field].examples.length < MAX_EXAMPLES) {
                    errors[field].examples.push({ file: relPath, item })
                }
            } else if (item[field] === undefined) {
                // поле вообще отсутствует — тоже ошибка
                errors[field].count++
                if (errors[field].examples.length < MAX_EXAMPLES) {
                    errors[field].examples.push({ file: relPath, item, missing: true })
                }
            }
        }
    }
}

// --- Вывод ---

console.log('=== СТАТИСТИКА ===')
console.log(`Всего файлов:                  ${stats.totalFiles}`)
console.log(`Файлов со штампом:             ${stats.filesWithStamp}`)
console.log(`Файлов с uses_list:            ${stats.filesWithUsesList}`)
console.log(`Всего элементов в uses_list:   ${stats.totalUsesItems}`)
console.log()

let hasErrors = false
for (const field of fields) {
    const { count, examples } = errors[field]
    if (count === 0) continue
    hasErrors = true

    console.error(`--- Пустое поле "${field}": ${count} случаев ---`)
    for (const ex of examples) {
        const note = ex.missing ? ' (поле отсутствует)' : ''
        console.error(`  Файл: ${ex.file}${note}`)
        console.error(`  Элемент: ${JSON.stringify(ex.item)}`)
    }
    if (count > MAX_EXAMPLES) {
        console.error(`  ... и ещё ${count - MAX_EXAMPLES} случаев`)
    }
    console.error()
}

if (!hasErrors) {
    console.log('Ошибок в uses_list не найдено.')
}
