const AuthClient = require('./AuthClientMultiCredentials');

const multiAuth = {};

module.exports = {
    refresh: ({ clientId, urn, token }) => {
        if (!multiAuth[urn]) {
            multiAuth[urn] = new AuthClient(clientId);
        }
        const auth = multiAuth[urn];
        auth.setCredentials({ access_token: token });
        return auth;
    },

    get: urn => multiAuth[urn],

    remove: (urn) => {
        delete multiAuth[urn];
    }
};
