/**
 * The AppSettings singleton id is environment-scoped: dev and prod use separate
 * documents so dev pricing/config changes never touch production. Always resolve
 * the id through this helper (mirrors app/api/admin/settings/route.js).
 */
export function getAppSettingsId() {
  return process.env.NODE_ENV === 'development' ? 'app-settings-dev' : 'app-settings'
}
