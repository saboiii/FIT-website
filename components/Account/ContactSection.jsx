'use client'
// Billing contact section as a rate-card style document (blueprint §9.5):
// dotted-leader facts in view mode, labelled rows in edit mode. Fetch
// endpoints and payloads are unchanged from the legacy section.
import { useEffect, useState } from 'react'
import { AiOutlineEdit } from 'react-icons/ai'
import { RiSaveLine } from 'react-icons/ri'
import { DashCard, DottedRow } from '@/components/dashboard-ui'

const inputCls =
    'rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] min-w-0 w-full'

function Field({ label, ...props }) {
    return (
        <label className="flex flex-col gap-1">
            <span className="dash-label">{label}</span>
            <input type="text" className={inputCls} {...props} />
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
    const [editMode, setEditMode] = useState(false)

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
            setEditMode(false)
        } catch {
            setMsg('Failed to update contact info.')
        }
        setLoading(false)
    }

    const hasAddress =
        address.street || address.unitNumber || address.city || address.state || address.postalCode || address.country

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="dash-title">Billing & contact</h2>
                <p className="text-[13px] dash-soft mt-1 max-w-md">
                    Your billing address and contact details, used for delivery and to reach you about your
                    account.
                </p>
            </div>

            <DashCard
                title="Contact details"
                action={
                    <button
                        type="button"
                        onClick={() => {
                            if (editMode) handleSave()
                            else setEditMode(true)
                        }}
                        disabled={loading}
                        className="dash-hoverable inline-flex items-center gap-2 rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-1.5 text-[12px] font-medium cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                    >
                        {editMode ? 'Save' : 'Edit'}
                        {editMode ? <RiSaveLine /> : <AiOutlineEdit />}
                    </button>
                }
            >
                {editMode ? (
                    <div className="flex flex-col gap-5 max-w-md">
                        <div>
                            <h4 className="dash-section mb-2">Phone</h4>
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
                        </div>
                        <div>
                            <h4 className="dash-section mb-2">Billing address</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                        </div>
                    </div>
                ) : (
                    <div className="max-w-md">
                        <DottedRow label="Phone">
                            {phone.countryCode || phone.number ? (
                                <span>
                                    {phone.countryCode} {phone.number}
                                </span>
                            ) : (
                                <span className="dash-soft">Not provided</span>
                            )}
                        </DottedRow>
                        <div className="mt-3">
                            <span className="dash-data dash-soft">Billing address</span>
                            {hasAddress ? (
                                <p className="mt-1 text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2">
                                    {address.street}
                                    {address.unitNumber && ` #${address.unitNumber}`}
                                    <br />
                                    {[address.city, address.state, address.postalCode].filter(Boolean).join(' ')}
                                    <br />
                                    {address.country}
                                </p>
                            ) : (
                                <p className="mt-1 text-[13px] dash-soft">No address provided</p>
                            )}
                        </div>
                    </div>
                )}
                {msg && (
                    <p
                        className={`text-[12px] font-medium mt-4 ${
                            msg.includes('updated') ? 'text-[var(--dash-ok)]' : 'text-[var(--dash-bad)]'
                        }`}
                    >
                        {msg}
                    </p>
                )}
            </DashCard>
        </div>
    )
}

export default ContactSection
