# Tasks: Expandable Print-Config View (Admin)

## 1. Collapsible panel
- [ ] 1.1 Add an expand/collapse control (arrow) to each request row's print
      config section in `CustomPrintRequests.jsx`; default collapsed
- [ ] 1.2 Decouple the config display from edit mode so it's viewable while editing

## 2. Complete config display
- [ ] 2.1 Ensure all `printSettings` fields render (already mostly present ~266–286)
- [ ] 2.2 Render all `meshColors` with labels and swatches (already present ~288–308)
- [ ] 2.3 Show `dimensions`/weight; show the quote breakdown when available

## 3. Keep downloads
- [ ] 3.1 Retain "Print Config" (JSON) and "Model File" download actions

## 4. Verify
- [ ] 4.1 Manual: expand/collapse a request; full config readable without entering edit mode
