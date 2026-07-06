'use client'
// Profile as grouped inline-edit rows (reference: docs/account-ui-reference-
// images/account-ui.png): photo, name and email each render as label + value
// + quiet Edit; the row morphs in place into inputs with Save/Cancel.
// Clerk logic is unchanged from the legacy section (setProfileImage, update,
// createEmailAddress) — only the interaction shell changed.
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { IoLogoGoogle } from 'react-icons/io5'
import { MdMailOutline } from 'react-icons/md'
import { SettingGroup, SettingRow, settingInputCls } from './SettingRows'
import { useToast } from '../General/ToastProvider'

function ProfileSettings({ connectedAccounts = [], user, isLoaded }) {
    const [loading, setLoading] = useState(false)
    const [editingRow, setEditingRow] = useState(null) // 'name' | 'email'
    const [profileImage, setProfileImage] = useState('')
    const [email, setEmail] = useState('')
    const [firstName, setFirstName] = useState(user?.firstName || '')
    const [lastName, setLastName] = useState(user?.lastName || '')
    const { showToast } = useToast()

    useEffect(() => {
        if (!isLoaded || !user) return
        setProfileImage(user.imageUrl || '')
        setEmail(user.primaryEmailAddress?.emailAddress || '')
        setFirstName(user.firstName || '')
        setLastName(user.lastName || '')
    }, [user, isLoaded])

    const handleProfileImageChange = async (e) => {
        if (!user) return
        const file = e.target.files[0]
        if (!file) return
        setLoading(true)
        try {
            await user.setProfileImage({ file })
            await user.reload()
            setProfileImage(user.imageUrl)
        } catch (err) {
            showToast('Failed to update profile image.', 'error')
        }
        setLoading(false)
    }

    const handleEmailChange = (e) => setEmail(e.target.value)
    const handleFirstNameChange = (e) => setFirstName(e.target.value)
    const handleLastNameChange = (e) => setLastName(e.target.value)

    const handleSave = async () => {
        if (!user) return
        setLoading(true)
        try {
            if (firstName !== user.firstName || lastName !== user.lastName) {
                await user.update({
                    firstName: firstName,
                    lastName: lastName,
                })
                await user.reload()
            }
            if (email !== user.primaryEmailAddress?.emailAddress) {
                await user.createEmailAddress({ emailAddress: email })
                await user.reload()
            }
            setEditingRow(null)
        } catch (err) {
            showToast('Failed to update email & full name: ' + err.message, 'error')
        }
        setLoading(false)
    }

    const cancelEdit = () => {
        setFirstName(user?.firstName || '')
        setLastName(user?.lastName || '')
        setEmail(user?.primaryEmailAddress?.emailAddress || '')
        setEditingRow(null)
    }

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h2 className="dash-title">Profile</h2>
                <p className="text-[13px] dash-soft mt-1">Your name, email address and photo.</p>
            </div>

            {!isLoaded ? (
                <div
                    className="animate-pulse bg-[var(--dash-line)] rounded-[var(--dash-r-card)] h-[180px]"
                    aria-hidden="true"
                />
            ) : (
                <SettingGroup title="Personal info">
                    <SettingRow
                        label="Photo"
                        value={
                            <Image
                                src={profileImage || '/user.jpg'}
                                alt="Profile"
                                width={44}
                                height={44}
                                className="h-11 w-11 rounded-full object-cover"
                                style={{ aspectRatio: '1 / 1' }}
                            />
                        }
                        hint="JPG or PNG. A square image looks best."
                        action={
                            <label
                                htmlFor="profile-image-upload"
                                className="dash-hoverable shrink-0 cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)]"
                            >
                                Upload new photo
                            </label>
                        }
                    />
                    <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        disabled={loading}
                        className="hidden"
                    />

                    <SettingRow
                        label="Name"
                        value={user.fullName || <span className="dash-soft">Not set</span>}
                        editing={editingRow === 'name'}
                        onEdit={() => setEditingRow('name')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        busy={loading}
                    >
                        <div className="flex w-full gap-1.5">
                            <input
                                type="text"
                                aria-label="First name"
                                className={`${settingInputCls} flex-1 font-medium`}
                                value={firstName}
                                onChange={handleFirstNameChange}
                                disabled={loading}
                            />
                            <input
                                type="text"
                                aria-label="Last name"
                                className={`${settingInputCls} flex-1 font-medium`}
                                value={lastName}
                                onChange={handleLastNameChange}
                                disabled={loading}
                            />
                        </div>
                    </SettingRow>

                    <SettingRow
                        label="Email"
                        value={email || <span className="dash-soft">Not set</span>}
                        editing={editingRow === 'email'}
                        onEdit={() => setEditingRow('email')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        busy={loading}
                    >
                        <input
                            type="email"
                            aria-label="Email address"
                            className={settingInputCls}
                            value={email}
                            onChange={handleEmailChange}
                            disabled={loading}
                        />
                    </SettingRow>
                </SettingGroup>
            )}

            <SettingGroup title="Connected accounts">
                {connectedAccounts.length === 0 && (
                    <p className="py-4 text-[13px] dash-soft">No connected accounts.</p>
                )}
                {connectedAccounts.map((acc, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 py-3.5">
                        {acc.provider.toLowerCase() === 'google' ? (
                            <IoLogoGoogle size={16} className="text-[var(--dash-ink-soft)]" />
                        ) : (
                            <MdMailOutline size={16} className="text-[var(--dash-ink-soft)]" />
                        )}
                        <span className="text-[13px] font-medium">
                            {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)}
                        </span>
                        <span className="dash-data dash-soft truncate">{acc.emailAddress}</span>
                    </div>
                ))}
            </SettingGroup>
        </div>
    )
}

export default ProfileSettings
