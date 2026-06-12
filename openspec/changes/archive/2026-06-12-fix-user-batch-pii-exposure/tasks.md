# Tasks: Admin-Gate the Batch User Lookup

- [x] 1.1 Failing route-level test: unauthenticated → 401; authenticated
      non-admin → 403; admin → 200 with users payload.
- [x] 1.2 Add `auth()` + `checkAdminPrivileges` gate to the route.
- [x] 1.3 `yarn test:run` green; lint changed files.
