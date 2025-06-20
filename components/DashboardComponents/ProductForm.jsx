'use client'
import { useUser } from "@clerk/nextjs";
import Image from "next/image"
import { RxCross1 } from "react-icons/rx"
import { BsPlus } from "react-icons/bs"
import { useEffect, useRef, useState } from "react"
import {
    SHOP_CATEGORIES,
    SHOP_SUBCATEGORIES,
    PRINT_CATEGORIES,
    PRINT_SUBCATEGORIES,
} from "@/lib/categories"
import currencyCodes from "currency-codes"
import { useRouter } from "next/navigation";

function ProductForm({ mode = "Create", product = null, setProduct, setMode }) {
    const { user, isLoaded } = useUser()
    const [events, setEvents] = useState([])
    const formattedMode = mode
        .trim()
        .toLowerCase()
        .replace(/^([a-z])/, (m) => m.toUpperCase())
    const allCurrencies = currencyCodes.data
        .map(c => c.code)
        .filter((v, i, a) => a.indexOf(v) === i)
        .sort();

    const imageInputRef = useRef(null);
    const modelInputRef = useRef(null);
    const [pendingImages, setPendingImages] = useState([]);
    const [pendingModels, setPendingModels] = useState([]);
    const { router } = useRouter();

    const defaultForm = {
        name: "",
        description: "",
        images: [],
        downloadableAssets: [],
        productType: "shop",
        category: 0,
        subcategory: 0,
        presentmentAmount: 0,
        presentmentCurrency: "SGD",
        priceCredits: "",
        stock: 1,
        variants: [],
        variantInput: "",
        deliveryTypes: {
            selfCollect: false,
            singpost: false,
            privateDelivery: false,
        },
        dimensions: {
            length: 0,
            width: 0,
            height: 0,
            weight: 0,
        },
        pickupLocation: "",
        royaltyFees: {
            singpost: 0,
            privateDelivery: 0,
        },
        showDiscount: false,
        discount: {
            eventId: "",
            percentage: "",
            minimumPrice: "",
            startDate: "",
            endDate: "",
        },
    };

    const [form, setForm] = useState(product ? { ...defaultForm, ...product } : defaultForm);

    const categories = form.productType === "shop" ? SHOP_CATEGORIES : PRINT_CATEGORIES
    const subcategories = form.productType === "shop" ? SHOP_SUBCATEGORIES : PRINT_SUBCATEGORIES


    useEffect(() => {
        const setCurrencyFromLocale = async () => {
            try {
                const locale = navigator.language || navigator.languages[0] || "en-SG"
                const mod = await import("locale-currency")
                const detected = mod.getCurrency(locale)
                setForm(f => {
                    // Only set if presentmentCurrency is still the default
                    if (f.presentmentCurrency === "SGD" && detected && allCurrencies.includes(detected)) {
                        return { ...f, presentmentCurrency: detected }
                    }
                    return f
                })
            } catch (e) { }
        }
        setCurrencyFromLocale()
    }, [])

    useEffect(() => {
        if (product) {
            setForm(f => ({
                ...defaultForm,
                ...product,
                presentmentAmount: product.price?.presentmentAmount ?? "",
                presentmentCurrency: product.price?.presentmentCurrency ?? "SGD",
                images: product.images || [],
                downloadableAssets: product.downloadableAssets || [],
            }));
        }
    }, [product]);

    const handleChange = e => {
        const { name, value, type, checked } = e.target;

        // Handle nested dimensions
        if (["length", "width", "height", "weight"].includes(name)) {
            setForm(f => ({
                ...f,
                dimensions: {
                    ...f.dimensions,
                    [name]: value
                }
            }));
        }
        // Handle nested royalty fees
        else if (name === "singpostRoyaltyFee") {
            setForm(f => ({
                ...f,
                royaltyFees: {
                    ...f.royaltyFees,
                    singpost: value
                }
            }));
        }
        else if (name === "privateRoyaltyFee") {
            setForm(f => ({
                ...f,
                royaltyFees: {
                    ...f.royaltyFees,
                    privateDelivery: value
                }
            }));
        }
        // Default: top-level
        else {
            setForm(f => ({
                ...f,
                [name]: type === "checkbox" ? checked : value
            }));
        }
    };

    const handleImageChange = (e) => {
        setPendingImages(prev => [...prev, ...Array.from(e.target.files)]);
    };

    const handleModelChange = (e) => {
        setPendingModels(prev => [...prev, ...Array.from(e.target.files)]);
    };

    const handleRemoveImage = idx => {
        if (idx < (form.images?.length || 0)) {
            setForm(f => ({
                ...f,
                images: f.images.filter((_, i) => i !== idx)
            }));
        } else {
            setPendingImages(pendingImages => pendingImages.filter((_, i) => i !== (idx - (form.images?.length || 0))));
        }
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    const handleRemoveModel = idx => {
        if (idx < (form.downloadableAssets?.length || 0)) {
            setForm(f => ({
                ...f,
                downloadableAssets: f.downloadableAssets.filter((_, i) => i !== idx)
            }));
        } else {
            setPendingModels(pendingModels => pendingModels.filter((_, i) => i !== (idx - (form.downloadableAssets?.length || 0))));
        }
        if (modelInputRef.current) {
            modelInputRef.current.value = "";
        }
    };

    const handleAddVariant = (e) => {
        e.preventDefault();
        const value = form.variantInput.trim();
        if (value && !form.variants.includes(value)) {
            setForm(f => ({
                ...f,
                variants: [...f.variants, value],
                variantInput: ""
            }));
        }
    };

    const handleRemoveVariant = (idx) => {
        setForm(f => ({
            ...f,
            variants: f.variants.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isLoaded) return;
        // 1. Upload images if any new ones selected
        let uploadedImages = [];
        if (pendingImages.length > 0) {
            const formData = new FormData();
            pendingImages.forEach(file => formData.append('files', file));
            const res = await fetch('/api/upload/images', { method: 'POST', body: formData });
            const { files } = await res.json();
            uploadedImages = files || [];
        }
        // 2. Upload models if any new ones selected
        let uploadedModels = [];
        if (pendingModels.length > 0) {
            const formData = new FormData();
            pendingModels.forEach(file => formData.append('files', file));
            const res = await fetch('/api/upload/models', { method: 'POST', body: formData });
            const { files } = await res.json();
            uploadedModels = files || [];
        }

        const payload = {
            creatorUserId: user?.id,
            creatorFullName: user?.fullName,
            name: form.name,
            description: form.description,
            images: [...form.images, ...uploadedImages],
            downloadableAssets: [...form.downloadableAssets, ...uploadedModels],
            price: {
                presentmentCurrency: form.presentmentCurrency,
                presentmentAmount: Number(form.presentmentAmount),
            },
            priceCredits: Number(form.priceCredits),
            stock: Number(form.stock),
            productType: form.productType,
            category: Number(form.category),
            subcategory: Number(form.subcategory),
            variants: form.variants,
            delivery: {
                deliveryTypes: [
                    ...(form.deliveryTypes.selfCollect
                        ? [{
                            type: "selfCollect",
                            pickupLocation: form.pickupLocation || null,
                            royaltyFee: 0,
                        }] : []),
                    ...(form.deliveryTypes.singpost
                        ? [{
                            type: "singpost",
                            royaltyFee: Number(form.royaltyFees.singpost) || 0,
                        }] : []),
                    ...(form.deliveryTypes.privateDelivery
                        ? [{
                            type: "privateDelivery",
                            royaltyFee: Number(form.royaltyFees.privateDelivery) || 0,
                        }] : []),
                ]
            },
            dimensions: {
                length: Number(form.dimensions.length),
                width: Number(form.dimensions.width),
                height: Number(form.dimensions.height),
                weight: Number(form.dimensions.weight),
            },
            discount: form.showDiscount ? {
                eventId: form.discount.eventId || null,
                percentage: form.discount.percentage ? Number(form.discount.percentage) : undefined,
                minimumAmount: form.discount.minimumPrice ? Number(form.discount.minimumPrice) : undefined,
                startDate: form.discount.startDate ? new Date(form.discount.startDate) : undefined,
                endDate: form.discount.endDate ? new Date(form.discount.endDate) : undefined,
            } : {},
        };

        const isEditing = !!(product && (product._id));
        const method = isEditing ? "PUT" : "POST";
        const url = isEditing
            ? `/api/product?productId=${product._id}`
            : "/api/product";

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || "Failed to create product");
            } else {
                if (!res.ok) {
                    alert(data.error || "Failed to create product");
                } else {
                    setPendingImages([]);
                    setPendingModels([]);
                    if (imageInputRef.current) imageInputRef.current.value = "";
                    if (modelInputRef.current) modelInputRef.current.value = "";
                    alert(isEditing ? "Product updated successfully!" : "Product created successfully!");
                    setForm({ ...defaultForm });
                    if (typeof setProduct === "function") setProduct(null);
                    if (typeof setMode === "function") setMode("Create");
                }
            }
        } catch (err) {
            alert("Network error: " + err.message);
        }
    }

    return (
        <div className="flex w-full flex-col justify-start items-start">
            <h1 className="flex w-full">{formattedMode} Product</h1>
            <form onSubmit={handleSubmit} className='flex flex-col w-full items-center justify-center gap-4'>

                {/* product name */}
                <div className="flex flex-col gap-2 w-full">
                    <label htmlFor="name">Product Name</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        required
                        value={form.name}
                        onChange={handleChange}
                        className="border"
                        placeholder="Enter product name"
                    />
                </div>

                {/* product desc */}
                <div className="flex flex-col gap-2  w-full">
                    <label className="flex">Product Description</label>
                    <textarea
                        id="description"
                        name="description"
                        rows={4}
                        maxLength={1000}
                        required
                        value={form.description}
                        onChange={handleChange}
                        className="border"
                        placeholder="Enter product description"
                        wrap="hard"
                    />
                </div>

                {/* product images */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="flex">Product Images</label>
                    <div className=" flex gap-2 flex-wrap">
                        {[...(form.images || []), ...pendingImages].map((item, idx) => {
                            const isPending = idx >= (form.images?.length || 0);
                            return (
                                <div key={idx} className='relative'>
                                    <Image
                                        src={
                                            isPending
                                                ? URL.createObjectURL(item)
                                                : `/api/proxy?key=${encodeURIComponent(item)}`
                                        }
                                        alt={`Preview ${idx + 1}`}
                                        loading="lazy"
                                        width={80}
                                        height={80}
                                        quality={20}
                                        className="w-20 h-20 object-cover rounded-sm border-[0.5px] border-text/20"
                                    />
                                    <RxCross1
                                        className="absolute top-1 right-1 cursor-pointer p-0.5"
                                        size={14}
                                        onClick={() => handleRemoveImage(idx)}
                                    />
                                </div>
                            );
                        })}
                        <label
                            className={`w-20 h-20 flex items-center justify-center rounded-sm border border-dashed
                            ${form.images.length >= 7 ? "opacity-60 cursor-not-allowed " : "cursor-pointer"}
                        `}
                            style={{ minWidth: 80, minHeight: 80 }}
                        >
                            {form.images.length >= 7 ? (
                                <span className="text-[10px] text-center px-1">MAX PHOTOS</span>
                            ) : (
                                <BsPlus className="text-2xl pointer-events-none" />
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageChange}
                                style={{ display: "none" }}
                                disabled={form.images.length >= 7}
                                ref={imageInputRef}
                            />
                        </label>
                    </div>
                </div>

                {/* downloadable assets (3D models) */}
                <div className='flex flex-col gap-2 w-full'>
                    <label className="flex option-primary">Downloadable Assets (3D Models)</label>
                    <label className="button-tertiary cursor-pointer w-fit">
                        Choose Files
                        <input
                            type="file"
                            accept=".obj,.glb,.gltf,.stl,.blend,.fbx,.zip,.rar,.7z"
                            multiple
                            onChange={handleModelChange}
                            style={{ display: "none" }}
                            ref={modelInputRef}
                        />
                    </label>
                    <ul className="flex flex-col text-xs">
                        {[...(form.downloadableAssets || []), ...pendingModels].map((item, idx) => {
                            const isPending = idx >= (form.downloadableAssets?.length || 0);
                            return (
                                <div className='gap-2 flex flex-row items-center justify-between' key={idx}>
                                    <li className='flex truncate' title={isPending ? item.name : item}>
                                        {isPending ? (
                                            <span className="underline">{item.name}</span>
                                        ) : (
                                            <a
                                                href={`/api/proxy?key=${encodeURIComponent(item)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline"
                                                download
                                            >
                                                {item.replace(/^models\//, "")}
                                            </a>
                                        )}
                                    </li>
                                    <RxCross1
                                        className='flex cursor-pointer'
                                        onClick={() => handleRemoveModel(idx)}
                                    />
                                </div>
                            );
                        })}
                    </ul>
                </div>

                {/* dimensions */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="flex">Product Dimensions</label>
                    <div className="flex flex-row items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <label htmlFor="length">Length (cm)</label>
                            <input
                                id="length"
                                name="length"
                                type="float"
                                min={0}
                                onChange={handleChange}
                                value={form.dimensions.length}
                                className="border"
                                placeholder="Enter length"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="width">Width (cm)</label>
                            <input
                                id="width"
                                name="width"
                                type="float"
                                min={0}
                                onChange={handleChange}
                                value={form.dimensions.width}
                                className="border"
                                placeholder="Enter width"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="height">Height (cm)</label>
                            <input
                                id="height"
                                name="height"
                                type="float"
                                min={0}
                                onChange={handleChange}
                                value={form.dimensions.height}
                                className="border"
                                placeholder="Enter height"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label htmlFor="weight">Weight (kg)</label>
                            <input
                                id="weight"
                                name="weight"
                                type="float"
                                min={0}
                                onChange={handleChange}
                                value={form.dimensions.weight}
                                className="border"
                                placeholder="Enter weight"
                            />
                        </div>
                    </div>
                </div>

                {/* delivery types */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="flex">Delivery Types</label>
                    <div className="flex flex-row gap-2">
                        <div className="flex items-center gap-1">
                            <label htmlFor="selfCollect">Self Collection</label>
                            <input
                                type="checkbox"
                                id="selfCollect"
                                name="selfCollect"
                                checked={form.deliveryTypes.selfCollect}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        deliveryTypes: {
                                            ...f.deliveryTypes,
                                            selfCollect: e.target.checked
                                        }
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <label htmlFor="singpost">Singpost</label>
                            <input
                                type="checkbox"
                                id="singpost"
                                name="singpost"
                                checked={form.deliveryTypes.singpost}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        deliveryTypes: {
                                            ...f.deliveryTypes,
                                            singpost: e.target.checked
                                        }
                                    }))
                                }
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            <label htmlFor="privateDelivery">Private</label>
                            <input
                                type="checkbox"
                                id="privateDelivery"
                                name="privateDelivery"
                                checked={form.deliveryTypes.privateDelivery}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        deliveryTypes: {
                                            ...f.deliveryTypes,
                                            privateDelivery: e.target.checked
                                        }
                                    }))
                                }
                            />
                        </div>
                    </div>

                    {/* pickup location */}
                    {form.deliveryTypes.selfCollect && (
                        <div className="flex flex-col gap-1 mt-2">
                            <label htmlFor="pickupLocation">Pickup Location</label>
                            <input
                                id="pickupLocation"
                                name="pickupLocation"
                                type="text"
                                value={form.pickupLocation}
                                onChange={handleChange}
                                placeholder="Enter pickup location"
                                className="border"
                                required
                            />
                        </div>
                    )}

                    {/* singpost royalty */}
                    {form.deliveryTypes.singpost && (
                        <div className="flex flex-col gap-1 mt-2">
                            <label htmlFor="singpostRoyaltyFee">Singpost Royalty Fee ($)</label>
                            <input
                                id="singpostRoyaltyFee"
                                name="singpostRoyaltyFee"
                                type="number"
                                min={0}
                                value={form.royaltyFees.singpost}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        royaltyFees: {
                                            ...f.royaltyFees,
                                            singpost: Number(e.target.value)
                                        }
                                    }))
                                }
                                className="border"
                                required
                            />
                        </div>
                    )}

                    {/* private royalty */}
                    {form.deliveryTypes.privateDelivery && (
                        <div className="flex flex-col gap-1 mt-2">
                            <label htmlFor="privateRoyaltyFee">Private Delivery Royalty Fee ($)</label>
                            <input
                                id="privateRoyaltyFee"
                                name="privateRoyaltyFee"
                                type="number"
                                min={0}
                                value={form.royaltyFees.privateDelivery}
                                onChange={e =>
                                    setForm(f => ({
                                        ...f,
                                        royaltyFees: {
                                            ...f.royaltyFees,
                                            privateDelivery: Number(e.target.value)
                                        }
                                    }))
                                }
                                className="border"
                                required
                            />
                        </div>
                    )}
                </div>

                {/* product type */}
                <div className="flex flex-col gap-2 w-full">
                    <label htmlFor="productType">Product Type</label>
                    <select
                        id="productType"
                        name="productType"
                        value={form.productType}
                        onChange={e =>
                            setForm(f => ({
                                ...f,
                                productType: e.target.value,
                                category: 0,
                                subcategory: 0
                            }))
                        }
                        className="border"
                        required
                    >
                        <option value="shop">Shop</option>
                        <option value="print">Print</option>
                    </select>
                </div>

                {/* product category */}
                <div className="flex flex-col gap-2 w-full">
                    <label htmlFor="category">Category</label>
                    <select
                        id="category"
                        name="category"
                        value={form.category}
                        onChange={e =>
                            setForm(f => ({
                                ...f,
                                category: Number(e.target.value),
                                subcategory: 0
                            }))
                        }
                        className="border"
                        required
                    >
                        {categories.map((cat, idx) => (
                            <option value={idx} key={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* product subcategory */}
                <div className="flex flex-col gap-2 w-full">
                    <label htmlFor="subcategory">Subcategory</label>
                    <select
                        id="subcategory"
                        name="subcategory"
                        value={form.subcategory}
                        onChange={e =>
                            setForm(f => ({
                                ...f,
                                subcategory: Number(e.target.value)
                            }))
                        }
                        className="border"
                        required
                    >
                        {subcategories[form.category]?.map((sub, idx) => (
                            <option value={idx} key={sub}>{sub}</option>
                        ))}
                    </select>
                </div>

                {/* product price */}
                <div className="flex flex-col gap-2 w-full">
                    <label className="flex">Product Price</label>
                    <div className="flex gap-1 items-center">
                        <input
                            id="presentmentAmount"
                            name="presentmentAmount"
                            type="number"
                            min={0}
                            step="0.01"
                            value={form.presentmentAmount}
                            onChange={handleChange}
                            className="border"
                            placeholder="Enter price"
                            required
                        />
                        <select
                            id="presentmentCurrency"
                            name="presentmentCurrency"
                            value={form.presentmentCurrency}
                            onChange={handleChange}
                            className="border w-28 uppercase"
                            required
                        >
                            {allCurrencies.map(code => (
                                <option value={code} key={code}>{code}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* product price in credits */}
                <div className="flex flex-col gap-2 w-full">
                    <label>Product Price (Credits)</label>
                    <input
                        id="priceCredits"
                        name="priceCredits"
                        type="number"
                        min={0}
                        value={form.priceCredits}
                        onChange={handleChange}
                        step="0.01"
                        className="border"
                        placeholder="Enter price in credits"
                        required
                    />
                </div>

                {/* product stock */}
                <div className="flex flex-col gap-2 w-full">
                    <label>Stock</label>
                    <input
                        id="stock"
                        name="stock"
                        type="number"
                        value={form.stock}
                        onChange={handleChange}
                        min={1}
                        step="1"
                        className="border"
                        placeholder="Enter stock quantity"
                        required
                    />
                </div>

                {/* product variants */}
                <div className="flex flex-col gap-2 w-full">
                    <label>Product Variants / Tags</label>
                    <div className="flex gap-2 items-center">
                        <input
                            type="text"
                            name="variantInput"
                            value={form.variantInput}
                            onChange={handleChange}
                            className="border flex-1"
                            placeholder="Add a variant or tag and press Enter"
                            maxLength={200}
                            onKeyDown={e => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddVariant(e);
                                }
                            }}
                        />
                        <button
                            type="button"
                            className="px-3 py-1 border rounded bg-accent text-white"
                            disabled={!form.variantInput.trim()}
                            onClick={handleAddVariant}
                        >
                            Add
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {form.variants.map((variant, idx) => (
                            <span
                                key={variant}
                                className="flex items-center border rounded px-2 py-1 text-sm"
                            >
                                {variant}
                                <RxCross1
                                    className="ml-1 cursor-pointer"
                                    size={14}
                                    onClick={() => handleRemoveVariant(idx)}
                                />
                            </span>
                        ))}
                    </div>
                </div>

                {/* discount */}
                <div className="flex flex-col gap-2 w-full">
                    <label>Discounts</label>
                    {/* Add Discount Button */}
                    <button
                        type="button"
                        className="px-3 py-1 border rounded bg-accent text-white w-fit"
                        onClick={() => setForm(f => ({ ...f, showDiscount: true }))}
                        disabled={form.showDiscount}
                    >
                        Add Discount
                    </button>

                    {/* discount box */}
                    {form.showDiscount && (
                        <div className="flex flex-col gap-2 border p-3 rounded">
                            {/* event selection (optional) */}
                            {events && events.length > 0 && (
                                <div className="flex flex-col gap-1">
                                    <label htmlFor="eventId">Select Event (optional)</label>
                                    <select
                                        id="eventId"
                                        name="eventId"
                                        value={form.discount.eventId}
                                        onChange={e =>
                                            setForm(f => ({
                                                ...f,
                                                discount: { ...f.discount, eventId: e.target.value }
                                            }))
                                        }
                                        className="border"
                                    >
                                        <option value="">None</option>
                                        {events.map(ev => (
                                            <option value={ev._id} key={ev._id}>
                                                {ev.name} ({ev.percentage}% off)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Custom discount fields */}
                            <div className="flex flex-col gap-1">
                                <label htmlFor="discountPercentage">Discount Percentage (%)</label>
                                <input
                                    id="discountPercentage"
                                    name="discountPercentage"
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={form.discount.percentage}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        discount: { ...f.discount, percentage: e.target.value }
                                    }))}
                                    className="border"
                                    placeholder="e.g. 10"
                                    required={!form.discount.eventId}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="discountMinimumAmount">Minimum Amount</label>
                                <input
                                    id="discountMinimumAmount"
                                    name="discountMinimumAmount"
                                    type="number"
                                    min={0}
                                    value={form.discount.minimumPrice}
                                    step="0.01"
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        discount: { ...f.discount, minimumPrice: e.target.value }
                                    }))}
                                    className="border"
                                    placeholder="e.g. 50"
                                    required={!form.discount.eventId}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="discountStartDate">Start Date</label>
                                <input
                                    id="discountStartDate"
                                    name="discountStartDate"
                                    type="date"
                                    value={form.discount.startDate}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        discount: { ...f.discount, startDate: e.target.value }
                                    }))}
                                    className="border"
                                    required={!form.discount.eventId}
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label htmlFor="discountEndDate">End Date</label>
                                <input
                                    id="discountEndDate"
                                    name="discountEndDate"
                                    type="date"
                                    value={form.discount.endDate}
                                    onChange={e => setForm(f => ({
                                        ...f,
                                        discount: { ...f.discount, endDate: e.target.value }
                                    }))}
                                    className="border"
                                    required={!form.discount.eventId}
                                />
                            </div>
                            <button
                                type="button"
                                className="px-3 py-1 border rounded w-fit mt-2"
                                onClick={() =>
                                    setForm(f => ({
                                        ...f,
                                        showDiscount: false,
                                        discount: {
                                            eventId: "",
                                            percentage: "",
                                            minimumPrice: "",
                                            startDate: "",
                                            endDate: "",
                                        }
                                    }))
                                }
                            >
                                Remove Discount
                            </button>
                        </div>
                    )}
                </div>

                <button type="submit" className="flex w-full border px-3 py-1">
                    Submit
                </button>
            </form>
        </div>
    )
}

export default ProductForm