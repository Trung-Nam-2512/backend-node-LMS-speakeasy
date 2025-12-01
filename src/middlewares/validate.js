const validate = (schema) => (req, res, next) => {
    try {
        // Handle different schema formats
        if (typeof schema === 'function') {
            // Old format - direct Joi schema
            const { error } = schema.validate(req.body, {
                abortEarly: false,
                allowUnknown: true,
                stripUnknown: true
            });

            if (error) {
                const errors = error.details.map(err => ({
                    field: err.path[0],
                    message: err.message
                }));
                return res.status(422).json({
                    success: false,
                    errors
                });
            }
        } else if (typeof schema === 'object' && schema !== null) {
            // New format - object with body, params, query
            const validationErrors = [];

            // Validate request body
            if (schema.body) {
                const { error } = schema.body.validate(req.body, {
                    abortEarly: false,
                    allowUnknown: true,
                    stripUnknown: true
                });

                if (error) {
                    validationErrors.push(...error.details.map(err => ({
                        field: `body.${err.path.join('.')}`,
                        message: err.message
                    })));
                }
            }

            // Validate request params
            if (schema.params) {
                const { error } = schema.params.validate(req.params, {
                    abortEarly: false,
                    allowUnknown: false,
                    stripUnknown: true
                });

                if (error) {
                    validationErrors.push(...error.details.map(err => ({
                        field: `params.${err.path.join('.')}`,
                        message: err.message
                    })));
                }
            }

            // Validate request query
            if (schema.query) {
                const { error, value } = schema.query.validate(req.query, {
                    abortEarly: false,
                    allowUnknown: true,
                    stripUnknown: true
                });

                if (error) {
                    validationErrors.push(...error.details.map(err => ({
                        field: `query.${err.path.join('.')}`,
                        message: err.message
                    })));
                } else {
                    // Apply validated and transformed query values
                    req.query = value;
                }
            }

            if (validationErrors.length > 0) {
                return res.status(422).json({
                    success: false,
                    error: 'Dữ liệu không hợp lệ',
                    code: 'VALIDATION_ERROR',
                    errors: validationErrors
                });
            }
        }

        next();
    } catch (err) {
        console.error('Validation middleware error:', err);
        return res.status(500).json({
            success: false,
            error: 'Lỗi xác thực dữ liệu',
            code: 'VALIDATION_MIDDLEWARE_ERROR'
        });
    }
};

module.exports = validate;