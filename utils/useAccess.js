import { useEffect, useState } from "react";

export default function useAccess() {
    const [canAccess, setCanAccess] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const fetchAccess = async () => {
            try {
                const roleRes = await fetch('/api/user/role');
                let role = null;
                if (roleRes.ok) {
                    const roleData = await roleRes.json();
                    role = roleData.role;
                    setIsAdmin(role === "admin");
                } else {
                    setIsAdmin(false);
                }

                const subRes = await fetch('/api/user/subscription');
                let priceId = null;
                if (subRes.ok) {
                    const subData = await subRes.json();
                    priceId = subData.priceId;
                }

                // Only allow if priceId is a non-empty string (not null/undefined/empty) or role is exactly 'admin'
                const hasValidSub = typeof priceId === 'string' && priceId.trim().length > 0;
                if (hasValidSub || role === "admin") {
                    setCanAccess(true);
                } else {
                    setCanAccess(false);
                }
            } catch (e) {
                setCanAccess(false);
                setIsAdmin(false);
            } finally {
                setLoading(false);
            }
        };
        fetchAccess();
    }, []);

    return { loading, canAccess, isAdmin };
}
