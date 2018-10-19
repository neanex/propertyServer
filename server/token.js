const {
    credentials: {
        HAS_DEFAULTS,
    },
} = require('./config');

module.exports = HAS_DEFAULTS
    ? require('./forge-token-multi-credentials')
    : require('./forge-token');
