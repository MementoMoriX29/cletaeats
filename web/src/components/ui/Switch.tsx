interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
  size?: 'md' | 'lg';
}

export function Switch({ checked, onChange, label, disabled, size = 'md' }: SwitchProps) {
  const track = size === 'lg' ? 'h-8 w-14' : 'h-6 w-11';
  const thumb = size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';
  const shift = size === 'lg' ? 'translate-x-6' : 'translate-x-5';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex shrink-0 items-center rounded-full p-1 transition-colors disabled:opacity-50 ${track} ${checked ? 'bg-brand-600' : 'bg-line-strong'}`}
    >
      <span className={`${thumb} rounded-full bg-white shadow transition-transform ${checked ? shift : 'translate-x-0'}`} />
    </button>
  );
}
