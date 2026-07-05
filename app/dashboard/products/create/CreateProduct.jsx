'use client'

import ProductForm from "@/components/DashboardComponents/ProductForm"
import useAccess from "@/utils/useAccess";
import { DashProvider, SkeletonRow } from '@/components/dashboard-ui';
import Fallback from "../../Fallback";

function CreateProduct() {
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
    return (
        <DashProvider>
            <div className='mx-auto w-full max-w-[1200px] px-6 py-8'>
                <ProductForm mode="Create" />
            </div>
        </DashProvider>
    )
}

export default CreateProduct
