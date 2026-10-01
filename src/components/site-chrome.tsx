export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="text-[15px] font-bold tracking-[0.18em] text-foreground">DAYTOZN</p>
          <p className="mt-1 text-sm text-muted">AI CV Builder</p>
        </div>
        <p className="text-sm text-muted">© {new Date().getFullYear()} DAYTOZN. All rights reserved.</p>
      </div>
    </footer>
  );
}
