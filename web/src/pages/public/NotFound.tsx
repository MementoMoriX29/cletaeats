import { ButtonLink } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';

export default function NotFound() {
  return (
    <EmptyState title="Esta página no existe" className="py-24" action={<ButtonLink to="/">Ir al inicio</ButtonLink>}>
      Puede que el enlace esté mal escrito o que la página ya no esté.
    </EmptyState>
  );
}
