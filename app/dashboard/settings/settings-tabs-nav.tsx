"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const VALID_TABS = ["organization", "profile", "subscription", "ops"] as const;
type SettingsTab = (typeof VALID_TABS)[number];

export function SettingsTabsNav({ currentTab }: { currentTab: SettingsTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const incomingTab = searchParams.get("tab");
    if (!incomingTab) {
      const savedTab = localStorage.getItem("luxops_settings_tab");
      if (savedTab && VALID_TABS.includes(savedTab as SettingsTab)) {
        router.replace(`${pathname}?tab=${savedTab}`);
      }
      return;
    }
    if (VALID_TABS.includes(incomingTab as SettingsTab)) {
      localStorage.setItem("luxops_settings_tab", incomingTab);
    }
  }, [pathname, router, searchParams]);

  function goToTab(tab: SettingsTab) {
    localStorage.setItem("luxops_settings_tab", tab);
    router.push(`${pathname}?tab=${tab}`);
  }

  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: "organization", label: "Organización" },
    { id: "profile", label: "Perfil" },
    { id: "subscription", label: "Suscripción" },
    { id: "ops", label: "Ops & Sistema" },
  ];

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => goToTab(tab.id)}
          className={`rounded-lg px-3 py-2 text-sm ${
            currentTab === tab.id
              ? "bg-yellow-400 font-bold text-yellow-950"
              : "border border-slate-700 bg-slate-900 text-slate-200"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
