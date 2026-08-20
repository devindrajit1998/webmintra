import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicSettings } from "@/lib/public-api";
import {
  clearSessionUser,
  archiveWebsite,
  createWebsite,
  getDashboard,
  getAuthenticatedUser,
  getWebsites,
  openWebsite,
  routeForRole,
  type AdminDashboard,
  type SessionUser,
  type TenantDashboard as TenantDashboardData,
  type Website,
} from "@/lib/auth-api";
import { AdminDashboard as AdminDashboardView } from "@/components/AdminDashboard";
import { TenantLayout } from "@/components/TenantDashboard";
import { TenantOnboarding } from "@/components/TenantOnboarding";
import { toast } from "sonner";
import { apiFetch, clearCsrfToken } from "@/lib/api-fetch";

export function WorkspacePage({ requiredRole }: { requiredRole: SessionUser["role"] }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | TenantDashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [websites, setWebsites] = useState<Website[]>([]);
  const [websiteError, setWebsiteError] = useState("");
  const [isSavingWebsite, setIsSavingWebsite] = useState(false);

  const { data: settings = {} } = useQuery({
    queryKey: ["publicSettings"],
    queryFn: getPublicSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    async function loadSession() {
      const sessionUser = await getAuthenticatedUser();
      if (!sessionUser) {
        clearSessionUser();
        await navigate({ to: "/sign-in", replace: true });
        return;
      }
      if (sessionUser.role !== requiredRole) {
        await navigate({ to: routeForRole(sessionUser.role), replace: true });
        return;
      }
      setUser(sessionUser);
      try {
        setDashboard(await getDashboard<AdminDashboard | TenantDashboardData>(requiredRole));
      } catch (error) {
        setDashboardError(error instanceof Error ? error.message : "Unable to load dashboard.");
      }
      if (sessionUser.role === "tenant") {
        try {
          const result = await getWebsites();
          setWebsites(result.websites);
        } catch (error) {
          setWebsiteError(error instanceof Error ? error.message : "Unable to load websites.");
        }
      }
    }
    void loadSession();
  }, [navigate, requiredRole]);

  async function signOut() {
    try {
      await apiFetch(
        `${import.meta.env["VITE_API_URL"] ?? "http://localhost:5000/api"}/auth/logout`,
        {
          method: "POST",
        },
      );
    } finally {
      clearCsrfToken();
      clearSessionUser();
      await navigate({ to: "/sign-in", replace: true });
    }
  }

  async function archiveWebsiteRecord(websiteId: string) {
    setWebsiteError("");
    try {
      await archiveWebsite(websiteId);
      setWebsites((current) => current.filter((website) => website.id !== websiteId));
    } catch (error) {
      setWebsiteError(error instanceof Error ? error.message : "Unable to archive website.");
    }
  }

  if (!user) return <div className="min-h-screen bg-background" aria-busy="true" />;

  if (user.role === "admin")
    return (
      <AdminDashboardView
        user={user}
        dashboard={dashboard as AdminDashboard | null}
        error={dashboardError}
        onSignOut={() => void signOut()}
      />
    );

  if (!user.onboardingCompleted) return <TenantOnboarding />;

  return (
    <TenantLayout
      user={user}
      dashboard={dashboard as TenantDashboardData | null}
      websites={websites}
      error={dashboardError}
      websiteError={websiteError}
      onOpenWebsite={async (websiteId) => {
        try {
          await openWebsite(websiteId);
          navigate({ to: "/tenant/builder/$id", params: { id: websiteId } });
        } catch (err: any) {
          toast.error("Failed to open: " + err?.message);
          console.error(err);
        }
      }}
      onArchiveWebsite={(websiteId) => void archiveWebsiteRecord(websiteId)}
      onSignOut={() => void signOut()}
    />
  );
}
