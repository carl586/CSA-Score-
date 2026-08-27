export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-line px-4 py-5 hidden md:flex md:flex-col">
      <div className="flex items-center gap-2 px-1 mb-8">
        <div className="w-7 h-7 rounded-md bg-ink text-white flex items-center justify-center text-xs font-semibold">
          R
        </div>
        <div>
          <div className="text-[13px] font-semibold leading-tight">Roll-Off</div>
          <div className="text-[11px] text-muted leading-tight">CSA point tracker</div>
        </div>
      </div>

      <NavGroup label="Overview">
        <NavItem href="/" label="Dashboard" />
      </NavGroup>

      <NavGroup label="Compliance">
        <NavItem href="/violations" label="Violations" />
        <NavItem href="/codes" label="Violation codes" />
      </NavGroup>
    </aside>
  );
}

function NavGroup({ label, children }) {
  return (
    <div className="mb-6">
      <div className="text-[10px] font-semibold tracking-wider text-muted uppercase px-1 mb-2">
        {label}
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({ href, label }) {
  const active =
    typeof window !== "undefined" && window.location.pathname === href;
  return (
    
      href={href}
      className={
        "text-[13px] px-2.5 py-1.5 rounded-md " +
        (active ? "bg-panel font-medium text-ink" : "text-muted hover:bg-panel")
      }
    >
      {label}
    </a>
  );
}
