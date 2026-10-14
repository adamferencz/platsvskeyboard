/** Odznak klávesy, např. <Kbd>Enter</Kbd>. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-2 rounded border border-white/25 bg-black/30 px-1.5 py-0.5 font-mono text-[11px] font-normal leading-none text-white/80">
      {children}
    </kbd>
  );
}
