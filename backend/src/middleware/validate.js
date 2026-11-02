// Valida y normaliza req.body o req.query con un esquema zod.
// El resultado queda en req.valid.body / req.valid.query.
const { badRequest } = require('../utils/errors');

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const fields = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] ??= issue.message;
    }
    return next(badRequest(result.error.issues[0].message, { fields }));
  }
  req.valid = { ...req.valid, [source]: result.data };
  next();
};

module.exports = { validate };
