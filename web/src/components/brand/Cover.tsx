// Portada de restaurante. Si el restaurante subió una foto se usa; si no, una portada de su categoría:
// color plano con el ícono grande y recortado, y un "logo" redondo con sus iniciales.
import { useState } from 'react';
import { initials } from '../../lib/format';
import { coverStyle } from './categoryStyle';

interface CoverProps {
  name: string;
  category: string;
  imageUrl?: string | null;
  className?: string;
  showMonogram?: boolean;
}

export function Cover({ name, category, imageUrl, className = '', showMonogram = true }: CoverProps) {
  const [broken, setBroken] = useState(false);
  const { bg, fg, Icon } = coverStyle(category);

  if (imageUrl && !broken) {
    return (
      <div className={`overflow-hidden bg-line ${className}`}>
        <img src={imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ backgroundColor: bg }} aria-hidden="true">
      <Icon
        className="absolute -bottom-[18%] -right-[6%] h-[120%] w-auto -rotate-12"
        style={{ color: fg, opacity: 0.32 }}
        strokeWidth={1.1}
      />
      {showMonogram && (
        <span
          className="absolute bottom-3 left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white font-wide text-sm font-extrabold shadow-sm"
          style={{ color: fg }}
        >
          {initials(name)}
        </span>
      )}
    </div>
  );
}
