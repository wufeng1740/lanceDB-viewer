# Implementation Plan: Column Visibility Toggle

## Summary of Requirements
The user wants a feature to toggle column visibility from the Schema view.
- A checkbox should be added before each column in the Schema view's field list.
- All columns are checked (visible) by default.
- Unchecking a column in the Schema view hides it in the Data view.
- The visibility state must be persisted, similar to the existing `columnOrder`.

## Scope Confirmation
- This feature is strictly constrained to the frontend React components handling the Schema and Data views.
- Persistence will use the existing `localStorage` key pattern (`ldb-view-${dbPath}::${tableName}`).

## Files to be Modified
1. `src/App.tsx`
   - **Changes:**
     - Add a `hiddenColumns` state.
     - Add a `useEffect` to load `hiddenColumns` from `localStorage` whenever `selected` (the active table) changes.
     - Add a "Visible" column with a checkbox to the Schema view's field table.
     - Add a toggle handler that updates `hiddenColumns` state and merged it back into the table's `localStorage` preferences.

2. `src/components/DataTable.tsx`
   - **Changes:**
     - Add `hiddenColumns` state.
     - Update the existing preference-loading `useEffect` to also read `hiddenColumns`.
     - Update the preference-saving `useEffect` to also include `hiddenColumns` when saving.
     - Update the `orderedColumns` useMemo to filter out any columns present in `hiddenColumns`.

**Confirmation:** No other files will be touched. No schema, database structure, or architectural invariants will be modified.

## Verification Plan
### Automated Tests
- This is a UI state feature using `localStorage`, manual verification is appropriate based on existing project conventions.

### Manual Verification
1. Open a LanceDB database and select a table.
2. Go to the "Schema" tab. Verify a checkbox column exists and all columns are checked.
3. Uncheck one or more columns.
4. Go to the "Data" tab. Verify the unchecked columns do not appear in the data table.
5. Reload the application and go to the "Data" tab. Verify the columns are still hidden (persistence works).
6. Go back to the "Schema" tab, check the columns again, and verify they reappear in the "Data" tab.
