'use client'
// Security as grouped inline-edit rows: the password row morphs in place into
// inputs with Save/Cancel; devices are quiet hairline rows with per-device
// sign-out plus a one-tap "Sign out other devices" (loops the existing
// per-device revoke, no new backend); deletion stays behind a ConfirmDialog
// (window.confirm is banned, §4.10). Clerk/fetch semantics are unchanged.
import { useClerk } from '@clerk/nextjs'
import { useState } from 'react'
import { IoLaptopOutline } from 'react-icons/io5'
import { ConfirmDialog, StatusPill } from '@/components/dashboard-ui'
import { SettingGroup, SettingRow, settingInputCls } from './SettingRows'
import { useToast } from '../General/ToastProvider'

function SecuritySettings({ devices = [], currentSession, user }) {
    const [password, setPassword] = useState('')
    const [passwordConfirm, setPasswordConfirm] = useState('')
    const [passwordMsg, setPasswordMsg] = useState('')
    const [deleteMsg, setDeleteMsg] = useState('')
    const [loading, setLoading] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
    const { signOut } = useClerk()
    const { showToast } = useToast()

    const handlePasswordSave = async () => {
        setPasswordMsg('')
        if (password !== passwordConfirm) {
            setPasswordMsg('Passwords do not match.')
            return
        }
        setLoading(true)
        try {
            // Clerk v5: password update is done on the user object
            if (user && typeof user.updatePassword === 'function') {
                await user.updatePassword({ newPassword: password })
            }
            setPasswordMsg('Password updated!')
            setEditMode(false)
            setPassword('')
            setPasswordConfirm('')
        } catch (err) {
            setPasswordMsg('Failed to update password.')
        }
        setLoading(false)
    }

    const handleSignOutSession = async (sessionId) => {
        setLoading(true)
        try {
            // If this is the current session, sign out via Clerk helper
            if (currentSession && sessionId === currentSession.id) {
                await signOut()
                return
            }

            const res = await fetch('/api/user/sessions', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sessionId }),
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to sign out device.')
            }
        } catch (err) {
            showToast(err.message || 'Failed to sign out device.', 'error')
        } finally {
            setLoading(false)
        }
    }

    const otherDevices = devices.filter((d) => !(currentSession && d.id === currentSession.id))

    // Sign out everywhere else: the existing per-device revoke, looped.
    const handleSignOutOthers = async () => {
        for (const device of otherDevices) {
            await handleSignOutSession(device.id)
        }
    }

    const handleDeleteAccount = async () => {
        setDeleteMsg('')
        setLoading(true)
        try {
            const res = await fetch('/api/user/delete', {
                method: 'DELETE',
            })

            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to delete account.')
            }

            setDeleteMsg('Account deleted.')
            await signOut()
        } catch (err) {
            setDeleteMsg(err.message || 'Failed to delete account.')
        } finally {
            setLoading(false)
            setConfirmDeleteOpen(false)
        }
    }

    const startPasswordEdit = () => {
        setEditMode(true)
        setPassword('')
        setPasswordConfirm('')
        setPasswordMsg('')
    }

    const cancelPasswordEdit = () => {
        setEditMode(false)
        setPassword('')
        setPasswordConfirm('')
        setPasswordMsg('')
    }

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h2 className="dash-title">Security</h2>
                <p className="text-[13px] dash-soft mt-1">Password, signed-in devices and account removal.</p>
            </div>

            <div>
                <SettingGroup title="Sign in">
                    <SettingRow
                        label="Password"
                        value={<span className="tracking-wider select-none">•••••••••••</span>}
                        editing={editMode}
                        onEdit={startPasswordEdit}
                        onCancel={cancelPasswordEdit}
                        onSave={handlePasswordSave}
                        busy={loading}
                    >
                        <div className="flex flex-col gap-1.5">
                            <input
                                type="password"
                                placeholder="New password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={settingInputCls}
                                disabled={loading}
                            />
                            <input
                                type="password"
                                placeholder="Confirm password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                className={settingInputCls}
                                disabled={loading}
                            />
                        </div>
                    </SettingRow>
                </SettingGroup>
                {passwordMsg && (
                    <p
                        className={`text-[12px] font-medium mt-3 ${
                            passwordMsg.includes('updated')
                                ? 'text-[var(--dash-ok)]'
                                : 'text-[var(--dash-bad)]'
                        }`}
                    >
                        {passwordMsg}
                    </p>
                )}
            </div>

            <SettingGroup
                title="Devices"
                action={
                    otherDevices.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSignOutOthers}
                            disabled={loading}
                            className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] cursor-pointer disabled:opacity-50"
                        >
                            Sign out other devices
                        </button>
                    )
                }
            >
                {devices.length === 0 && <p className="py-4 text-[13px] dash-soft">No active devices.</p>}
                {devices.map((device) => {
                    const isCurrent = currentSession && device.id === currentSession.id
                    const activity = device.latestActivity || {}
                    return (
                        <div key={device.id} className="flex items-start gap-3.5 py-4">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)]">
                                <IoLaptopOutline size={16} aria-hidden="true" />
                            </span>
                            <div className="flex min-w-0 flex-col gap-0.5">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[13px] font-medium break-words">
                                        {activity.deviceType || 'Device'}
                                    </span>
                                    {isCurrent && <StatusPill tone="sun">This device</StatusPill>}
                                </div>
                                <p className="dash-data dash-soft break-words">
                                    {[
                                        [activity.browserName, activity.browserVersion].filter(Boolean).join(' '),
                                        [activity.city, activity.country].filter(Boolean).join(', '),
                                    ]
                                        .filter(Boolean)
                                        .join(', ')}
                                </p>
                                <p className="dash-data dash-soft break-words">IP: {activity.ipAddress}</p>
                                {device.lastActiveAt && (
                                    <p className="dash-data dash-soft break-words">
                                        Last active: {new Date(device.lastActiveAt).toLocaleString()}
                                    </p>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleSignOutSession(device.id)}
                                    className="mt-1 w-fit text-[12px] font-medium underline dash-soft hover:text-[var(--dash-ink)] cursor-pointer disabled:opacity-50"
                                    disabled={loading}
                                >
                                    Sign out of device
                                </button>
                            </div>
                        </div>
                    )
                })}
            </SettingGroup>

            <SettingGroup title="Danger zone">
                <div className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                    <p className="max-w-md text-[13px] dash-soft">
                        Deleting your account removes your profile and signs you out everywhere. This cannot
                        be undone.
                    </p>
                    <button
                        type="button"
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="dash-hoverable inline-flex w-fit shrink-0 items-center rounded-full bg-[var(--dash-bad)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                        disabled={loading}
                    >
                        Delete account
                    </button>
                </div>
                {deleteMsg && <p className="pb-3 text-[12px] font-medium dash-soft">{deleteMsg}</p>}
            </SettingGroup>

            <ConfirmDialog
                open={confirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDeleteAccount}
                title="Delete your account?"
                body="This permanently removes your account and cannot be undone."
                confirmLabel="Delete account"
                tone="bad"
                busy={loading}
            />
        </div>
    )
}

export default SecuritySettings
