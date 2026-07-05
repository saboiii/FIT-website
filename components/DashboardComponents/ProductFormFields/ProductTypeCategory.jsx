import React from 'react'
import { DashSelect } from './dashFormUi'

export default function ProductTypeCategory({ form, setForm, isAdmin, categories, subcategories }) {
    return (
        <>
            <DashSelect
                onChangeFunction={e => {
                    const val = e.target.value;
                    if (val === "shop" && !isAdmin) return; // Prevent non-admin from selecting shop
                    setForm(f => ({
                        ...f,
                        productType: val,
                        categoryId: "",
                        subcategoryId: ""
                    }));
                }}
                value={form.productType}
                name="productType"
                label="Product Type"
                options={[
                    { value: "print", label: "Print" },
                    ...(isAdmin ? [{ value: "shop", label: "Shop" }] : [])
                ]}
            />

            <DashSelect
                onChangeFunction={e =>
                    setForm(f => ({
                        ...f,
                        categoryId: e.target.value,
                        subcategoryId: ""
                    }))}
                value={form.categoryId}
                name="category"
                label="Category"
                options={[
                    { value: "", label: "Select a category" },
                    ...categories.map((cat) => ({ value: cat.displayName, label: cat.displayName }))
                ]}
            />

            <DashSelect
                onChangeFunction={e =>
                    setForm(f => ({
                        ...f,
                        subcategoryId: e.target.value
                    }))}
                value={form.subcategoryId}
                name="subcategory"
                label="Subcategory"
                options={[
                    { value: "", label: "Select a subcategory" },
                    ...(subcategories || []).map((sub) => ({ value: sub.displayName, label: sub.displayName }))
                ]}
            />
        </>
    )
}
