'use client'
// Product create wrapper — access gate only; the rail/DashProvider come from
// CreatorShell via app/dashboard/layout.jsx.
import ProductForm from "@/components/DashboardComponents/ProductForm"
import useAccess from "@/utils/useAccess";
import { SkeletonRow } from '@/components/dashboard-ui';
import Fallback from "../../Fallback";

function CreateProduct() {
    const { loading, canAccess } = useAccess();

    if (loading) return (
        <div className='max-w-[720px] flex flex-col gap-3'>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
        </div>
    );

    if (!canAccess) return <Fallback />;
    return <ProductForm mode="Create" />
}

export default CreateProduct
