// % y _ son comodines en LIKE: se escapan para buscarlos como texto.
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

module.exports = { escapeLike };
