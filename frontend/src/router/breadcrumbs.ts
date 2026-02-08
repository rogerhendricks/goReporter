export interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

export interface BreadcrumbConfig {
  /**
   * Static breadcrumb list for a route path.
   * Use for non-dynamic pages (no IDs or data lookups).
   */
  items: BreadcrumbItem[];
}

/**
 * Default breadcrumb mappings for static routes.
 * Dynamic routes should be set in their page components via the breadcrumb hook
 * once data (like names/titles) is available.
 */
export const breadcrumbMap: Record<string, BreadcrumbConfig> = {
  "/": {
    items: [{ label: "Home", current: true }],
  },
  "/admin": {
    items: [
      { label: "Home", href: "/" },
      { label: "Admin Dashboard", current: true },
    ],
  },
  "/doctor": {
    items: [
      { label: "Home", href: "/" },
      { label: "Doctor Dashboard", current: true },
    ],
  },
  "/viewer-dashboard": {
    items: [
      { label: "Home", href: "/" },
      { label: "Viewer Dashboard", current: true },
    ],
  },
  "/appointments": {
    items: [
      { label: "Home", href: "/" },
      { label: "Appointments", current: true },
    ],
  },
  "/patients": {
    items: [
      { label: "Home", href: "/" },
      { label: "Patients", current: true },
    ],
  },
  "/patients/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "New Patient", current: true },
    ],
  },
  "/reports/builder": {
    items: [
      { label: "Home", href: "/" },
      { label: "Reports", href: "/patients" },
      { label: "Report Builder", current: true },
    ],
  },
  "/reports/saved": {
    items: [
      { label: "Home", href: "/" },
      { label: "Reports", href: "/patients" },
      { label: "Saved Reports", current: true },
    ],
  },
  "/search/patients": {
    items: [
      { label: "Home", href: "/" },
      { label: "Patient Search", current: true },
    ],
  },
  "/doctors": {
    items: [
      { label: "Home", href: "/" },
      { label: "Doctors", current: true },
    ],
  },
  "/doctors/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Doctors", href: "/doctors" },
      { label: "New Doctor", current: true },
    ],
  },
  "/devices": {
    items: [
      { label: "Home", href: "/" },
      { label: "Devices", current: true },
    ],
  },
  "/devices/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Devices", href: "/devices" },
      { label: "New Device", current: true },
    ],
  },
  "/leads": {
    items: [
      { label: "Home", href: "/" },
      { label: "Leads", current: true },
    ],
  },
  "/leads/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Leads", href: "/leads" },
      { label: "New Lead", current: true },
    ],
  },
  "/tags": {
    items: [
      { label: "Home", href: "/" },
      { label: "Tags", current: true },
    ],
  },
  "/admin/tags": {
    items: [
      { label: "Home", href: "/" },
      { label: "Admin", href: "/admin" },
      { label: "Tags", current: true },
    ],
  },
  "/tasks": {
    items: [
      { label: "Home", href: "/" },
      { label: "Tasks", current: true },
    ],
  },
  "/tasks/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Tasks", href: "/tasks" },
      { label: "New Task", current: true },
    ],
  },
  "/task-templates": {
    items: [
      { label: "Home", href: "/" },
      { label: "Task Templates", current: true },
    ],
  },
  "/webhooks": {
    items: [
      { label: "Home", href: "/" },
      { label: "Webhooks", current: true },
    ],
  },
  "/webhooks/new": {
    items: [
      { label: "Home", href: "/" },
      { label: "Webhooks", href: "/webhooks" },
      { label: "New Webhook", current: true },
    ],
  },
  "/productivity": {
    items: [
      { label: "Home", href: "/" },
      { label: "Productivity Reports", current: true },
    ],
  },
  "/knowledge-base": {
    items: [
      { label: "Home", href: "/" },
      { label: "Knowledge Base", current: true },
    ],
  },
};

interface DynamicBreadcrumbRule {
  pattern: RegExp;
  getItems: (pathname: string) => BreadcrumbItem[];
}

const dynamicBreadcrumbs: DynamicBreadcrumbRule[] = [
  {
    pattern: /^\/patients\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "Patient Details", current: true },
    ],
  },
  {
    pattern: /^\/patients\/[^/]+\/edit$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "Edit Patient", current: true },
    ],
  },
  {
    pattern: /^\/patients\/[^/]+\/reports$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "Reports", current: true },
    ],
  },
  {
    pattern: /^\/patients\/[^/]+\/reports\/new$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "Reports", href: "/patients" },
      { label: "New Report", current: true },
    ],
  },
  {
    pattern: /^\/reports\/[^/]+\/edit$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Patients", href: "/patients" },
      { label: "Edit Report", current: true },
    ],
  },
  {
    pattern: /^\/patients\/[^/]+\/tasks\/new$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Tasks", href: "/tasks" },
      { label: "New Task", current: true },
    ],
  },
  {
    pattern: /^\/tasks\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Tasks", href: "/tasks" },
      { label: "Task Details", current: true },
    ],
  },
  {
    pattern: /^\/devices\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Devices", href: "/devices" },
      { label: "Device Details", current: true },
    ],
  },
  {
    pattern: /^\/devices\/[^/]+\/edit$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Devices", href: "/devices" },
      { label: "Edit Device", current: true },
    ],
  },
  {
    pattern: /^\/doctors\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Doctors", href: "/doctors" },
      { label: "Doctor Details", current: true },
    ],
  },
  {
    pattern: /^\/doctors\/[^/]+\/edit$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Doctors", href: "/doctors" },
      { label: "Edit Doctor", current: true },
    ],
  },
  {
    pattern: /^\/leads\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Leads", href: "/leads" },
      { label: "Lead Details", current: true },
    ],
  },
  {
    pattern: /^\/leads\/[^/]+\/edit$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Leads", href: "/leads" },
      { label: "Edit Lead", current: true },
    ],
  },
  {
    pattern: /^\/webhooks\/[^/]+$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Webhooks", href: "/webhooks" },
      { label: "Edit Webhook", current: true },
    ],
  },
  {
    pattern: /^\/knowledge-base(\/.*)?$/,
    getItems: () => [
      { label: "Home", href: "/" },
      { label: "Knowledge Base", current: true },
    ],
  },
];

export function resolveBreadcrumbsForPath(pathname: string): BreadcrumbItem[] {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const direct = breadcrumbMap[normalized];
  if (direct) {
    return direct.items;
  }

  for (const rule of dynamicBreadcrumbs) {
    if (rule.pattern.test(normalized)) {
      return rule.getItems(normalized);
    }
  }

  const basePath = normalized.split("?")[0] || normalized;
  const base = breadcrumbMap[basePath];
  return base ? base.items : [];
}
