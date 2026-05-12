/*
File: lotek-database-schema-visualizer.js
Description: Parser, renderer, SQL generator, connector logic, and layout handling for the visualizer.
Author: Stephan Kühn (LoTeK)
Mail: info@lotek-zone.com
Web: https://lotek-zone.com/
GitHub: https://github.com/LoTeK-Zone
Repository: https://github.com/LoTeK-Zone/LoTeK-Database-Schema-Visualizer
Version: v0.2.1
Last Updated: 2026-05-12
License: MIT
*/

(() => {
   const STORAGE_KEY = 'lotek-database-schema-visualizer-layout-v020'
   const SIDEBAR_WIDTH_KEY = 'lotek-database-schema-visualizer-sidebar-width-v020'
   const LAYOUT_GAP_KEY = 'lotek-database-schema-visualizer-layout-gap-v020'
   const SHOW_LABELS_KEY = 'lotek-database-schema-visualizer-show-labels-v020'
   const SHOW_ARROWS_KEY = 'lotek-database-schema-visualizer-show-arrows-v020'
   const GRID_SIZE_KEY = 'lotek-database-schema-visualizer-grid-size-v020'
   const DATABASE_NAME_KEY = 'lotek-database-schema-visualizer-database-name-v020'
   const INCLUDE_CREATE_DATABASE_KEY = 'lotek-database-schema-visualizer-include-create-database-v020'
   const DEFAULT_DATABASE_NAME = 'Database'
   const DEFAULT_GAP = 30
   const DEFAULT_GRID = 10
   const CANVAS_EXTRA_PADDING = 400
   const FIELD_TYPES = new Set(['INTEGER', 'TEXT', 'REAL', 'BLOB'])
   const OPTION_TOKENS = new Set(['PRIMARY_KEY', 'AUTOINCREMENT', 'NOT_NULL', 'UNIQUE', 'FOREIGN_KEY', 'REFERENCES'])
   const state = { tables: [], tableByName: new Map(), explicitLinks: [], detectedLinks: [], links: [], drag: null, activeFormat: 'ini', sqlText: '', selectedTables: new Set() }
   const schemaInput = document.getElementById('schemaInput')
   const sqlOutput = document.getElementById('sqlOutput')
   const statusEl = document.getElementById('status')
   const canvas = document.getElementById('canvas')
   const stage = document.getElementById('stage')
   const linksSvg = document.getElementById('linksSvg')
   const emptyHint = document.getElementById('emptyHint')
   const tooltip = document.getElementById('tooltip')
   const splitter = document.getElementById('splitter')
   const layoutGapInput = document.getElementById('layoutGapInput')
   const gridSizeInput = document.getElementById('gridSizeInput')
   const databaseNameInput = document.getElementById('databaseNameInput')
   const includeCreateDatabaseInput = document.getElementById('includeCreateDatabaseInput')
   const autoDetectLinksBtn = document.getElementById('autoDetectLinksBtn')
   const applyDetectedLinksBtn = document.getElementById('applyDetectedLinksBtn')
   const showLabelsInput = document.getElementById('showLabelsInput')
   const showArrowsInput = document.getElementById('showArrowsInput')
   const iniTabBtn = document.getElementById('iniTabBtn')
   const sqlTabBtn = document.getElementById('sqlTabBtn')
   const formatNote = document.getElementById('formatNote')
   const importLayoutFile = document.getElementById('importLayoutFile')

   initDefaults()
   initDatabaseControls()
   initLayoutControls()
   initFormatTabs()
   initSidebarResize()

   document.getElementById('autoLayoutBtn').addEventListener('click', () => { autoLayout(); renderAll(); saveLayout(false); setStatus(`Auto layout done. Gap: ${getLayoutGap()} px.`) })
   document.getElementById('alignLeftBtn').addEventListener('click', () => alignSelectedTables('left'))
   document.getElementById('alignTopBtn').addEventListener('click', () => alignSelectedTables('top'))
   autoDetectLinksBtn.addEventListener('click', () => detectAutoLinks())
   applyDetectedLinksBtn.addEventListener('click', () => applyDetectedLinksToSchema())
   document.getElementById('exportLayoutBtn').addEventListener('click', () => exportLayoutPackage())
   document.getElementById('importLayoutBtn').addEventListener('click', () => importLayoutFile.click())
   importLayoutFile.addEventListener('change', event => importLayoutPackage(event))
   document.getElementById('copyBtn').addEventListener('click', () => copyActiveFormat())
   document.getElementById('exportBtn').addEventListener('click', () => exportActiveFormat())
   window.addEventListener('resize', () => { refreshCanvasSize(true); drawLinks() })
   schemaInput.addEventListener('input', debounce(() => liveParseAndRender('Schema updated.'), 80))
   stage.addEventListener('pointerdown', event => { if (event.button === 0 && !event.target.closest('.table-box')) clearSelection() })

   liveParseAndRender('Ready.')

   function initDefaults() {
      schemaInput.value = ''
   }

   function initDatabaseControls() {
      const savedName = localStorage.getItem(DATABASE_NAME_KEY)
      databaseNameInput.value = savedName && savedName.trim() ? savedName : DEFAULT_DATABASE_NAME
      includeCreateDatabaseInput.checked = localStorage.getItem(INCLUDE_CREATE_DATABASE_KEY) === '1'
      databaseNameInput.addEventListener('input', debounce(() => {
         localStorage.setItem(DATABASE_NAME_KEY, getDatabaseName())
         updateSqlOutput()
         setStatus(`Database name set to ${getDatabaseName()}.`)
      }, 120))
      includeCreateDatabaseInput.addEventListener('change', () => {
         localStorage.setItem(INCLUDE_CREATE_DATABASE_KEY, includeCreateDatabaseInput.checked ? '1' : '0')
         updateSqlOutput()
         setStatus(includeCreateDatabaseInput.checked ? 'CREATE DATABASE enabled for SQL.' : 'CREATE DATABASE disabled for SQL.')
      })
   }

   function getDatabaseName() {
      const value = String(databaseNameInput.value || '').trim()
      return value || DEFAULT_DATABASE_NAME
   }

   function getSafeDatabaseFileBase() {
      const safe = getDatabaseName().replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').replace(/\s+/g, '_').replace(/^_+|_+$/g, '')
      return safe || DEFAULT_DATABASE_NAME
   }

   function updateSqlOutput() {
      state.sqlText = generateSql(state.tables)
      sqlOutput.textContent = state.sqlText
      saveLayout(false)
   }

   function initLayoutControls() {
      layoutGapInput.value = String(DEFAULT_GAP)
      gridSizeInput.value = String(DEFAULT_GRID)
      const savedGap = getStoredNumber(LAYOUT_GAP_KEY, DEFAULT_GAP, 0, 300)
      const savedGrid = getStoredNumber(GRID_SIZE_KEY, DEFAULT_GRID, 0, 100)
      layoutGapInput.value = String(savedGap)
      gridSizeInput.value = String(savedGrid)
      if (localStorage.getItem(SHOW_LABELS_KEY) !== null) showLabelsInput.checked = localStorage.getItem(SHOW_LABELS_KEY) === '1'
      if (localStorage.getItem(SHOW_ARROWS_KEY) !== null) showArrowsInput.checked = localStorage.getItem(SHOW_ARROWS_KEY) === '1'
      layoutGapInput.addEventListener('change', () => { localStorage.setItem(LAYOUT_GAP_KEY, String(getLayoutGap())); autoLayout(); renderAll(); saveLayout(false); setStatus(`Auto layout updated. Gap: ${getLayoutGap()} px.`) })
      gridSizeInput.addEventListener('change', () => { localStorage.setItem(GRID_SIZE_KEY, String(getGridSize())); saveLayout(false); setStatus(`Grid updated. Grid: ${getGridSize()} px. Auto layout is unchanged.`) })
      showLabelsInput.addEventListener('change', () => { localStorage.setItem(SHOW_LABELS_KEY, showLabelsInput.checked ? '1' : '0'); drawLinks(); setStatus('1/N label display updated.') })
      showArrowsInput.addEventListener('change', () => { localStorage.setItem(SHOW_ARROWS_KEY, showArrowsInput.checked ? '1' : '0'); drawLinks(); setStatus('Arrow head display updated.') })
   }

   function getStoredNumber(key, defaultValue, min, max) {
      const raw = localStorage.getItem(key)
      if (raw === null || raw === '') return defaultValue
      const value = Number(raw)
      if (!Number.isFinite(value)) return defaultValue
      return clamp(Math.round(value), min, max)
   }

   function initFormatTabs() {
      iniTabBtn.addEventListener('click', () => setActiveFormat('ini'))
      sqlTabBtn.addEventListener('click', () => setActiveFormat('sql'))
   }

   function setActiveFormat(format) {
      state.activeFormat = format
      const isIni = format === 'ini'
      schemaInput.classList.toggle('hidden', !isIni)
      sqlOutput.classList.toggle('hidden', isIni)
      iniTabBtn.classList.toggle('active', isIni)
      sqlTabBtn.classList.toggle('active', !isIni)
      formatNote.textContent = isIni ? 'INI is editable. SQL is generated output.' : 'SQL output is read-only. It is generated from the INI schema.'
   }

   function getActiveText() {
      return state.activeFormat === 'sql' ? state.sqlText : schemaInput.value
   }

   function getActiveFileName() {
      const baseName = getSafeDatabaseFileBase()
      return state.activeFormat === 'sql' ? `${baseName}.sql` : `${baseName}.ini`
   }

   function getActiveMimeType() {
      return state.activeFormat === 'sql' ? 'text/plain;charset=utf-8' : 'text/plain;charset=utf-8'
   }

   function copyActiveFormat() {
      const text = getActiveText()
      if (navigator.clipboard && navigator.clipboard.writeText) {
         navigator.clipboard.writeText(text).then(() => setStatus(`${state.activeFormat.toUpperCase()} copied to clipboard.`)).catch(() => fallbackCopy(text))
      } else {
         fallbackCopy(text)
      }
   }

   function fallbackCopy(text) {
      const temp = document.createElement('textarea')
      temp.value = text
      temp.style.position = 'fixed'
      temp.style.left = '-9999px'
      document.body.appendChild(temp)
      temp.focus()
      temp.select()
      document.execCommand('copy')
      temp.remove()
      setStatus(`${state.activeFormat.toUpperCase()} copied to clipboard.`)
   }

   function exportActiveFormat() {
      const blob = new Blob([getActiveText()], { type: getActiveMimeType() })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = getActiveFileName()
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus(`${state.activeFormat.toUpperCase()} exported as ${getActiveFileName()}.`)
   }

   function getLayoutGap() {
      const value = Number(layoutGapInput.value)
      if (!Number.isFinite(value)) return DEFAULT_GAP
      return clamp(Math.round(value), 0, 300)
   }

   function getGridSize() {
      const value = Number(gridSizeInput.value)
      if (!Number.isFinite(value)) return DEFAULT_GRID
      return clamp(Math.round(value), 0, 100)
   }

   function snapToGrid(value) {
      const grid = getGridSize()
      if (grid <= 0) return value
      if (grid <= 1) return Math.round(value)
      return Math.round(value / grid) * grid
   }

   function snapLayoutForward(value) {
      const grid = getGridSize()
      if (grid <= 0) return value
      if (grid <= 1) return Math.ceil(value)
      return Math.ceil(value / grid) * grid
   }


   function initSidebarResize() {
      const savedWidth = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY))
      if (savedWidth > 0) setSidebarWidth(savedWidth)
      let startX = 0
      let startWidth = 0
      let pointerId = null
      splitter.addEventListener('pointerdown', event => {
         event.preventDefault()
         pointerId = event.pointerId
         startX = event.clientX
         startWidth = getCurrentSidebarWidth()
         splitter.setPointerCapture(pointerId)
         splitter.classList.add('dragging')
         document.body.classList.add('resizing-sidebar')
      })
      splitter.addEventListener('pointermove', event => {
         if (pointerId === null || event.pointerId !== pointerId) return
         const nextWidth = clamp(startWidth + event.clientX - startX, 260, Math.max(380, window.innerWidth - 380))
         setSidebarWidth(nextWidth)
         drawLinks()
      })
      splitter.addEventListener('pointerup', event => finishResize(event))
      splitter.addEventListener('pointercancel', event => finishResize(event))
      function finishResize(event) {
         if (pointerId === null || event.pointerId !== pointerId) return
         localStorage.setItem(SIDEBAR_WIDTH_KEY, String(getCurrentSidebarWidth()))
         splitter.classList.remove('dragging')
         document.body.classList.remove('resizing-sidebar')
         pointerId = null
         drawLinks()
      }
   }

   function getCurrentSidebarWidth() {
      const value = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-width').trim()
      if (value.endsWith('px')) return Number(value.slice(0, -2)) || 460
      return 460
   }

   function setSidebarWidth(width) {
      document.documentElement.style.setProperty('--sidebar-width', `${Math.round(width)}px`)
   }

   function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value))
   }

   function liveParseAndRender(message) {
      const parsed = parseSchema(schemaInput.value)
      state.tables = parsed.tables
      state.tableByName = new Map(state.tables.map(table => [table.name, table]))
      state.explicitLinks = parsed.explicitLinks
      state.detectedLinks = []
      syncSelectedTables()
      rebuildLinks()
      state.sqlText = generateSql(state.tables)
      sqlOutput.textContent = state.sqlText
      loadLayout()
      autoLayoutMissingOnly()
      renderAll()
      updateApplyButton()
      setStatus(message ? `${message} ${state.tables.length} tables, ${state.links.length} links.` : `${state.tables.length} tables, ${state.links.length} links.`)
   }

   function rebuildLinks() {
      clearAutoForeignFlags()
      markDetectedFields()
      state.links = buildLinks()
   }

   function parseSchema(text) {
      const tables = []
      const explicitLinks = []
      let currentTable = null
      const lines = text.replace(/\r/g, '').split('\n')
      for (const rawLine of lines) {
         const line = rawLine.trim()
         if (!line || line.startsWith(';') || line.startsWith('#')) continue
         const sectionMatch = line.match(/^\[([^\]]+)\]$/)
         if (sectionMatch) {
            currentTable = { name: sectionMatch[1].trim(), fields: [], x: null, y: null }
            tables.push(currentTable)
            continue
         }
         if (!currentTable || !line.includes('=')) continue
         const field = parseFieldLine(line)
         currentTable.fields.push(field)
         field.targets.forEach(target => explicitLinks.push(createLink(currentTable.name, field.name, target.table, target.field, field.cardinality, false)))
      }
      return { tables, explicitLinks }
   }

   function parseFieldLine(line) {
      const eqPos = line.indexOf('=')
      const left = line.slice(0, eqPos).trim()
      const right = line.slice(eqPos + 1).trim()
      const leftParts = parseLeftSide(left)
      const rightParts = parseRightSide(right)
      return {
         name: leftParts.name,
         label: leftParts.label,
         type: rightParts.type,
         options: rightParts.options,
         cardinality: rightParts.cardinality || (rightParts.options.includes('PRIMARY_KEY') ? '1' : ''),
         targets: rightParts.targets,
         rawValue: right,
         isPrimary: rightParts.options.includes('PRIMARY_KEY'),
         isUnique: rightParts.options.includes('UNIQUE'),
         isForeign: rightParts.targets.length > 0,
         isAutoForeign: false
      }
   }

   function parseLeftSide(left) {
      let match = left.match(/^([^\[\]\s=]+)\[([^\]]*)\]$/)
      if (!match) match = left.match(/^([^\[]+?)\s+\[([^\]]*)\]$/)
      if (match) return { name: match[1].trim(), label: match[2].trim() }
      return { name: left.trim(), label: '' }
   }

   function parseRightSide(right) {
      let valuePart = right
      let targetPart = ''
      const gtPos = right.indexOf('>')
      if (gtPos >= 0) {
         valuePart = right.slice(0, gtPos).trim()
         targetPart = right.slice(gtPos + 1).trim()
      }
      const commaTokens = valuePart.split(',').map(token => token.trim()).filter(Boolean)
      const whiteTokens = valuePart.replace(/,/g, ' ').split(/\s+/).map(token => token.trim()).filter(Boolean)
      const legacyForeignTokens = commaTokens.concat(whiteTokens).filter(token => token.toLowerCase().startsWith('foreign:'))
      const targets = []
      legacyForeignTokens.forEach(token => {
         const target = parseTargetRef(token.slice(token.indexOf(':') + 1))
         if (target) targets.push(target)
      })
      targetPart.split(/\s+/).map(token => token.trim()).filter(Boolean).forEach(token => {
         const target = parseTargetRef(token)
         if (target) targets.push(target)
      })
      let type = ''
      let cardinality = ''
      const options = []
      whiteTokens.forEach(token => {
         if (token.toLowerCase().startsWith('foreign:')) return
         const normalized = canonicalizeToken(token)
         if (normalized === '[1]' || normalized === '[N]') {
            cardinality = normalized.slice(1, -1)
            return
         }
         if (!type && FIELD_TYPES.has(normalized)) {
            type = normalized
            return
         }
         if (OPTION_TOKENS.has(normalized) || normalized.startsWith('DEFAULT:')) {
            options.push(normalized)
         } else if (!type && normalized) {
            type = normalized
         } else if (normalized) {
            options.push(normalized)
         }
      })
      return { type, options: uniqueStrings(options), cardinality, targets: uniqueTargets(targets) }
   }

   function canonicalizeToken(token) {
      const trimmed = String(token).trim()
      const upper = trimmed.toUpperCase()
      const lower = trimmed.toLowerCase()
      if (upper === '[1]' || upper === '[N]') return upper
      if (lower === 'integer') return 'INTEGER'
      if (lower === 'text') return 'TEXT'
      if (lower === 'real') return 'REAL'
      if (lower === 'blob') return 'BLOB'
      if (lower === 'primary' || lower === 'primary_key') return 'PRIMARY_KEY'
      if (lower === 'autoincrement' || lower === 'auto_increment') return 'AUTOINCREMENT'
      if (lower === 'not_null' || lower === 'notnull') return 'NOT_NULL'
      if (lower === 'unique') return 'UNIQUE'
      if (lower.startsWith('default:')) return 'DEFAULT:' + trimmed.slice(trimmed.indexOf(':') + 1)
      if (lower === 'foreign_key') return 'FOREIGN_KEY'
      if (lower === 'references') return 'REFERENCES'
      return upper
   }

   function parseTargetRef(value) {
      const target = String(value).trim()
      const dotPos = target.indexOf('.')
      if (dotPos <= 0 || dotPos >= target.length - 1) return null
      return { table: target.slice(0, dotPos).trim(), field: target.slice(dotPos + 1).trim() }
   }

   function uniqueStrings(items) {
      return [...new Set(items)]
   }

   function uniqueTargets(targets) {
      const seen = new Set()
      return targets.filter(target => {
         const key = `${target.table}.${target.field}`
         if (seen.has(key)) return false
         seen.add(key)
         return true
      })
   }

   function createLink(fromTable, fromField, toTable, toField, fromCardinality, isAuto) {
      return { fromTable, fromField, toTable, toField, fromCardinality: fromCardinality || '', toCardinality: '', isAuto }
   }

   function buildLinks() {
      const links = []
      const seen = new Set()
      state.explicitLinks.forEach(link => addLink(links, seen, enrichLink(link)))
      state.detectedLinks.forEach(link => addLink(links, seen, enrichLink(link)))
      return links
   }

   function addLink(links, seen, link) {
      const key = `${link.fromTable}.${link.fromField}>${link.toTable}.${link.toField}`
      if (seen.has(key)) return
      seen.add(key)
      links.push(link)
   }

   function enrichLink(link) {
      const targetField = getField(link.toTable, link.toField)
      const sourceField = getField(link.fromTable, link.fromField)
      return {
         ...link,
         fromCardinality: link.fromCardinality || (sourceField ? sourceField.cardinality : ''),
         toCardinality: targetField ? targetField.cardinality || (targetField.isPrimary ? '1' : '') : ''
      }
   }

   function buildAutoLinks() {
      const primaryByField = new Map()
      state.tables.forEach(table => {
         table.fields.forEach(field => {
            if (!field.isPrimary) return
            if (!primaryByField.has(field.name)) primaryByField.set(field.name, [])
            primaryByField.get(field.name).push({ table: table.name, field: field.name })
         })
      })
      const autoLinks = []
      state.tables.forEach(table => {
         table.fields.forEach(field => {
            if (field.isPrimary || field.targets.length > 0) return
            const targets = primaryByField.get(field.name) || []
            const validTargets = targets.filter(target => target.table !== table.name)
            if (validTargets.length !== 1) return
            const target = validTargets[0]
            autoLinks.push(createLink(table.name, field.name, target.table, target.field, field.cardinality, true))
         })
      })
      return autoLinks
   }

   function detectAutoLinks() {
      state.detectedLinks = buildAutoLinks()
      rebuildLinks()
      renderAll()
      updateApplyButton()
      if (state.detectedLinks.length > 0) {
         setStatus(`${state.detectedLinks.length} primary-key target links detected. Review green dashed lines, then apply if correct.`)
      } else {
         setStatus('No primary-key target links detected.')
      }
   }

   function applyDetectedLinksToSchema() {
      if (!state.detectedLinks.length) {
         setStatus('No detected links to apply.')
         return
      }
      const count = state.detectedLinks.length
      schemaInput.value = addTargetsToSchemaText(schemaInput.value, state.detectedLinks)
      liveParseAndRender(`${count} detected links applied to INI schema.`)
   }

   function addTargetsToSchemaText(text, links) {
      const linkMap = new Map()
      links.forEach(link => {
         const key = `${link.fromTable}.${link.fromField}`
         if (!linkMap.has(key)) linkMap.set(key, [])
         linkMap.get(key).push(`${link.toTable}.${link.toField}`)
      })
      let currentTable = ''
      const lines = text.replace(/\r/g, '').split('\n')
      return lines.map(rawLine => {
         const trimmed = rawLine.trim()
         const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
         if (sectionMatch) {
            currentTable = sectionMatch[1].trim()
            return rawLine
         }
         if (!currentTable || !trimmed || trimmed.startsWith(';') || trimmed.startsWith('#') || !trimmed.includes('=')) return rawLine
         const eqPos = rawLine.indexOf('=')
         const left = rawLine.slice(0, eqPos).trim()
         const field = parseLeftSide(left)
         const targets = linkMap.get(`${currentTable}.${field.name}`) || []
         if (!targets.length) return rawLine
         const existingTargets = new Set(parseRightSide(rawLine.slice(eqPos + 1).trim()).targets.map(target => `${target.table}.${target.field}`))
         const missingTargets = targets.filter(target => !existingTargets.has(target))
         if (!missingTargets.length) return rawLine
         return rawLine.includes('>') ? rawLine + ' ' + missingTargets.join(' ') : rawLine + ' > ' + missingTargets.join(' ')
      }).join('\n')
   }

   function clearAutoForeignFlags() {
      state.tables.forEach(table => table.fields.forEach(field => { field.isAutoForeign = false }))
   }

   function markDetectedFields() {
      const detected = new Set(state.detectedLinks.map(link => `${link.fromTable}.${link.fromField}`))
      state.tables.forEach(table => {
         table.fields.forEach(field => {
            if (detected.has(`${table.name}.${field.name}`)) field.isAutoForeign = true
         })
      })
   }

   function updateApplyButton() {
      applyDetectedLinksBtn.disabled = state.detectedLinks.length === 0
   }

   function getField(tableName, fieldName) {
      const table = state.tableByName.get(tableName)
      if (!table) return null
      return table.fields.find(field => field.name === fieldName) || null
   }

   function generateSql(tables) {
      const blocks = []
      if (includeCreateDatabaseInput.checked) blocks.push(`CREATE DATABASE ${formatSqlIdentifier(getDatabaseName())};`)
      if (tables.length) blocks.push(tables.map(table => generateTableSql(table)).join('\n\n'))
      return blocks.length ? blocks.join('\n\n') + '\n' : ''
   }

   function formatSqlIdentifier(value) {
      const identifier = String(value || DEFAULT_DATABASE_NAME).trim() || DEFAULT_DATABASE_NAME
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) return identifier
      return '"' + identifier.replace(/"/g, '""') + '"'
   }

   function generateTableSql(table) {
      const lines = []
      const comments = []
      table.fields.forEach(field => {
         lines.push('   ' + fieldToSql(field))
         if (field.targets.length === 1) {
            const target = field.targets[0]
            lines.push(`   FOREIGN KEY (${field.name}) REFERENCES ${target.table}(${target.field})`)
         } else if (field.targets.length > 1) {
            comments.push(`-- Schema-only multi-target relation for ${table.name}.${field.name}: ${field.targets.map(target => `${target.table}.${target.field}`).join(' ')}`)
         }
      })
      const createStatement = `CREATE TABLE IF NOT EXISTS ${table.name} (\n${lines.join(',\n')}\n);`
      return comments.length ? `${createStatement}\n${comments.join('\n')}` : createStatement
   }

   function fieldToSql(field) {
      const parts = [field.name]
      parts.push(field.type || 'TEXT')
      field.options.forEach(option => {
         if (option === 'PRIMARY_KEY') parts.push('PRIMARY KEY')
         else if (option === 'NOT_NULL') parts.push('NOT NULL')
         else if (option === 'AUTOINCREMENT') parts.push('AUTOINCREMENT')
         else if (option === 'UNIQUE') parts.push('UNIQUE')
         else if (option.startsWith('DEFAULT:')) parts.push('DEFAULT ' + option.slice('DEFAULT:'.length))
      })
      return parts.join(' ')
   }

   function autoLayoutMissingOnly() {
      const missing = state.tables.filter(table => table.x === null || table.y === null)
      if (missing.length === state.tables.length) { autoLayout(); return }
      if (missing.length > 0) autoLayout()
   }

   function autoLayout() {
      const gap = getLayoutGap()
      const startX = 0
      const startY = 0
      const orderedTables = [...state.tables].sort((a, b) => getTableOrder(a) - getTableOrder(b) || a.name.localeCompare(b.name))
      const tableSizes = measureTableSizes(orderedTables)
      const firstSize = orderedTables.length ? tableSizes.get(orderedTables[0].name) : null
      const boxWidth = firstSize ? firstSize.width : 320
      const usableWidth = Math.max(760, window.innerWidth - getCurrentSidebarWidth() - 120)
      let x = startX
      let y = startY
      let col = 0
      let rowMaxHeight = 0
      orderedTables.forEach(table => {
         const size = tableSizes.get(table.name) || { width: boxWidth, height: 0 }
         if (col > 0 && x + size.width > usableWidth) {
            col = 0
            x = startX
            y = snapLayoutForward(y + rowMaxHeight + gap)
            rowMaxHeight = 0
         }
         table.x = x
         table.y = y
         rowMaxHeight = Math.max(rowMaxHeight, size.height)
         col++
         x = snapLayoutForward(x + size.width + gap)
      })
   }

   function measureTableSizes(tables) {
      const sizes = new Map()
      const wrapper = document.createElement('div')
      wrapper.style.position = 'absolute'
      wrapper.style.left = '-10000px'
      wrapper.style.top = '0'
      wrapper.style.visibility = 'hidden'
      wrapper.style.pointerEvents = 'none'
      wrapper.style.width = '320px'
      document.body.appendChild(wrapper)
      tables.forEach(table => {
         const box = createTableBox(table)
         box.style.position = 'relative'
         box.style.left = '0px'
         box.style.top = '0px'
         box.style.visibility = 'hidden'
         wrapper.appendChild(box)
         sizes.set(table.name, { width: Math.ceil(box.offsetWidth || box.getBoundingClientRect().width || 320), height: Math.ceil(box.offsetHeight || box.getBoundingClientRect().height || 0) })
      })
      wrapper.remove()
      return sizes
   }

   function getTableOrder(table) {
      if (table.name === 'title') return 10
      if (table.name === 'title_type') return 20
      if (table.name === 'season') return 30
      if (table.name === 'episode') return 40
      if (table.name === 'tag') return 50
      if (table.name.startsWith('link_')) return 60
      if (table.name === 'categories') return 70
      if (table.name === 'screenshot') return 80
      if (table.name === 'video') return 90
      if (table.name === 'actor') return 100
      if (table.name === 'role') return 110
      if (table.name === 'cast') return 120
      return 999
   }


   function renderAll() {
      removeExistingTables()
      emptyHint.classList.toggle('hidden', state.tables.length > 0)
      state.tables.forEach(table => canvas.appendChild(createTableBox(table)))
      requestAnimationFrame(() => { refreshCanvasSize(true); drawLinks() })
   }

   function removeExistingTables() {
      canvas.querySelectorAll('.table-box').forEach(node => node.remove())
      linksSvg.querySelectorAll('.connection').forEach(node => node.remove())
      linksSvg.querySelectorAll('.connection-label').forEach(node => node.remove())
   }

   function createTableBox(table) {
      const box = document.createElement('div')
      box.className = isLinkTable(table) ? 'table-box link-table' : 'table-box'
      if (state.selectedTables.has(table.name)) box.classList.add('selected')
      box.addEventListener('pointerdown', event => { if (event.button === 0 && !event.target.closest('.table-header')) selectTableForPointer(event, table.name) })
      box.dataset.table = table.name
      box.style.left = `${table.x}px`
      box.style.top = `${table.y}px`
      const header = document.createElement('div')
      header.className = 'table-header'
      header.addEventListener('pointerdown', event => startDrag(event, table, box))
      const name = document.createElement('div')
      name.className = 'table-name'
      name.textContent = table.name
      const badges = document.createElement('div')
      badges.className = 'table-badges'
      if (isLinkTable(table)) {
         const linkBadge = document.createElement('div')
         linkBadge.className = 'table-badge link-kind'
         linkBadge.textContent = 'link'
         badges.appendChild(linkBadge)
      }
      const fieldCountBadge = document.createElement('div')
      fieldCountBadge.className = 'table-badge field-count'
      fieldCountBadge.textContent = `${table.fields.length} fields`
      badges.appendChild(fieldCountBadge)
      header.appendChild(name)
      header.appendChild(badges)
      box.appendChild(header)
      const columns = document.createElement('div')
      columns.className = 'field-columns'
      columns.innerHTML = '<div class="field-cell field-name">Field</div><div class="field-cell field-type">Type</div><div class="field-cell field-options">Opt</div><div class="field-cell field-key">Key</div>'
      box.appendChild(columns)
      table.fields.forEach(field => {
         const row = document.createElement('div')
         row.className = 'field-row'
         row.dataset.table = table.name
         row.dataset.field = field.name
         row.addEventListener('mouseenter', event => showTooltip(event, buildFieldTooltip(table, field)))
         row.addEventListener('mousemove', event => moveTooltip(event))
         row.addEventListener('mouseleave', hideTooltip)
         const fieldName = document.createElement('div')
         fieldName.className = 'field-cell field-name'
         fieldName.textContent = field.name
         const fieldType = document.createElement('div')
         fieldType.className = 'field-cell field-type'
         renderTypeCell(fieldType, field)
         const fieldOptions = document.createElement('div')
         fieldOptions.className = 'field-cell field-options'
         renderOptionsCell(fieldOptions, field)
         const fieldKey = document.createElement('div')
         fieldKey.className = 'field-cell field-key'
         renderKeyCell(fieldKey, field)
         row.appendChild(fieldName)
         row.appendChild(fieldType)
         row.appendChild(fieldOptions)
         row.appendChild(fieldKey)
         box.appendChild(row)
      })
      return box
   }

   function isLinkTable(table) {
      if (table.name.startsWith('link_')) return true
      return table.fields.filter(field => field.targets.length > 0 || field.isAutoForeign).length >= 2
   }

   function compactType(type) {
      const normalized = String(type || '').toUpperCase()
      if (normalized === 'INTEGER') return 'INT'
      if (normalized === 'TEXT') return 'TEXT'
      if (normalized === 'REAL') return 'REAL'
      if (normalized === 'BLOB') return 'BLOB'
      return normalized.slice(0, 4)
   }

   function getTypeClass(type) {
      const normalized = String(type || '').toUpperCase()
      if (normalized === 'INTEGER') return 'type-int'
      if (normalized === 'TEXT') return 'type-text'
      if (normalized === 'REAL') return 'type-real'
      if (normalized === 'BLOB') return 'type-blob'
      return 'type-other'
   }

   function renderTypeCell(cell, field) {
      const text = compactType(field.type)
      if (text) appendTokenPill(cell, text, getTypeClass(field.type))
   }

   function renderOptionsCell(cell, field) {
      if (field.options.includes('NOT_NULL')) appendTokenPill(cell, 'NN', 'opt-nn')
      if (field.options.includes('AUTOINCREMENT')) appendTokenPill(cell, 'AI', 'opt-ai')
      if (field.options.includes('UNIQUE')) appendTokenPill(cell, 'UQ', 'opt-uq')
      if (field.options.some(option => option.startsWith('DEFAULT:'))) appendTokenPill(cell, 'DF', 'opt-df')
   }

   function renderKeyCell(cell, field) {
      if (field.isPrimary) appendTokenPill(cell, 'PK', 'key-pk')
      if (field.isForeign) appendTokenPill(cell, 'FK', 'key-fk')
      if (field.isAutoForeign) appendTokenPill(cell, 'AUTO', 'key-auto')
      if (field.cardinality) appendTokenPill(cell, `[${field.cardinality}]`, 'cardinality')
   }

   function appendTokenPill(container, text, className) {
      const pill = document.createElement('span')
      pill.className = `token-pill ${className}`
      pill.textContent = text
      container.appendChild(pill)
   }

   function buildFieldTooltip(table, field) {
      const parts = [`<strong>${escapeHtml(table.name)}.${escapeHtml(field.name)}</strong>`]
      if (field.label) parts.push(`Label: ${escapeHtml(field.label)}`)
      parts.push(`Type: ${escapeHtml(field.type || 'unknown')}`)
      if (field.options.length) parts.push(`Options: ${escapeHtml(field.options.join(' '))}`)
      if (field.targets.length) {
         parts.push('<br><strong>Foreign Key:</strong>')
         parts.push(`Target: ${escapeHtml(field.targets.map(target => `${target.table}.${target.field}`).join(' '))}`)
         parts.push(`Cardinality: ${field.cardinality ? '[' + escapeHtml(field.cardinality) + ']' : 'not set'}`)
      } else if (field.isAutoForeign) {
         parts.push('<br><strong>Foreign Key:</strong>')
         parts.push('Target: auto-connected by matching primary-key name')
         parts.push(`Cardinality: ${field.cardinality ? '[' + escapeHtml(field.cardinality) + ']' : 'not set'}`)
      } else if (field.cardinality) {
         parts.push(`Cardinality: [${escapeHtml(field.cardinality)}]`)
      }
      return parts.join('<br>')
   }

   function showTooltip(event, html) { tooltip.innerHTML = html; tooltip.classList.add('visible'); moveTooltip(event) }
   function moveTooltip(event) { tooltip.style.left = `${event.clientX + 14}px`; tooltip.style.top = `${event.clientY + 14}px` }
   function hideTooltip() { tooltip.classList.remove('visible') }

   function selectTableForPointer(event, tableName) {
      const multiSelect = event.ctrlKey || event.metaKey
      if (multiSelect) {
         if (state.selectedTables.has(tableName)) state.selectedTables.delete(tableName)
         else state.selectedTables.add(tableName)
      } else {
         state.selectedTables.clear()
         state.selectedTables.add(tableName)
      }
      updateSelectionClasses()
   }

   function clearSelection() {
      if (!state.selectedTables.size) return
      state.selectedTables.clear()
      updateSelectionClasses()
   }

   function syncSelectedTables() {
      const knownTables = new Set(state.tables.map(table => table.name))
      ;[...state.selectedTables].forEach(tableName => { if (!knownTables.has(tableName)) state.selectedTables.delete(tableName) })
   }

   function updateSelectionClasses() {
      canvas.querySelectorAll('.table-box').forEach(box => box.classList.toggle('selected', state.selectedTables.has(box.dataset.table)))
   }

   function alignSelectedTables(mode) {
      const selected = state.tables.filter(table => state.selectedTables.has(table.name))
      if (selected.length < 2) {
         setStatus('Select at least two tables with Ctrl+Click first.')
         return
      }
      if (mode === 'left') {
         const x = Math.min(...selected.map(table => Number(table.x) || 0))
         selected.forEach(table => { table.x = x })
         renderAll()
         saveLayout(false)
         setStatus(`${selected.length} selected tables aligned left.`)
         return
      }
      if (mode === 'top') {
         const y = Math.min(...selected.map(table => Number(table.y) || 0))
         selected.forEach(table => { table.y = y })
         renderAll()
         saveLayout(false)
         setStatus(`${selected.length} selected tables aligned top.`)
      }
   }

   function startDrag(event, table, box) {
      event.preventDefault()
      selectTableForPointer(event, table.name)
      box.setPointerCapture(event.pointerId)
      state.drag = { table, box, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, baseX: table.x, baseY: table.y }
      box.addEventListener('pointermove', dragMove)
      box.addEventListener('pointerup', dragEnd)
      box.addEventListener('pointercancel', dragEnd)
   }

   function dragMove(event) {
      if (!state.drag || event.pointerId !== state.drag.pointerId) return
      const dx = event.clientX - state.drag.startX
      const dy = event.clientY - state.drag.startY
      const nextX = Math.max(0, snapToGrid(state.drag.baseX + dx))
      const nextY = Math.max(0, snapToGrid(state.drag.baseY + dy))
      state.drag.table.x = nextX
      state.drag.table.y = nextY
      state.drag.box.style.left = `${nextX}px`
      state.drag.box.style.top = `${nextY}px`
      refreshCanvasSize(false)
      drawLinks()
   }

   function dragEnd(event) {
      if (!state.drag || event.pointerId !== state.drag.pointerId) return
      const box = state.drag.box
      box.removeEventListener('pointermove', dragMove)
      box.removeEventListener('pointerup', dragEnd)
      box.removeEventListener('pointercancel', dragEnd)
      state.drag = null
      refreshCanvasSize(true)
      drawLinks()
      saveLayout(false)
   }

   function refreshCanvasSize(allowShrink = true) {
      const stageStyle = getComputedStyle(stage)
      const stagePaddingX = parseFloat(stageStyle.paddingLeft || '0') + parseFloat(stageStyle.paddingRight || '0')
      const stagePaddingY = parseFloat(stageStyle.paddingTop || '0') + parseFloat(stageStyle.paddingBottom || '0')
      const minWidth = Math.max(320, Math.floor(stage.clientWidth - stagePaddingX))
      const minHeight = Math.max(240, Math.floor(stage.clientHeight - stagePaddingY))
      let maxRight = 0
      let maxBottom = 0
      canvas.querySelectorAll('.table-box').forEach(box => {
         const x = parseFloat(box.style.left || '0') || 0
         const y = parseFloat(box.style.top || '0') || 0
         maxRight = Math.max(maxRight, x + Math.ceil(box.offsetWidth || box.getBoundingClientRect().width || 0))
         maxBottom = Math.max(maxBottom, y + Math.ceil(box.offsetHeight || box.getBoundingClientRect().height || 0))
      })
      let nextWidth = Math.max(minWidth, Math.ceil(maxRight + CANVAS_EXTRA_PADDING))
      let nextHeight = Math.max(minHeight, Math.ceil(maxBottom + CANVAS_EXTRA_PADDING))
      if (!allowShrink) {
         nextWidth = Math.max(nextWidth, Math.ceil(canvas.offsetWidth || 0))
         nextHeight = Math.max(nextHeight, Math.ceil(canvas.offsetHeight || 0))
      }
      canvas.style.width = `${nextWidth}px`
      canvas.style.height = `${nextHeight}px`
      linksSvg.setAttribute('width', String(nextWidth))
      linksSvg.setAttribute('height', String(nextHeight))
      linksSvg.style.width = `${nextWidth}px`
      linksSvg.style.height = `${nextHeight}px`
   }

   function drawLinks() {
      linksSvg.querySelectorAll('.connection').forEach(node => node.remove())
      linksSvg.querySelectorAll('.connection-label').forEach(node => node.remove())
      state.links.forEach(link => {
         const fromRow = getFieldRow(link.fromTable, link.fromField)
         const toRow = getFieldRow(link.toTable, link.toField) || getTableBox(link.toTable)
         if (!fromRow || !toRow) return
         const from = getAnchorPoint(fromRow, toRow)
         const to = getAnchorPoint(toRow, fromRow)
         const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
         path.setAttribute('class', link.isAuto ? 'connection auto' : 'connection')
         path.setAttribute('d', buildPath(from, to))
         if (showArrowsInput.checked) path.setAttribute('marker-end', 'url(#arrow)')
         linksSvg.appendChild(path)
         if (showLabelsInput.checked) drawCardinalityLabels(from, to, link)
      })
   }

   function drawCardinalityLabels(from, to, link) {
      if (link.fromCardinality) appendSvgText(from.x + (from.side === 'right' ? 8 : -8), from.y, `[${link.fromCardinality}]`, from.side === 'right' ? 'start' : 'end')
      if (link.toCardinality) appendSvgText(to.x + (to.side === 'right' ? 8 : -8), to.y, `[${link.toCardinality}]`, to.side === 'right' ? 'start' : 'end')
   }

   function appendSvgText(x, y, text, anchor = 'middle') {
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
      label.setAttribute('class', 'connection-label')
      label.setAttribute('x', String(x))
      label.setAttribute('y', String(y))
      label.setAttribute('text-anchor', anchor)
      label.setAttribute('dominant-baseline', 'middle')
      label.textContent = text
      linksSvg.appendChild(label)
   }

   function getTableBox(tableName) { return canvas.querySelector(`.table-box[data-table="${cssEscape(tableName)}"]`) }
   function getFieldRow(tableName, fieldName) { return canvas.querySelector(`.field-row[data-table="${cssEscape(tableName)}"][data-field="${cssEscape(fieldName)}"]`) }

   function getAnchorPoint(fromEl, toEl) {
      const canvasRect = canvas.getBoundingClientRect()
      const a = fromEl.getBoundingClientRect()
      const b = toEl.getBoundingClientRect()
      const useRight = b.left + b.width / 2 >= a.left + a.width / 2
      return { x: (useRight ? a.right : a.left) - canvasRect.left, y: a.top + a.height / 2 - canvasRect.top, side: useRight ? 'right' : 'left' }
   }

   function buildPath(from, to) {
      if (Math.abs(from.x - to.x) < 8 && Math.abs(from.y - to.y) < 80) {
         const loop = from.side === 'right' ? 80 : -80
         return `M ${from.x} ${from.y} C ${from.x + loop} ${from.y - 60}, ${to.x + loop} ${to.y + 60}, ${to.x} ${to.y}`
      }
      const gap = Math.max(50, Math.min(180, Math.abs(to.x - from.x) / 2))
      const c1x = from.side === 'right' ? from.x + gap : from.x - gap
      const c2x = to.side === 'right' ? to.x + gap : to.x - gap
      return `M ${from.x} ${from.y} C ${c1x} ${from.y}, ${c2x} ${to.y}, ${to.x} ${to.y}`
   }

   function getLayoutPositions() {
      const layout = {}
      state.tables.forEach(table => { layout[table.name] = { x: table.x, y: table.y } })
      return layout
   }

   function getOptionsSnapshot() {
      return { gap: getLayoutGap(), grid: getGridSize(), showLabels: showLabelsInput.checked, showArrows: showArrowsInput.checked }
   }

   function getDatabaseSnapshot() {
      return { name: getDatabaseName(), includeCreateDatabase: includeCreateDatabaseInput.checked }
   }

   function saveLayout() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getLayoutPositions()))
      localStorage.setItem(LAYOUT_GAP_KEY, String(getLayoutGap()))
      localStorage.setItem(GRID_SIZE_KEY, String(getGridSize()))
      localStorage.setItem(SHOW_LABELS_KEY, showLabelsInput.checked ? '1' : '0')
      localStorage.setItem(SHOW_ARROWS_KEY, showArrowsInput.checked ? '1' : '0')
      localStorage.setItem(DATABASE_NAME_KEY, getDatabaseName())
      localStorage.setItem(INCLUDE_CREATE_DATABASE_KEY, includeCreateDatabaseInput.checked ? '1' : '0')
   }

   function loadLayout() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      try {
         const layout = JSON.parse(raw)
         return applyLayoutPositions(layout)
      } catch (error) {
         setStatus('Layout load failed: ' + error.message)
         return false
      }
   }

   function applyLayoutPositions(layout) {
      if (!layout || typeof layout !== 'object') return false
      let applied = 0
      state.tables.forEach(table => {
         if (layout[table.name]) {
            table.x = Number(layout[table.name].x) || 0
            table.y = Number(layout[table.name].y) || 0
            applied++
         }
      })
      return applied > 0
   }

   function exportLayoutPackage() {
      const payload = { version: 'v0.2.1', app: 'LoTeK Database Schema Visualizer', exportedAt: new Date().toISOString(), database: getDatabaseSnapshot(), schema: schemaInput.value, options: getOptionsSnapshot(), layout: getLayoutPositions() }
      const blob = new Blob([JSON.stringify(payload, null, 3)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${getSafeDatabaseFileBase()}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setStatus('Layout package exported.')
   }

   function importLayoutPackage(event) {
      const file = event.target.files && event.target.files[0]
      event.target.value = ''
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
         try {
            const payload = JSON.parse(String(reader.result || '{}'))
            if (typeof payload.schema === 'string') schemaInput.value = payload.schema
            applyImportedDatabase(payload.database || payload)
            applyImportedOptions(payload.options || {})
            const parsed = parseSchema(schemaInput.value)
            state.tables = parsed.tables
            state.tableByName = new Map(state.tables.map(table => [table.name, table]))
            syncSelectedTables()
            state.explicitLinks = parsed.explicitLinks
            state.detectedLinks = []
            rebuildLinks()
            state.sqlText = generateSql(state.tables)
            sqlOutput.textContent = state.sqlText
            applyLayoutPositions(payload.layout || payload.tables || {})
            autoLayoutMissingOnly()
            renderAll()
            updateApplyButton()
            saveLayout(false)
            setStatus(`Layout package imported. ${state.tables.length} tables, ${state.links.length} links.`)
         } catch (error) {
            setStatus('Layout import failed: ' + error.message)
         }
      }
      reader.readAsText(file)
   }

   function applyImportedDatabase(database) {
      if (!database || typeof database !== 'object') return
      if (typeof database.name === 'string' && database.name.trim()) databaseNameInput.value = database.name.trim()
      if (typeof database.databaseName === 'string' && database.databaseName.trim()) databaseNameInput.value = database.databaseName.trim()
      if (typeof database.includeCreateDatabase === 'boolean') includeCreateDatabaseInput.checked = database.includeCreateDatabase
   }

   function applyImportedOptions(options) {
      if (Number.isFinite(Number(options.gap))) layoutGapInput.value = String(clamp(Math.round(Number(options.gap)), 0, 300))
      if (Number.isFinite(Number(options.grid))) gridSizeInput.value = String(clamp(Math.round(Number(options.grid)), 0, 100))
      if (typeof options.showLabels === 'boolean') showLabelsInput.checked = options.showLabels
      if (typeof options.showArrows === 'boolean') showArrowsInput.checked = options.showArrows
   }

   function setStatus(text) { statusEl.textContent = text }

   function debounce(fn, delay) {
      let timer = null
      return (...args) => {
         clearTimeout(timer)
         timer = setTimeout(() => fn(...args), delay)
      }
   }

   function escapeHtml(value) {
      return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]))
   }

   function cssEscape(value) {
      if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value)
      return String(value).replace(/["\\]/g, '\\$&')
   }
})()