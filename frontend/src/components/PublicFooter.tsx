import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";

export function PublicFooter() {
    const { data: settings = {} } = useQuery({
        queryKey: ["publicSettings"],
        queryFn: getPublicSettings,
        staleTime: 1000 * 60 * 5,
    });

    const siteName = String(settings["site.name"] || "webmintra");

    return (
        <footer className="border-t border-[#e2e8f0] bg-white py-8 text-center text-xs text-[#64748b]">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
                <p>© 2026 {siteName}. All rights reserved.</p>
                <nav aria-label="Footer navigation" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    <Link to="/privacy-policy" className="hover:text-[#059669] hover:underline">Privacy</Link>
                    <Link to="/terms-and-conditions" className="hover:text-[#059669] hover:underline">Terms</Link>
                    <Link to="/refund-cancellation-policy" className="hover:text-[#059669] hover:underline">Refund Policy</Link>
                    <span className="flex items-center gap-1 font-semibold text-[#0f172a]">
                        <span>100% Data Stored in India</span> <span>🇮🇳</span>
                    </span>
                </nav>
            </div>
        </footer>
    );
}
