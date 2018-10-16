const assert = require('assert');

const forgeToken = require('../server/forge-token-multi-credentials');

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

assert.equal(
    typeof oAuth2Client.setCredentials,
    'function',
);

oAuth2Client.setCredentials({
    access_token: 'abcd',
});
assert.deepEqual(
    oAuth2Client.getCredentials(),
    { access_token: 'abcd' },
);

const futureTime = new Date(Date.now() + 300 * 1000);
oAuth2Client.setCredentials({
    access_token: 'abcd',
    expires_at: futureTime,
});
assert.equal(
    oAuth2Client.isAuthorized(),
    true,
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
