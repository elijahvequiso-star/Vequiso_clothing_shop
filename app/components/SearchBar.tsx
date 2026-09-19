"use client";

type SearchBarProps = {
  value: string;
  onChange: (nextValue: string) => void;
  placeholder?: string;
  className?: string;
};

export default function SearchBar({
  value,
  onChange,
  placeholder = "Search products...",
  className = "",
}: SearchBarProps) {
  return (
    <div className={`flex items-center border border-black/10 bg-white px-4 py-3 ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mr-3 h-4 w-4 text-black/60">
        <circle cx="11" cy="11" r="6" />
        <path d="M16 16L21 21" strokeLinecap="round" />
      </svg>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-black outline-none placeholder:text-black/40"
      />
    </div>
  );
}
