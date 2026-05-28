export default function BooleanField({ label, value, onChange }) {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">{label}</label>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => onChange(!value)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                        ${value ? 'bg-textColor' : 'bg-borderColor'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-lightColor">{value ? 'On' : 'Off'}</span>
            </div>
        </div>
    )
}
