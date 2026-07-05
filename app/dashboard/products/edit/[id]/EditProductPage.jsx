'use client'

import EditProduct from "./EditProduct";
import Fallback from "@/app/dashboard/Fallback";
import useAccess from "@/utils/useAccess";
import { DashProvider, SkeletonRow } from '@/components/dashboard-ui';

function EditProductPage() {
    const { loading, canAccess } = useAccess();

    if (loading) return (
        <DashProvider>
            <div className='mx-auto w-full max-w-[720px] px-6 py-12 flex flex-col gap-3'>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
            </div>
        </DashProvider>
    );

    if (!canAccess) return <Fallback />;
    return <EditProduct />;
}

export default EditProductPage;
