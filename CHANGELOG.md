# Changelog

All notable changes to **LoTeK Database Schema Visualizer** are documented in this file.

This file follows the structure of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.2.1] - 2026-05-12

### Changed

- Replaced the large fixed visual workspace with dynamic workspace sizing.
- Workspace minimum size now follows the visible stage area.
- Workspace now expands to the current table extents plus 400 px padding to the right and bottom.
- SVG connector layer now follows the dynamic workspace size.
- Layout package version updated to `v0.2.1`.

### Updated

- Dynamic workspace recalculation now runs after render, auto layout, layout import, window resize, drag movement, and drag end.
- README updated with dynamic workspace behavior.

## [0.2.0] - 2026-05-12

### Added

- Added `Database` section.
- Added editable database name field.
- Added `Include CREATE DATABASE in SQL` checkbox.
- Added optional `CREATE DATABASE <name>;` line to SQL output.
- Added database metadata to layout JSON export.
- Added database metadata restoration during layout JSON import.
- Added database name and CREATE DATABASE documentation to README.

### Changed

- Renamed the tool from `SerialzDB Schema Visualizer` to `LoTeK Database Schema Visualizer`.
- Renamed CSS and JavaScript files to neutral LoTeK database schema visualizer names.
- Export filenames are now based on the configured database name instead of the former SerialzDB-specific name.

### Kept

- INI source remains the editable schema format.
- SQL remains read-only generated output.
- Auto-detect links remains a preview step.
- Apply detected links remains an explicit user action.
- Auto-detect still only uses exact field-name matches to primary-key targets.
- Visual editing remains roadmap-only.

## [0.1.9] - 2026-05-12

### Added

- Added dedicated `Connector Lines` UI section.
- Added `Auto-detect links` button.
- Added `Apply detected links` button.
- Added primary-key-target-only mode display.
- Added connector line legend.
- Added safe application of detected links into the INI schema.
- Added README documentation for explicit links vs. detected links.
- Added README documentation for auto-detect limits and roadmap policy.

### Changed

- Removed the old auto-connect checkbox behavior.
- Auto-detection is now an explicit preview action.
- Detected links are shown as green dashed lines.
- Explicit schema links remain blue solid lines.
- `Show 1/N labels` and `Arrow heads` now belong to the connector section.
- Layout options are now limited to `Gap` and `Grid`.

### Auto-detect Rules

- A detected link is created only when a field name exactly matches a primary-key field in another table.
- Non-primary-key targets are not auto-detected.
- Ambiguous or semantic-only relations must be written manually.

### Apply Behavior

- `Apply detected links` writes detected links into the INI source as `> table.field`.
- Applied links become explicit schema links and are rendered as blue solid lines after reparse.

### Not Added

- No visual table editor.
- No visual field editor.
- No manual connector deletion.
- No ambiguous-link mode.
- No non-primary-key auto-detection.

## [0.1.8] - 2026-05-12

### Added

- Added empty-space click handling for clearing table selection.
- Added a dark outer workspace margin around the canvas.

### Changed

- Gap now defaults to `30`.
- Grid now defaults to `10`.
- Reworked Auto Layout row placement to use measured outer table-box height.
- Auto Layout now treats Gap as the required minimum distance between rows and columns.
- Auto Layout now aligns generated positions to the active Grid when Grid is greater than `0`.
- Kept Grid as optional; Grid `0` disables snapping.
- Kept manual table dragging snapped to Grid when Grid is greater than `0`.
- Updated layout export package version to `v0.1.8`.
- Updated README notes for defaults, selection clearing, and grid-aware Auto Layout.

### Fixed

- Fixed default option initialization.
- Fixed the `Number(null) = 0` localStorage fallback problem.

## [0.1.7] - 2026-05-12

### Added

- Added Ctrl+Click multi-selection for tables.
- Added selected-table highlight.
- Added `Align left` command.
- Added `Align top` command.
- Added README notes for layout handling and visual editing roadmap.

### Changed

- Split the previous single HTML file into separate HTML, CSS, and JavaScript files.
- Kept parsing focused on the current `field[label] = SQL_TYPE OPTIONS [1|N] > table.field` format.
- Reworked Auto Layout to use real rendered table container heights instead of estimated heights.
- Kept Grid/Snap independent from Auto Layout.
- Reduced the Key column width.
- Increased available width for the Field column.
- Updated exported INI, SQL, and layout file names to `v0.1.7`.

### Removed

- Removed the Normalize command and related UI.

## [0.1.6] - 2026-05-12

### Changed

- Increased Auto Layout table-height estimation so vertical Gap is respected more accurately.
- Removed Grid snapping from Auto Layout calculations.
- Grid now only affects manual table dragging.
- Grid input now accepts `0`.
- `Grid = 0` disables manual drag snapping.
- Kept default Gap at `30`.
- Kept default Grid at `10`.
- SQL/INI note text can now wrap instead of being truncated with ellipsis.
- Normalize button now has a tooltip explaining its purpose.
- Export filenames updated to `v0.1.6`.
- Layout export package version updated to `v0.1.6`.

### Fixed

- Auto Layout no longer produces unwanted row overlap caused by underestimated table height.
- Grid setting no longer changes or snaps existing table positions immediately.
- Imported Grid value can now restore `0` correctly.

### Notes

- `Normalize` converts older or inconsistent schema text into the canonical editable INI schema format.
- `Normalize` is useful for cleanup, not required during normal live editing.

## [0.1.5] - 2026-05-12

### Added

- Added Layout command group.
- Added `Export layout` command.
- Added `Import layout` command.
- Added persistent storage for Grid size.
- Layout packages now store schema text, table positions, and visual options.

### Changed

- Added pastel color coding for type, option, key, and cardinality badges.
- Changed the table header badge display so link tables show both `link` and the field count.
- Improved link-table detection by considering multiple foreign-key fields, not only the table name.
- Reworked field header and field row layout to use identical grid columns.
- Set default Gap to `30`.
- Added Grid option with default `10` and step `5`.
- Added snap-to-grid dragging for table boxes.
- Improved vertical alignment of 1/N connection labels.

### Kept

- INI view remains editable.
- SQL view remains read-only.
- Copy/Export still use the currently active INI or SQL tab.
- Auto Layout still has a red border.
- The schema editor starts empty.

## [0.1.4] - 2026-05-12

### Changed

- Changed visual table rows to compact column layout.
- Field labels are no longer shown directly in the visual table row.
- Field labels are still shown in the tooltip.
- Added compact visual columns: `Field`, `Type`, `Opt`, and `Key`.
- Type column now shows short type labels such as `INT`, `TEXT`, `REAL`, and `BLOB`.
- Options column now shows compact option labels such as `NN`, `AI`, `UQ`, and `DF`.
- Key column now shows `PK`, `FK`, `AUTO`, and optional `[1]` / `[N]`.
- Tooltip foreign-key information is now visually separated with a `Foreign Key:` section.
- Connection cardinality labels are now vertically centered on the connection line.
- Auto Layout button now has a stronger red border.
- Auto Layout now covers the previous clear/rebuild use case.
- Default schema editor content removed.
- Startup editor is now empty by default.

### Removed

- Removed `Clear Layout` button.

### Kept

- Live INI parser.
- Editable INI tab.
- Read-only SQL tab.
- Copy active format.
- Export active format.
- Normalize command.
- Gap option with default `50 px`.
- Auto-connect option.
- 1/N label option.
- Arrow heads option, disabled by default.
- Internal automatic layout persistence.

### Notes

- The INI schema remains the authoritative editable source.
- SQL output remains generated output only.
- A validation panel is the recommended next useful feature after this release.

## [0.1.3] - 2026-05-12

### Added

- Added live schema parsing while editing the INI source.
- Added new `key[label]` syntax.
- Added SQL output tab.
- Added Copy button for the active format.
- Added Export button for the active format.
- Added Normalize button.
- Added Commands section.
- Added Options section.
- Added Auto-connect checkbox.
- Added 1/N labels checkbox.
- Added Arrow heads checkbox.
- Added read-only SQL output styling.
- Added generated SQL `CREATE TABLE` output.

### Changed

- Removed visible Parse button.
- Removed visible Save Layout button.
- Removed visible Load Layout button.
- Gap default changed from `60 px` to `50 px`.
- Parser now prioritizes whitespace-separated SQL-style uppercase tokens.
- Normalize output now writes `key[label]` format.
- Layout positions are still stored automatically in localStorage.

### Kept

- Compact auto layout.
- Resizable sidebar.
- Draggable table boxes.
- Clear layout command.
- Local browser-only single-file behavior.

### Notes

- SQL output is generated and read-only.
- SQL output does not preserve labels or visual `[1]` / `[N]` markers.
- Multiple visual targets are noted as schema-only multi-target relations in SQL output.

## [0.1.2] - 2026-05-11

### Added

- Added Gap input to the toolbar.
- Added stored layout-gap setting.
- Added layout status messages for auto layout, save layout, load layout, and clear layout.
- Added ordered compact layout for the SerialzDB table set.
- Added table-order helper for common SerialzDB tables.

### Changed

- Changed Auto Layout from fixed semantic groups to compact top-left placement.
- Auto Layout now uses the configured Gap value.
- Auto Layout now calculates the number of columns from available workspace width.
- Missing table positions now trigger a complete compact auto layout instead of partial group placement.
- Updated storage keys to `v0.1.2`.
- Improved layout load status feedback.
- Improved layout error status reporting.
- Updated Clear Layout behavior to restore compact layout and report status.

### Kept

- Parse button workflow.
- Save Layout and Load Layout buttons.
- Clear Layout button.
- Resizable sidebar.
- Old comma-separated schema syntax.
- `foreign:table.field` relation syntax.

## [0.1.1] - 2026-05-10

### Added

- Added draggable splitter between schema sidebar and visual stage.
- Added persistent sidebar width setting.
- Added pointer-based sidebar resize handling.
- Added visual resize state for the splitter and body.
- Added connector redraw during sidebar resizing.

### Changed

- Sidebar width is now controlled through CSS variable `--sidebar-width`.
- Reduced minimum sidebar width from `320 px` to `240 px`.
- Added overflow handling to the sidebar.
- Updated mobile layout to hide the splitter.

### Kept

- Initial parse button workflow.
- Auto Layout, Save Layout, Load Layout, and Clear Layout commands.
- Old comma-separated schema syntax.
- `foreign:table.field` relation syntax.
- Draggable table boxes and connector lines.

## [0.1.0] - 2026-05-10

### Added

- Initial SerialzDB Schema Visualizer prototype.
- Added single-file browser-based HTML/CSS/JavaScript implementation.
- Added dark visual interface with sidebar and canvas stage.
- Added INI-style schema input with table sections.
- Added parser for the early comma-separated schema format.
- Added `foreign:table.field` relation syntax.
- Added Parse button.
- Added Auto Layout button.
- Added Save Layout button.
- Added Load Layout button.
- Added Clear Layout button.
- Added draggable table boxes.
- Added SVG connector lines for explicit foreign-key links.
- Added table header badges.
- Added field rows with compact metadata pills.
- Added tooltip for field details.
- Added localStorage-based table position storage.
- Added built-in demo schema content.
