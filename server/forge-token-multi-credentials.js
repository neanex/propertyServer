const AuthClient = require('./AuthClientMultiCredentials');

const CLIENTS = Symbol('Authentication Clients');
const ADD = Symbol('Add Authentication Client');

const ForgeToken = {
    [CLIENTS]: new Map(),

    [ADD]: (urn, clientId) => {
        ForgeToken[CLIENTS]
            .set(urn, new AuthClient(clientId));
    },

    refresh: ({ clientId, urn, token }) => {
        if (!ForgeToken[CLIENTS].has(urn)) {
            ForgeToken[ADD](urn, clientId);
        }
        return ForgeToken
            .get(urn)
            .setCredentials({ access_token: token });
    },

    get: urn => ForgeToken[CLIENTS].get(urn),

    delete: urn => ForgeToken[CLIENTS].delete(urn),
};

module.exports = ForgeToken;
