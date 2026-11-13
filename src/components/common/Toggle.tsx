interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}

// Inline styles (not Tailwind arbitrary values) — same approach as the Settings toggle,
// which proved unreliable with generated classes.
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative rounded-full cursor-pointer flex-shrink-0 disabled:opacity-50"
      style={{
        width: 56,
        height: 28,
        backgroundColor: checked ? '#3fd6f5' : '#33415c',
        transition: 'background-color 300ms ease',
      }}
    >
      <span
        className="absolute rounded-full bg-white"
        style={{
          width: 22,
          height: 22,
          top: 3,
          left: checked ? 31 : 3,
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
          transition: 'left 300ms ease',
        }}
      />
    </button>
  );
}
