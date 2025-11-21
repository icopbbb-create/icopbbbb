'use client';

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import { formUrlQuery, removeKeysFromUrlQuery } from "@jsmastery/utils";

/**
 * SearchInput:
 * - Uses `q` as the canonical free-text query param (preferred).
 * - Backwards-compat: if `topic` is present in URL, we seed from it on mount.
 * - Debounced push to router; clears param when input emptied.
 */
const SearchInput = () => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Prefer explicit q param, fallback to topic for backward compatibility
    const currentQ = useMemo(() => {
        return searchParams?.get('q') ?? searchParams?.get('topic') ?? '';
    }, [searchParams]);

    // initialize input from current URL param so it reflects state on mount / navigation
    const [searchQuery, setSearchQuery] = useState<string>(currentQ);

    // keep local state in sync when url changes externally
    useEffect(() => {
        setSearchQuery(currentQ);
    }, [currentQ]);

    useEffect(() => {
        const handler = setTimeout(() => {
            const trimmed = (searchQuery || "").trim();
            // if we have a non-empty query, set q param; otherwise remove it
            if (trimmed.length > 0) {
                const newUrl = formUrlQuery({
                    params: searchParams?.toString() ?? "",
                    key: "q",
                    value: trimmed,
                });
                router.push(newUrl, { scroll: false });
            } else {
                // only remove `q` (and keep `topic` if other parts of app rely on it).
                if (pathname === '/companions') {
                    const newUrl = removeKeysFromUrlQuery({
                        params: searchParams?.toString() ?? "",
                        keysToRemove: ["q"],
                    });
                    router.push(newUrl, { scroll: false });
                }
            }
        }, 500);

        return () => clearTimeout(handler);
    }, [searchQuery, router, searchParams, pathname]);

    return (
        <div className="relative border border-black rounded-lg items-center flex gap-2 px-2 py-1 h-fit">
            <Image src="/icons/search.svg" alt="search" width={15} height={15} />
            <input
                placeholder="Search companions..."
                className="outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
    )
}
export default SearchInput
