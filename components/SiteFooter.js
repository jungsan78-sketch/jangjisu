export default function SiteFooter({ className = '' }) {
  return (
    <footer className={`px-5 pb-8 pt-12 text-center lg:px-8 ${className}`}>
      <div className="mx-auto max-w-7xl border-t border-white/[0.06] pt-6">
        <p className="text-xs font-semibold tracking-[0.08em] text-white/35 sm:text-sm">
          ©2026 SANE. <span className="ml-1">All rights reserved.</span>
        </p>
      </div>
    </footer>
  );
}
