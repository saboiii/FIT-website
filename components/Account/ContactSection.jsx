'use client'
// Billing contact as grouped inline-edit rows: phone and address each show
// label + value + quiet Edit, morphing in place into inputs with Save/Cancel.
// The address displays as a formatted block with a copy button. Fetch
// endpoints and payloads are unchanged from the legacy section.
import { useEffect, useState } from 'react'
import { IoCopyOutline } from 'react-icons/io5'
import { SettingGroup, SettingRow, settingInputCls } from './SettingRows'
import { useToast } from '../General/ToastProvider'

function Field({ label, ...props }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="dash-label">{label}</span>
            <input type="text" className={settingInputCls} {...props} />
        </label>
    )
}

function ContactSection() {
    const [phone, setPhone] = useState({ countryCode: '', number: '' })
    const [address, setAddress] = useState({
        street: '',
        unitNumber: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
    })
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState('')
    const [editingRow, setEditingRow] = useState(null) // 'phone' | 'address'
    const [snapshot, setSnapshot] = useState(null)
    const { showToast } = useToast()

    useEffect(() => {
        setLoading(true)
        Promise.all([
            fetch('/api/user/contact/phone').then((res) => (res.ok ? res.json() : {})),
            fetch('/api/user/contact/address').then((res) => (res.ok ? res.json() : {})),
        ])
            .then(([phoneData, addressData]) => {
                if (phoneData.phone) setPhone(phoneData.phone)
                if (addressData.address) setAddress(addressData.address)
            })
            .catch(() => setMsg('Failed to load contact info.'))
            .finally(() => setLoading(false))
    }, [])

    const handlePhoneChange = (e) => {
        const { name, value } = e.target
        setPhone((prev) => ({ ...prev, [name]: value }))
    }
    const handleAddressChange = (e) => {
        const { name, value } = e.target
        setAddress((prev) => ({ ...prev, [name]: value }))
    }

    const handleSave = async () => {
        setLoading(true)
        setMsg('')
        try {
            const phoneRes = await fetch('/api/user/contact/phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            })
            const addrRes = await fetch('/api/user/contact/address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address }),
            })
            if (phoneRes.ok && addrRes.ok) setMsg('Contact info updated!')
            else setMsg('Failed to update contact info.')
            setEditingRow(null)
        } catch {
            setMsg('Failed to update contact info.')
        }
        setLoading(false)
    }

    const beginEdit = (row) => {
        setSnapshot({ phone: { ...phone }, address: { ...address } })
        setMsg('')
        setEditingRow(row)
    }

    const cancelEdit = () => {
        if (snapshot) {
            setPhone(snapshot.phone)
            setAddress(snapshot.address)
        }
        setEditingRow(null)
    }

    const hasAddress =
        address.street || address.unitNumber || address.city || address.state || address.postalCode || address.country

    const addressText = [
        [address.street, address.unitNumber && `#${address.unitNumber}`].filter(Boolean).join(' '),
        [address.city, address.state, address.postalCode].filter(Boolean).join(' '),
        address.country,
    ]
        .filter(Boolean)
        .join('\n')

    const copyAddress = async () => {
        try {
            await navigator.clipboard.writeText(addressText)
            showToast('Address copied!', 'success')
        } catch (err) {
            showToast('Failed to copy', 'error')
        }
    }

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h2 className="dash-title">Billing & contact</h2>
                <p className="text-[13px] dash-soft mt-1 max-w-md">
                    Your billing address and contact details, used for delivery and to reach you about your
                    account.
                </p>
            </div>

            <div>
                <SettingGroup title="Contact details">
                    <SettingRow
                        label="Phone"
                        value={
                            phone.countryCode || phone.number ? (
                                <span>
                                    {phone.countryCode} {phone.number}
                                </span>
                            ) : (
                                <span className="dash-soft">Not provided</span>
                            )
                        }
                        editing={editingRow === 'phone'}
                        onEdit={() => beginEdit('phone')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        busy={loading}
                    >
                        <div className="grid grid-cols-[96px_1fr] gap-2">
                            <Field
                                label="Code"
                                name="countryCode"
                                placeholder="+65"
                                value={phone.countryCode ?? ''}
                                onChange={handlePhoneChange}
                                disabled={loading}
                            />
                            <Field
                                label="Number"
                                name="number"
                                placeholder="Phone number"
                                value={phone.number ?? ''}
                                onChange={handlePhoneChange}
                                disabled={loading}
                            />
                        </div>
                    </SettingRow>

                    <SettingRow
                        label="Billing address"
                        value={
                            hasAddress ? (
                                <div className="flex items-start gap-2.5">
                                    <p className="whitespace-pre-line text-[14px] leading-relaxed">{addressText}</p>
                                    <button
                                        type="button"
                                        onClick={copyAddress}
                                        title="Copy address"
                                        aria-label="Copy address"
                                        className="dash-hoverable mt-0.5 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink-soft)] hover:bg-[var(--dash-canvas)] hover:text-[var(--dash-ink)]"
                                    >
                                        <IoCopyOutline size={12} />
                                    </button>
                                </div>
                            ) : (
                                <span className="dash-soft">No address provided</span>
                            )
                        }
                        editing={editingRow === 'address'}
                        onEdit={() => beginEdit('address')}
                        onCancel={cancelEdit}
                        onSave={handleSave}
                        busy={loading}
                    >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Field
                                label="Street"
                                name="street"
                                placeholder="Street"
                                value={address.street}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                            <Field
                                label="Unit number"
                                name="unitNumber"
                                placeholder="Unit number"
                                value={address.unitNumber}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                            <Field
                                label="City"
                                name="city"
                                placeholder="City"
                                value={address.city}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                            <Field
                                label="State"
                                name="state"
                                placeholder="State"
                                value={address.state}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                            <Field
                                label="Postal code"
                                name="postalCode"
                                placeholder="Postal code"
                                value={address.postalCode}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                            <Field
                                label="Country"
                                name="country"
                                placeholder="Country"
                                value={address.country}
                                onChange={handleAddressChange}
                                disabled={loading}
                            />
                        </div>
                    </SettingRow>
                </SettingGroup>

                {msg && (
                    <p
                        className={`text-[12px] font-medium mt-3 ${
                            msg.includes('updated') ? 'text-[var(--dash-ok)]' : 'text-[var(--dash-bad)]'
                        }`}
                    >
                        {msg}
                    </p>
                )}
            </div>
        </div>
    )
}

export default ContactSection
