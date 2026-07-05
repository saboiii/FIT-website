"use client";

import { useEffect, useState } from "react";
import { useToast } from "../General/ToastProvider";
import { BsPlus } from "react-icons/bs";
import { IoCalendarOutline } from "react-icons/io5";
import {
    DashCard,
    StatusPill,
    DottedRow,
    Sheet,
    ConfirmDialog,
    EmptyState,
    SkeletonRow,
} from "@/components/dashboard-ui";
import { inputCls, labelCls, quietBtnCls } from "@/components/DashboardComponents/ProductFormFields/dashFormUi";
import { sunBtnCls, inkBtnCls } from "./dashPanelUi";

/**
 * Events (§5.10): event cards (name, % off pill, Global/Inactive pills, the
 * window as a DottedRow) with the create/edit form in a Sheet grouped into
 * What · How much · When · Flags. API payloads are unchanged.
 */
export default function EventManagement() {
    const { showToast } = useToast();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null); // event pending confirm
    const [deleteBusy, setDeleteBusy] = useState(false);

    const emptyForm = {
        name: "",
        description: "",
        locations: "",
        isActive: true,
        isGlobal: false,
        percentage: "",
        minimumPrice: "0",
        startDate: "",
        endDate: "",
    };

    const [form, setForm] = useState(emptyForm);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/events");
            if (!res.ok) throw new Error("Failed to load events");
            const data = await res.json();
            setEvents(data.events || []);
        } catch (err) {
            console.error("Error loading events", err);
            showToast("Failed to load events", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const resetForm = () => {
        setEditingEvent(null);
        setForm(emptyForm);
    };

    const openCreate = () => {
        resetForm();
        setSheetOpen(true);
    };

    const closeSheet = () => {
        setSheetOpen(false);
        resetForm();
    };

    const handleEdit = (ev) => {
        setEditingEvent(ev);
        setForm({
            name: ev.name || "",
            description: ev.description || "",
            locations: Array.isArray(ev.locations) ? ev.locations.join(", ") : "",
            isActive: !!ev.isActive,
            isGlobal: !!ev.isGlobal,
            percentage: ev.percentage?.toString() ?? "",
            minimumPrice: ev.minimumPrice?.toString() ?? "0",
            startDate: ev.startDate ? new Date(ev.startDate).toISOString().slice(0, 10) : "",
            endDate: ev.endDate ? new Date(ev.endDate).toISOString().slice(0, 10) : "",
        });
        setSheetOpen(true);
    };

    const confirmDelete = async () => {
        const id = deleteTarget?._id;
        setDeleteBusy(true);
        try {
            const res = await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete event");
            showToast("Event deleted", "success");
            setDeleteTarget(null);
            await loadEvents();
            if (editingEvent && editingEvent._id === id) {
                setSheetOpen(false);
                resetForm();
            }
        } catch (err) {
            console.error("Error deleting event", err);
            showToast("Failed to delete event", "error");
        } finally {
            setDeleteBusy(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const payload = {
                name: form.name,
                description: form.description,
                locations: form.locations
                    ? form.locations
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                    : [],
                isActive: !!form.isActive,
                isGlobal: !!form.isGlobal,
                percentage: form.percentage ? Number(form.percentage) : undefined,
                minimumPrice: form.minimumPrice ? Number(form.minimumPrice) : 0,
                startDate: form.startDate,
                endDate: form.endDate,
            };

            const method = editingEvent ? "PUT" : "POST";
            const body = editingEvent ? { id: editingEvent._id, ...payload } : payload;

            const res = await fetch("/api/admin/events", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Failed to save event");
            }

            showToast(editingEvent ? "Event updated" : "Event created", "success");
            setSheetOpen(false);
            resetForm();
            await loadEvents();
        } catch (err) {
            console.error("Error saving event", err);
            showToast(err.message || "Failed to save event", "error");
        } finally {
            setSaving(false);
        }
    };

    const formGroup = (title, children) => (
        <div className="flex flex-col gap-3">
            <h4 className="dash-section pt-3 border-t border-[var(--dash-line)]">{title}</h4>
            {children}
        </div>
    );

    return (
        <div className="p-4 md:p-6">
            {events.length > 0 && (
                <div className="flex justify-end mb-4">
                    <button type="button" onClick={openCreate} className={`${sunBtnCls} flex items-center gap-1`}>
                        <BsPlus size={16} aria-hidden="true" /> New event
                    </button>
                </div>
            )}

            {loading ? (
                <div className="flex flex-col gap-3" aria-label="Loading events">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonRow key={i} />
                    ))}
                </div>
            ) : events.length === 0 ? (
                <EmptyState
                    icon={<IoCalendarOutline />}
                    title="No Events Yet"
                    body="Promotional events power storewide and product discounts. Create the first one."
                    cta="Create Event"
                    onCta={openCreate}
                />
            ) : (
                <div className="flex flex-col gap-3">
                    {events.map((ev) => (
                        <DashCard key={ev._id}>
                            <div className="flex items-start justify-between gap-4 flex-wrap sm:flex-nowrap">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13px] font-semibold truncate">{ev.name}</span>
                                        <StatusPill tone="ink">{ev.percentage}% off</StatusPill>
                                        {ev.isGlobal && <StatusPill tone="paper">Global</StatusPill>}
                                        {!ev.isActive && <StatusPill tone="hatch">Inactive</StatusPill>}
                                    </div>
                                    {ev.description && (
                                        <p className="text-[13px] dash-soft mt-1 max-w-md">{ev.description}</p>
                                    )}
                                    <div className="max-w-xs mt-2">
                                        <DottedRow label="Window">
                                            {ev.startDate && new Date(ev.startDate).toLocaleDateString()} – {ev.endDate && new Date(ev.endDate).toLocaleDateString()}
                                        </DottedRow>
                                        <DottedRow label="Minimum spend">
                                            S${typeof ev.minimumPrice === "number" ? ev.minimumPrice.toFixed(2) : ev.minimumPrice}
                                        </DottedRow>
                                    </div>
                                    {Array.isArray(ev.locations) && ev.locations.length > 0 && (
                                        <p className="dash-data dash-soft mt-1.5">
                                            Locations: {ev.locations.join(", ")}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => handleEdit(ev)}
                                        className={`${quietBtnCls} px-3 py-1`}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeleteTarget(ev)}
                                        className="text-[13px] font-medium text-[var(--dash-bad)] cursor-pointer hover:underline px-1.5"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </DashCard>
                    ))}
                </div>
            )}

            {/* Create/edit Sheet — What · How much · When · Flags (§5.10) */}
            <Sheet
                open={sheetOpen}
                onClose={closeSheet}
                label={editingEvent ? "Edit event" : "New event"}
                widthClass="max-w-xl"
            >
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <h3 className="dash-section">{editingEvent ? "Edit event" : "New event"}</h3>

                    {/* What */}
                    <div className="flex flex-col gap-3">
                        <h4 className="dash-section">What</h4>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="eventName" className={labelCls}>Name</label>
                            <input
                                id="eventName"
                                className={inputCls()}
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="e.g. Christmas Sale"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="eventDescription" className={labelCls}>Description</label>
                            <textarea
                                id="eventDescription"
                                className={`${inputCls()} min-h-[72px]`}
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Short description for internal reference"
                                required
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="eventLocations" className={labelCls}>Locations / channels (optional)</label>
                            <input
                                id="eventLocations"
                                className={inputCls()}
                                value={form.locations}
                                onChange={(e) => setForm((f) => ({ ...f, locations: e.target.value }))}
                                placeholder="e.g. Online, In-store, SG, MY"
                            />
                            <p className="text-[11px] font-medium dash-soft">
                                Comma-separated list, for your own targeting/reference.
                            </p>
                        </div>
                    </div>

                    {formGroup("How much", (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="eventPercentage" className={labelCls}>Discount %</label>
                                <input
                                    id="eventPercentage"
                                    type="number"
                                    min={1}
                                    max={100}
                                    className={`${inputCls()} dash-data`}
                                    value={form.percentage}
                                    onChange={(e) => setForm((f) => ({ ...f, percentage: e.target.value }))}
                                    placeholder="e.g. 10"
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="eventMinimum" className={labelCls}>Minimum amount</label>
                                <input
                                    id="eventMinimum"
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    className={`${inputCls()} dash-data`}
                                    value={form.minimumPrice}
                                    onChange={(e) => setForm((f) => ({ ...f, minimumPrice: e.target.value }))}
                                    placeholder="e.g. 50"
                                />
                            </div>
                        </div>
                    ))}

                    {formGroup("When", (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="eventStart" className={labelCls}>Start date</label>
                                <input
                                    id="eventStart"
                                    type="date"
                                    className={`${inputCls()} dash-data`}
                                    value={form.startDate}
                                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="eventEnd" className={labelCls}>End date</label>
                                <input
                                    id="eventEnd"
                                    type="date"
                                    className={`${inputCls()} dash-data`}
                                    value={form.endDate}
                                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>
                    ))}

                    {formGroup("Flags", (
                        <div className="flex flex-col gap-2">
                            <label htmlFor="eventActive" className="flex items-center gap-2 text-[13px] cursor-pointer">
                                <input
                                    id="eventActive"
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                                    className="w-4 h-4 rounded border-[var(--dash-line)] accent-[var(--dash-ink)]"
                                />
                                Event is active
                            </label>
                            <label htmlFor="eventGlobal" className="flex items-center gap-2 text-[13px] cursor-pointer">
                                <input
                                    id="eventGlobal"
                                    type="checkbox"
                                    checked={form.isGlobal}
                                    onChange={(e) => setForm((f) => ({ ...f, isGlobal: e.target.checked }))}
                                    className="w-4 h-4 rounded border-[var(--dash-line)] accent-[var(--dash-ink)]"
                                />
                                Apply store-wide as a global event
                            </label>
                        </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-3 border-t border-[var(--dash-line)]">
                        <button type="button" onClick={closeSheet} disabled={saving} className={quietBtnCls}>
                            Cancel
                        </button>
                        <button type="submit" disabled={saving} className={inkBtnCls}>
                            {saving ? "Saving…" : editingEvent ? "Update event" : "Create event"}
                        </button>
                    </div>
                </form>
            </Sheet>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete this event?"
                body={deleteTarget ? `"${deleteTarget.name}" will be removed. Products linking to it will lose the discount. This action cannot be undone.` : ""}
                confirmLabel="Delete event"
                tone="bad"
                busy={deleteBusy}
            />
        </div>
    );
}
