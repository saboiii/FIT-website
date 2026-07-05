# Tasks: Harden Upload Endpoints

- [x] 1.1 Failing unit tests for `sanitizeKeyPart` (path segments stripped,
      control/unsafe chars removed, length capped, extension preserved,
      degenerate inputs get a fallback name).
- [x] 1.2 Implement `lib/uploadKey.js`; wire into `/api/upload/models` and
      `/api/upload/viewable` presign keys.
- [x] 1.3 Admin-gate `/api/upload/cleanup` (`checkAdminPrivileges` → 403) and
      accept only string keys.
- [x] 1.4 `yarn test:run` green; lint changed files.
