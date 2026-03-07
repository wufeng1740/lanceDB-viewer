# Plan to Fix DataTable Newline Copying

## Rationale
Currently, the DataTable cells render with `white-space: nowrap`, which collapses newlines (`\n`) into spaces visually. When a user selects and copies text from the grid, the browser copies the visually rendered spaces instead of the original newlines. A native tooltip exists to show the multiline format, but text cannot be copied directly from it.

## Scope Lock
You are ONLY allowed to modify:
- `src/components/DataTable.tsx`

You must NOT:
- Modify other files
- Rename types
- Rename functions
- Change folder structure
- Change schema
- Change database structure
- Change logger events
- Change IPC contracts
- Introduce new architecture
- Refactor unrelated logic

## Plan Details
1. **Intercept the `onCopy` Event in `DataTable.tsx`**:
   - Add an `onCopy` event handler to the `<td>` and `.transposed-cell` wrapper divs that render the cell content.
   - When fired, get the raw, complete value of `row[col]` and convert it to a string using `formatCellValue` or similar logic.
   - Extract the user's current selection via `window.getSelection()?.toString()`.
   - Compare the selected text with the rendered text (which has spaces instead of newlines). If the user selected the entire cell content, or if we can map their selection to the original string containing newlines, we override the clipboard's `text/plain` data with the original string.
   - Call `e.preventDefault()` to prevent the browser from overriding our clipboard payload.
   
2. **Alternative approach (CSS-based)**:
   - Modifying `.cell-content` CSS to natively allow `white-space: pre-wrap;` combined with `-webkit-line-clamp: 1` would cause the text to stop at the first newline. This would degrade the preview experience.
   - Therefore, the `onCopy` interception is the safest and least intrusive change that maintains existing invariants.

3. **Verify the Fix**:
   - Ensure the cell still displays perfectly on one line.
   - Ensure the multiline text is correctly populated into the clipboard when copied.
