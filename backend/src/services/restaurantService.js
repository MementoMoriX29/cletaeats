const restaurantRepo = require('../repositories/restaurantRepository');
const Restaurant     = require('../models/Restaurant');

const list = () => restaurantRepo.getAll();

const getById = async (id) => {
  const r = await restaurantRepo.getById(id);
  if (!r) throw { status: 404, message: 'Restaurante no encontrado' };
  return r;
};

const getCombos = async (restaurantId) => {
  await getById(restaurantId);
  return restaurantRepo.getCombos(restaurantId);
};

const create = async (data) => {
  const model = new Restaurant(data);
  const errors = model.validate();
  if (errors.length) throw { status: 400, message: errors.join(', ') };
  if (await restaurantRepo.getByTaxId(data.tax_id))
    throw { status: 409, message: 'tax_id ya registrado' };
  const id = await restaurantRepo.create(data);
  return restaurantRepo.getById(id);
};

const update = async (id, data) => {
  await getById(id);
  await restaurantRepo.update(id, data);
  return restaurantRepo.getById(id);
};

const remove = async (id) => {
  await getById(id);
  await restaurantRepo.remove(id);
};

const createCombo = async (restaurantId, data) => {
  await getById(restaurantId);
  const numero = data.numero ?? data.combo_number;
  if (!numero || numero < 1 || numero > 9)
    throw { status: 400, message: 'El número de combo debe ser entre 1 y 9' };
  const existing = await restaurantRepo.getComboByNumber(restaurantId, numero);
  if (existing) throw { status: 409, message: `El combo ${numero} ya existe para este restaurante` };
  const price = (numero + 3) * 1000;
  await restaurantRepo.createCombo(restaurantId, {
    combo_number: numero,
    description:  data.descripcion ?? data.description ?? '',
    price,
    image_url:    data.imagen_url ?? data.image_url ?? null,
  });
  return restaurantRepo.getCombos(restaurantId);
};

const updateComboById = async (restaurantId, comboId, data) => {
  await getById(restaurantId);
  const combo = await restaurantRepo.getComboById(comboId);
  if (!combo) throw { status: 404, message: 'Combo no encontrado' };
  await restaurantRepo.updateCombo(comboId, {
    description: data.descripcion ?? data.description ?? combo.description,
    image_url:   data.imagen_url  ?? data.image_url  ?? combo.image_url ?? null,
  });
  return restaurantRepo.getCombos(restaurantId);
};

const removeCombo = async (restaurantId, comboId) => {
  await getById(restaurantId);
  const combo = await restaurantRepo.getComboById(comboId);
  if (!combo) throw { status: 404, message: 'Combo no encontrado' };
  await restaurantRepo.removeCombo(comboId);
};

module.exports = { list, getById, getCombos, create, update, remove, createCombo, updateComboById, removeCombo };
