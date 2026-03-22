# Plan: Schema Column Sorting

## Objective
Enable sorting of the schema fields by column headers (Name, Type, Vector) in the Schema view, to help users easily find required information.

## Scope
File to be modified: `src/App.tsx`
No other files will be touched. No architectural or structural changes will be made.

## Proposed Changes
1. **State Addition**: Add state variable to `App` component to track the current sorting column and direction for the schema view.
   ```typescript
   const [schemaSort, setSchemaSort] = useState<{ key: 'name' | 'dataType' | 'isVector', direction: 'asc' | 'desc' } | null>(null);
   ```
2. **Sort Logic Implementation**: Update the rendering logic of `details.schemaFields` in the Schema tab to apply the sorting based on `schemaSort`.
   ```typescript
   const sortedSchemaFields = useMemo(() => {
     if (!details) return [];
     if (!schemaSort) return details.schemaFields;
     return [...details.schemaFields].sort((a, b) => {
       const { key, direction } = schemaSort;
       let valA = a[key];
       let valB = b[key];
       
       if (valA < valB) return direction === 'asc' ? -1 : 1;
       if (valA > valB) return direction === 'asc' ? 1 : -1;
       return 0;
     });
   }, [details, schemaSort]);
   ```
3. **UI Updates (Headers)**: Make the `Name`, `Type`, and `Vector` headers clickable. Add small indicators (like `▲` or `▼`) to show the current sort direction.
4. **UI Updates (Rows)**: Render `sortedSchemaFields` instead of `details.schemaFields`.

## Verification
- Test clicking on "Name" header to sort alphabetically (asc/desc/reset).
- Test clicking on "Type" header to sort by data types.
- Test clicking on "Vector" header to sort by vector configuration.
- Ensure the checkbox for column visibility toggle remains functional and is properly tied to the unsorted/sorted names correctly.
