// Equivalente a: AdminRestaurantsScreen.kt (Jetpack Compose)
// CRUD completo de restaurantes y edición de combos

import { useEffect, useState, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Edit2, ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRestaurants, createRestaurant, updateRestaurant, deleteRestaurant, getCombos, createCombo, updateCombo, deleteCombo,
} from '../../api/restaurants';
import type { Restaurant, Combo } from '../../types';
import { DataTable } from '../../components/Table/DataTable';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { SkeletonRow } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

const col = createColumnHelper<Restaurant>();

const ImagePreview = ({ url }: { url: string }) => {
  if (!url) return null;
  return (
    <div className="sm:col-span-2 flex items-center gap-3">
      <img
        src={url}
        alt="Preview"
        className="w-20 h-14 object-cover rounded-lg border border-border bg-card"
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = ''; e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
      />
      <span className="hidden text-xs text-error">URL inválida o imagen no disponible</span>
    </div>
  );
};

const CATEGORIAS = [
  'Comida típica', 'Chicharronera', 'Comida rápida', 'Pizzería',
  'Mariscos', 'Pollo', 'Sushi', 'Italiana', 'China',
  'Vegetariana', 'Desayunos', 'Postres y helados', 'Sandwichería',
];

// Precios fijos: combo N = ₡(N+3)*1000
const comboPrice = (n: number) => (n + 3) * 1000;

const BLANK_RESTAURANT: Partial<Restaurant> = {
  nombre: '', descripcion: '', direccion: '', telefono: '', cedula_juridica: '', categoria: '', imagen_url: '', activo: true,
};

export const AdminRestaurants = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<Restaurant>>(BLANK_RESTAURANT);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Combos
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loadingCombos, setLoadingCombos] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);
  const [comboDesc, setComboDesc] = useState('');
  const [comboImageUrl, setComboImageUrl] = useState('');
  const [savingCombo, setSavingCombo] = useState(false);

  const [confirmDeleteComboId, setConfirmDeleteComboId] = useState<number | null>(null);
  const [deletingCombo, setDeletingCombo] = useState(false);

  const [showNewComboForm, setShowNewComboForm] = useState(false);
  const [newComboNumero, setNewComboNumero] = useState<number>(1);
  const [newComboDesc, setNewComboDesc] = useState('');
  const [newComboImageUrl, setNewComboImageUrl] = useState('');
  const [savingNewCombo, setSavingNewCombo] = useState(false);

  const [formErrors, setFormErrors] = useState<Partial<Record<string, string>>>({});

  const fetchRestaurants = async () => {
    try {
      const { data } = await getRestaurants();
      setRestaurants(data);
    } catch {
      toast.error('Sin conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRestaurants(); }, []);

  const handleToggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    setLoadingCombos(true);
    try {
      const { data } = await getCombos(id);
      setCombos(data);
    } catch {
      toast.error('Error al cargar combos');
    } finally {
      setLoadingCombos(false);
    }
  };

  const validateForm = (f: Partial<Restaurant>): Partial<Record<string, string>> => {
    const e: Partial<Record<string, string>> = {};
    if (!f.nombre?.trim() || f.nombre.trim().length < 3)
      e.nombre = 'El nombre debe tener al menos 3 caracteres.';
    if (!editId && (!f.cedula_juridica || !/^\d{10,12}$/.test(f.cedula_juridica)))
      e.cedula_juridica = 'La cédula jurídica debe tener entre 10 y 12 dígitos.';
    if (!f.categoria)
      e.categoria = 'Seleccioná una categoría.';
    if (!f.telefono || !/^\d{8}$/.test(f.telefono))
      e.telefono = 'El teléfono debe tener exactamente 8 dígitos.';
    if (!f.direccion || f.direccion.trim().length < 10)
      e.direccion = 'La dirección debe tener al menos 10 caracteres.';
    if (!f.descripcion || f.descripcion.trim().length < 10)
      e.descripcion = 'La descripción debe tener al menos 10 caracteres.';
    if (f.imagen_url && !/^https?:\/\/.+/.test(f.imagen_url))
      e.imagen_url = 'La URL debe empezar con http:// o https://';
    return e;
  };

  const handleSaveRestaurant = async () => {
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    setSaving(true);
    try {
      if (editId) {
        await updateRestaurant(editId, form);
        toast.success('Restaurante actualizado');
      } else {
        await createRestaurant(form);
        toast.success('Restaurante creado');
      }
      setShowForm(false);
      setForm(BLANK_RESTAURANT);
      setEditId(null);
      fetchRestaurants();
    } catch (err: unknown) {
      if ((err as { __cletaHandled?: boolean }).__cletaHandled) return;
      const response = (err as { response?: { status?: number; data?: { message?: string; error?: string } } })?.response;
      const msg = response?.data?.message ?? response?.data?.error ?? '';
      if (response?.status === 409) {
        setFormErrors((fe) => ({ ...fe, cedula_juridica: 'Esta cédula jurídica ya está registrada.' }));
      } else {
        toast.error(msg || 'Error al guardar');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRestaurant = async (id: number) => {
    setDeleting(true);
    try {
      await deleteRestaurant(id);
      toast.success('Restaurante eliminado');
      setConfirmDeleteId(null);
      fetchRestaurants();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al eliminar');
    } finally {
      setDeleting(false);
    }
  };

  const handleEditRestaurant = (r: Restaurant) => {
    setForm({ nombre: r.nombre, descripcion: r.descripcion, direccion: r.direccion, telefono: r.telefono, cedula_juridica: r.cedula_juridica ?? '', categoria: r.categoria, imagen_url: r.imagen_url ?? '', activo: r.activo });
    setEditId(r.id);
    setFormErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateCombo = async () => {
    if (!expandedId) return;
    setSavingNewCombo(true);
    try {
      const { data } = await createCombo(expandedId, { numero: newComboNumero, descripcion: newComboDesc, imagen_url: newComboImageUrl || undefined });
      setCombos(data);
      setShowNewComboForm(false);
      setNewComboDesc('');
      setNewComboImageUrl('');
      toast.success('Combo agregado');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Error al crear combo');
    } finally {
      setSavingNewCombo(false);
    }
  };

  const handleDeleteCombo = async (comboId: number) => {
    if (!expandedId) return;
    setDeletingCombo(true);
    try {
      await deleteCombo(expandedId, comboId);
      setCombos((prev) => prev.filter((c) => c.id !== comboId));
      setConfirmDeleteComboId(null);
      toast.success('Combo eliminado');
    } catch {
      toast.error('Error al eliminar combo');
    } finally {
      setDeletingCombo(false);
    }
  };

  const handleSaveCombo = async () => {
    if (!editingCombo || !expandedId) return;
    setSavingCombo(true);
    try {
      await updateCombo(expandedId, editingCombo.id, { descripcion: comboDesc, imagen_url: comboImageUrl || undefined });
      setCombos((prev) => prev.map((c) => c.id === editingCombo.id ? { ...c, descripcion: comboDesc } : c));
      setEditingCombo(null);
      toast.success('Combo actualizado');
    } catch {
      toast.error('Error al actualizar combo');
    } finally {
      setSavingCombo(false);
    }
  };

  const columns = useMemo(
    () => [
      col.accessor('nombre', { header: 'Nombre' }),
      col.accessor('categoria', { header: 'Categoría' }),
      col.accessor('telefono', { header: 'Teléfono' }),
      col.accessor('activo', {
        header: 'Estado',
        cell: (info) => <Badge label={info.getValue() ? 'Activo' : 'Inactivo'} color={info.getValue() ? 'success' : 'default'} />,
      }),
      col.display({
        id: 'acciones',
        header: 'Acciones',
        cell: ({ row }) => (
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" size="sm" onClick={() => handleEditRestaurant(row.original)}>
              <Edit2 size={14} /> Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleExpand(row.original.id)}
            >
              {expandedId === row.original.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Combos
            </Button>
            {confirmDeleteId === row.original.id ? (
              <div className="flex gap-1 items-center">
                <span className="text-white text-xs">¿Eliminar?</span>
                <Button variant="danger" size="sm" onClick={() => handleDeleteRestaurant(row.original.id)} loading={deleting}>Sí</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>No</Button>
              </div>
            ) : (
              <Button variant="danger" size="sm" onClick={() => setConfirmDeleteId(row.original.id)}>
                <Trash2 size={14} /> Eliminar
              </Button>
            )}
          </div>
        ),
      }),
    ],
    [expandedId, confirmDeleteId, deleting]
  );

  const handleField = (key: keyof Restaurant) => (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (key === 'telefono') {
      value = value.replace(/\D/g, '').slice(0, 8);
    } else if (key === 'cedula_juridica') {
      value = value.replace(/\D/g, '').slice(0, 12);
    }
    const next = { ...form, [key]: value };
    setForm(next);
    if (Object.keys(formErrors).length > 0) setFormErrors(validateForm(next));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-white text-2xl font-bold">Restaurantes</h1>
        <Button onClick={() => { setShowForm(true); setEditId(null); setForm(BLANK_RESTAURANT); setFormErrors({}); }}>
          + Nuevo
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-surface rounded-xl p-6 flex flex-col gap-4">
          <h2 className="text-white font-semibold">{editId ? 'Editar' : 'Nuevo'} restaurante</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre"
              value={form.nombre ?? ''}
              onChange={handleField('nombre')}
              error={formErrors.nombre}
            />
            <Select
              label="Categoría"
              options={CATEGORIAS}
              value={form.categoria ?? ''}
              onChange={(e) => {
                setForm((f) => ({ ...f, categoria: e.target.value }));
                if (formErrors.categoria) setFormErrors((fe) => ({ ...fe, categoria: '' }));
              }}
              error={formErrors.categoria}
            />
            <Input
              label={editId ? 'Cédula jurídica (no editable)' : 'Cédula jurídica (10–12 dígitos)'}
              value={form.cedula_juridica ?? ''}
              onChange={handleField('cedula_juridica')}
              inputMode="numeric"
              error={formErrors.cedula_juridica}
              disabled={!!editId}
              className={editId ? 'opacity-50 cursor-not-allowed' : ''}
            />
            <Input
              label="Teléfono (8 dígitos)"
              value={form.telefono ?? ''}
              onChange={handleField('telefono')}
              inputMode="numeric"
              error={formErrors.telefono}
            />
            <Input
              label="Dirección"
              value={form.direccion ?? ''}
              onChange={handleField('direccion')}
              error={formErrors.direccion}
            />
            <Input
              label="Descripción"
              value={form.descripcion ?? ''}
              onChange={handleField('descripcion')}
              error={formErrors.descripcion}
              className="sm:col-span-2"
            />
            <Input
              label="URL de imagen (opcional)"
              placeholder="https://..."
              value={form.imagen_url ?? ''}
              onChange={handleField('imagen_url')}
              error={formErrors.imagen_url}
              className="sm:col-span-2"
            />
            <ImagePreview url={form.imagen_url ?? ''} />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSaveRestaurant} loading={saving}>{editId ? 'Actualizar' : 'Crear'}</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : restaurants.length === 0 ? (
        <EmptyState title="Sin restaurantes" />
      ) : (
        <>
          <DataTable data={restaurants} columns={columns} />

          {/* Panel de combos */}
          {expandedId && (
            <div className="bg-surface rounded-xl p-6 flex flex-col gap-4 border border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold">
                  Combos de {restaurants.find((r) => r.id === expandedId)?.nombre}
                </h3>
                {combos.length < 9 && (
                  <Button size="sm" onClick={() => { setShowNewComboForm(!showNewComboForm); const used = combos.map((c) => c.numero); const first = [1,2,3,4,5,6,7,8,9].find((n) => !used.includes(n)) ?? 1; setNewComboNumero(first); }}>
                    + Agregar combo
                  </Button>
                )}
              </div>

              {showNewComboForm && (
                <div className="bg-background rounded-lg p-3 flex flex-col gap-2 border border-border">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm text-muted-foreground">Número</label>
                      <select
                        className="bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                        value={newComboNumero}
                        onChange={(e) => setNewComboNumero(Number(e.target.value))}
                      >
                        {[1,2,3,4,5,6,7,8,9]
                          .filter((n) => !combos.some((c) => c.numero === n))
                          .map((n) => (
                            <option key={n} value={n} className="bg-card">
                              Combo {n} — ₡{((n + 3) * 1000).toLocaleString()}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2 flex flex-col gap-1">
                      <label className="text-sm text-muted-foreground">Descripción</label>
                      <input
                        className="bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="Ej: Arroz con pollo, ensalada y refresco"
                        value={newComboDesc}
                        onChange={(e) => setNewComboDesc(e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-3 flex flex-col gap-1">
                      <label className="text-sm text-muted-foreground">URL de imagen (opcional)</label>
                      <input
                        className="bg-card border border-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                        placeholder="https://..."
                        value={newComboImageUrl}
                        onChange={(e) => setNewComboImageUrl(e.target.value)}
                      />
                    </div>
                    {newComboImageUrl && (
                      <div className="sm:col-span-3 flex items-center gap-3">
                        <img
                          src={newComboImageUrl}
                          alt="Preview"
                          className="w-20 h-14 object-cover rounded-lg border border-border bg-card"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                        />
                        <span className="hidden text-xs text-error">URL inválida o imagen no disponible</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateCombo} loading={savingNewCombo}>Guardar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowNewComboForm(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
              {loadingCombos ? (
                <p className="text-muted-foreground text-sm">Cargando combos...</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {combos.map((combo) => (
                    <div key={combo.id} className="bg-background rounded-lg p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-white font-medium text-sm">{combo.nombre}</p>
                          <p className="text-primary text-xs">₡{comboPrice(combo.numero).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setEditingCombo(combo); setComboDesc(combo.descripcion); setComboImageUrl(combo.imagen_url ?? ''); }}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteComboId(combo.id)}
                            className="text-muted-foreground hover:text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {confirmDeleteComboId === combo.id && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-white text-xs">¿Eliminar este combo?</span>
                          <Button variant="danger" size="sm" onClick={() => handleDeleteCombo(combo.id)} loading={deletingCombo}>Sí</Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteComboId(null)}><X size={12} /></Button>
                        </div>
                      )}
                      {editingCombo?.id === combo.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            className="bg-surface border border-border rounded px-2 py-1 text-white text-sm resize-none focus:outline-none focus:border-primary"
                            rows={2}
                            value={comboDesc}
                            onChange={(e) => setComboDesc(e.target.value)}
                          />
                          <input
                            className="bg-surface border border-border rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-primary"
                            placeholder="URL de imagen..."
                            value={comboImageUrl}
                            onChange={(e) => setComboImageUrl(e.target.value)}
                          />
                          {comboImageUrl && (
                            <div className="flex items-center gap-2">
                              <img
                                src={comboImageUrl}
                                alt="Preview"
                                className="w-16 h-12 object-cover rounded border border-border bg-card"
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }}
                              />
                              <span className="hidden text-xs text-error">Imagen no disponible</span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveCombo} loading={savingCombo}>Guardar</Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingCombo(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">{combo.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
