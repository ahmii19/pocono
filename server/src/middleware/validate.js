function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = schema.parse(dataToValidate);
      req[source] = parsed;
      next();
    } catch (err) {
      if (err.errors) {
        const formattedErrors = err.errors.map(e => ({ field: e.path.join('.'), message: e.message }));
        return res.status(400).json({ success: false, error: 'Validation failed', details: formattedErrors });
      }
      return res.status(400).json({ success: false, error: 'Invalid request payload' });
    }
  };
}

module.exports = { validate };
