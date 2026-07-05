# Tasks: Editor Lighting Preset + Render Responsiveness

## 1. Lighting preset (#8)
- [x] 1.1 Key `<Stage>` on `preset` so the light rig rebuilds on preset change.

## 2. Render responsiveness (#5)
- [x] 2.1 Memoize `meshColors` in `result.jsx` to cut needless scene-styler work.
- [x] 2.2 Document why the canvas can't move off the main thread (WebGL) and that
      pricing is already off-thread (server call).

## 3. Verify
- [x] 3.1 `yarn test:run` green.
- [ ] 3.2 Browser: switching lighting presets visibly changes lighting; settings
      changes feel smoother (deferred to client QA — `verify-quoting-flows-browser`).
