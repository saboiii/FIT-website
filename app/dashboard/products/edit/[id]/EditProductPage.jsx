'use client'
// Product edit wrapper — access gate only; the rail/DashProvider come from
// CreatorShell via app/dashboard/layout.jsx.
import EditProduct from "./EditProduct";
import Fallback from "@/app/dashboard/Fallback";
import useAccess from "@/utils/useAccess";
import { SkeletonRow } from '@/components/dashboard-ui';

function EditProductPage() {
    const { loading, canAccess } = useAccess();

    if (loading) return (
        <div className='max-w-[720px] flex flex-col gap-3'>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
        </div>
    );

    if (!canAccess) return <Fallback />;
    return <EditProduct />;
}

export default EditProductPage;
