'use client'
// Profile section as a small "document" card (blueprint §9.5): photo + name +
// email with a single Edit/Save affordance, connected accounts as quiet rows.
// Clerk logic is unchanged from the legacy section (setProfileImage, update,
// createEmailAddress).
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { AiOutlineEdit } from 'react-icons/ai'
import { FiEdit2 } from 'react-icons/fi'
import { RiSaveLine } from 'react-icons/ri'
import { IoLogoGoogle } from 'react-icons/io5'
import { MdMailOutline } from 'react-icons/md'
import { DashCard } from '@/components/dashboard-ui'
import { useToast } from '../General/ToastProvider'

const inputCls =
    'rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] min-w-0'

function ProfileSettings({ connectedAccounts = [], user, isLoaded }) {
    const [loading, setLoading] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [editMode, setEditMode] = useState(false)
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
            setEditMode(false)
        } catch (err) {
            showToast('Failed to update email & full name: ' + err.message, 'error')
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="dash-title">Profile</h2>
                <p className="text-[13px] dash-soft mt-1">Your name, email address and photo.</p>
            </div>

            {!isLoaded ? (
                <div
                    className="animate-pulse bg-[var(--dash-line)] rounded-[var(--dash-r-card)] h-[140px]"
                    aria-hidden="true"
                />
            ) : (
                <DashCard>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-5">
                        <div
                            className="relative flex items-center justify-center group h-[88px] w-[88px] shrink-0"
                            onMouseEnter={() => setHovered(true)}
                            onMouseLeave={() => setHovered(false)}
                        >
                            <label htmlFor="profile-image-upload" className="cursor-pointer block">
                                <Image
                                    src={profileImage || '/user.jpg'}
                                    alt="Profile"
                                    width={88}
                                    height={88}
                                    className="rounded-full object-cover h-[88px] w-[88px]"
                                    style={{ aspectRatio: '1 / 1' }}
                                />
                                <div
                                    className={`absolute inset-0 flex items-center justify-center rounded-full bg-[rgba(17,17,17,0.55)] transition-opacity duration-200 ${
                                        hovered ? 'opacity-100' : 'opacity-0'
                                    }`}
                                >
                                    <FiEdit2 className="text-[var(--dash-canvas)]" size={20} />
                                </div>
                            </label>
                            <input
                                id="profile-image-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleProfileImageChange}
                                disabled={loading}
                                className="hidden"
                            />
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full min-w-0 justify-between">
                            <div className="flex flex-col gap-1.5 min-w-0 w-full sm:max-w-sm">
                                {editMode ? (
                                    <>
                                        <div className="flex gap-1.5 w-full">
                                            <input
                                                type="text"
                                                aria-label="First name"
                                                className={`${inputCls} flex-1 font-medium`}
                                                value={firstName}
                                                onChange={handleFirstNameChange}
                                                disabled={loading}
                                            />
                                            <input
                                                type="text"
                                                aria-label="Last name"
                                                className={`${inputCls} flex-1 font-medium`}
                                                value={lastName}
                                                onChange={handleLastNameChange}
                                                disabled={loading}
                                            />
                                        </div>
                                        <input
                                            type="email"
                                            aria-label="Email address"
                                            className={`${inputCls} w-full`}
                                            value={email}
                                            onChange={handleEmailChange}
                                            disabled={loading}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <p className="dash-section break-words">{user.fullName || 'User'}</p>
                                        <p className="text-[13px] dash-soft break-words">
                                            {email || 'youremail@example.com'}
                                        </p>
                                    </>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    if (editMode) handleSave()
                                    else setEditMode(true)
                                }}
                                disabled={loading}
                                className="dash-hoverable inline-flex items-center gap-2 self-start rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                            >
                                {editMode ? 'Save' : 'Edit'}
                                {editMode ? <RiSaveLine /> : <AiOutlineEdit />}
                            </button>
                        </div>
                    </div>
                </DashCard>
            )}

            <DashCard title="Connected accounts">
                {connectedAccounts.length === 0 && (
                    <p className="text-[13px] dash-soft">No connected accounts.</p>
                )}
                <ul className="divide-y divide-[var(--dash-line)]">
                    {connectedAccounts.map((acc, idx) => (
                        <li key={idx} className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0">
                            {acc.provider.toLowerCase() === 'google' ? (
                                <IoLogoGoogle size={16} className="text-[var(--dash-ink-soft)]" />
                            ) : (
                                <MdMailOutline size={16} className="text-[var(--dash-ink-soft)]" />
                            )}
                            <span className="text-[13px] font-medium">
                                {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)}
                            </span>
                            <span className="dash-data dash-soft truncate">{acc.emailAddress}</span>
                        </li>
                    ))}
                </ul>
            </DashCard>
        </div>
    )
}

export default ProfileSettings
