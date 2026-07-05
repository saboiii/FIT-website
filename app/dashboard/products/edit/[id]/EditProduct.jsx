'use client';
import ProductForm from "@/components/DashboardComponents/ProductForm";
import { useUser } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react";
import { DashProvider } from '@/components/dashboard-ui';

function EditProduct() {
    // `isLoaded` (not `isLoading`) is Clerk's readiness flag — the old guard
    // destructured a property that doesn't exist, so it never fired.
    const { user, isLoaded } = useUser();
    const params = useParams();
    const productId = params.id;
    const [productToEdit, setProductToEdit] = useState(null);
    const router = useRouter();

    useEffect(() => {
        if (!user || !isLoaded) return;

        if (!productId) {
            router.push('/dashboard/products');
            return;
        }

        const fetchProduct = async () => {
            const res = await fetch(`/api/product?ids=${productId}`);
            const data = await res.json();
            if (data.products && data.products.length > 0) {
                setProductToEdit(data.products[0]);
            } else {
                console.error('Product not found');
            }
        };

        fetchProduct();
    }, [productId, user, isLoaded, router]);

    return (
        <DashProvider>
            <div className='mx-auto w-full max-w-[1200px] px-6 py-8'>
                <ProductForm
                    mode="Edit"
                    product={productToEdit}
                />
            </div>
        </DashProvider>
    )
}

export default EditProduct
