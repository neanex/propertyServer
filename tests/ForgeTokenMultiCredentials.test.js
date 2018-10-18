const assert = require('assert');

const forgeToken = require('../server/ForgeTokenMultiCredentials');

const CLIENT_ID = 'client-1';

const ACCESS_TOKEN = 'abcd';

const URN = 'urn:123';

const oAuth2Client = forgeToken.refresh({
    urn: URN,
    clientId: CLIENT_ID,
    token: ACCESS_TOKEN,
});

assert.equal(
    oAuth2Client,
    forgeToken.get(URN),
);

oAuth2Client
    .authenticate()
    .then((response) => {
        assert.ok(response);
        assert.notEqual(
            response.expires_at,
            null,
        );
    });
