import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { rateOrder } from '../../api/orders';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmModal } from '../../components/ui/ConfirmModal';

interface StarPickerProps {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}

const StarPicker = ({ value, onChange, disabled }: StarPickerProps) => {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 transition-transform hover:scale-110 disabled:cursor-not-allowed"
        >
          <Star
            size={32}
            fill={star <= active ? '#EAB308' : 'transparent'}
            stroke={star <= active ? '#EAB308' : '#4B5563'}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
};

const LABELS: Record<number, string> = {
  1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente',
};

export const RatingScreen = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [values, setValues] = useState({ amabilidad: 0, tiempo: 0, presentacion: 0 });
  const [includeComplaint, setIncludeComplaint] = useState(false);
  const [complaint, setComplaint] = useState('');
  const [errors, setErrors] = useState<{ complaint?: string; stars?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const average = useMemo(() => {
    const filled = Object.values(values).filter((v) => v > 0);
    if (!filled.length) return 0;
    return filled.reduce((a, b) => a + b, 0) / filled.length;
  }, [values]);

  const ratingFields = [
    { key: 'amabilidad' as const, label: 'Amabilidad', description: '¿Qué tan amable fue el repartidor?' },
    { key: 'tiempo' as const, label: 'Tiempo de entrega', description: '¿Llegó rápido tu pedido?' },
    { key: 'presentacion' as const, label: 'Presentación', description: '¿El pedido llegó en buen estado?' },
  ];

  useEffect(() => {
    if (!includeComplaint) { setComplaint(''); setErrors((e) => ({ ...e, complaint: undefined })); }
  }, [includeComplaint]);

  const validate = () => {
    const next: typeof errors = {};
    const allFilled = Object.values(values).every((v) => v > 0);
    if (!allFilled) next.stars = 'Por favor calificá todos los criterios.';
    if (includeComplaint && complaint.trim().length < 10)
      next.complaint = 'La queja debe tener al menos 10 caracteres.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!id || Number.isNaN(orderId) || sent) return;
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      await rateOrder(orderId, {
        amabilidad: values.amabilidad,
        tiempo: values.tiempo,
        presentacion: values.presentacion,
        description: includeComplaint ? complaint.trim() : 'Calificación del cliente',
      });
      localStorage.setItem(`rated_${orderId}`, '1');
      setSent(true);
      toast.success('Calificación enviada');
    } catch (err: unknown) {
      if ((err as { __cletaHandled?: boolean }).__cletaHandled) return;
      const body = (err as { response?: { data?: { error?: string; message?: string } } })?.response?.data;
      toast.error(body?.message ?? body?.error ?? 'No se pudo enviar la calificación');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 max-w-xl mx-auto text-center">
        <div className="bg-success/10 rounded-full p-6">
          <Star size={40} fill="#22C55E" stroke="#22C55E" />
        </div>
        <h1 className="text-white text-2xl font-bold">¡Gracias por tu calificación!</h1>
        <p className="text-muted-foreground">Tu opinión ayuda a mejorar el servicio.</p>
        <Button onClick={() => navigate('/client/home')}>Volver al inicio</Button>
      </div>
    );
  }

  return (
    <>
      <ConfirmModal
        open={showConfirm}
        title="Enviar calificación"
        message={
          <>
            Vas a enviar una calificación promedio de{' '}
            <span className="text-white font-semibold">{average.toFixed(1)}/5</span> para el pedido #{id}.
          </>
        }
        variant="info"
        confirmLabel="Enviar"
        cancelLabel="Revisar"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="flex flex-col gap-6 max-w-xl mx-auto">
        <div>
          <h1 className="text-white text-2xl font-bold">Calificar pedido #{id}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Contanos cómo fue tu experiencia con el repartidor
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="flex flex-col gap-6">
            {ratingFields.map(({ key, label, description }) => (
              <div key={key} className="flex flex-col gap-2">
                <div>
                  <p className="text-white font-semibold text-sm">{label}</p>
                  <p className="text-muted-foreground text-xs">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StarPicker
                    value={values[key]}
                    onChange={(v) => {
                      setValues((cur) => ({ ...cur, [key]: v }));
                      setErrors((e) => ({ ...e, stars: undefined }));
                    }}
                    disabled={sent}
                  />
                  {values[key] > 0 && (
                    <span className="text-muted-foreground text-xs">{LABELS[values[key]]}</span>
                  )}
                </div>
              </div>
            ))}

            {errors.stars && <p className="text-error text-xs -mt-2">{errors.stars}</p>}

            {/* Promedio visual */}
            {average > 0 && (
              <div className="flex items-center gap-3 border-t border-border pt-4">
                <p className="text-muted-foreground text-sm">Promedio</p>
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map((s) => (
                    <Star
                      key={s}
                      size={18}
                      fill={s <= Math.round(average) ? '#EAB308' : 'transparent'}
                      stroke={s <= Math.round(average) ? '#EAB308' : '#4B5563'}
                      strokeWidth={1.5}
                    />
                  ))}
                </div>
                <span className="text-white font-bold">{average.toFixed(1)}</span>
              </div>
            )}

            {/* Queja opcional */}
            <label className="flex items-center gap-2 text-sm text-white cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeComplaint}
                onChange={(e) => setIncludeComplaint(e.target.checked)}
                disabled={sent}
                className="accent-primary"
              />
              Agregar una queja
            </label>

            {includeComplaint && (
              <div className="flex flex-col gap-1">
                <textarea
                  value={complaint}
                  onChange={(e) => setComplaint(e.target.value)}
                  rows={3}
                  className="bg-background border border-border rounded-lg px-3 py-2 text-white placeholder-muted-foreground focus:outline-none focus:border-primary resize-none text-sm"
                  placeholder="Describe brevemente lo ocurrido..."
                  disabled={sent}
                />
                {errors.complaint && <span className="text-xs text-error">{errors.complaint}</span>}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="button" onClick={() => navigate(-1)} variant="secondary" disabled={submitting}>
                Volver
              </Button>
              <Button type="submit" loading={submitting}>
                Enviar calificación
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </>
  );
};
