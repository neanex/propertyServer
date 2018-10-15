const SCOPE = [
    'data:write',
    'data:read',
    'bucket:read',
    'bucket:create',
    'bucket:delete'
].join(' ');

module.exports = (function() {
    const OAuth2 = require('../node_modules/forge-apis/src/auth/OAuth2');

    function OAuth2MultiCredentials(clientId) {
        this.authentication = {
            tokenUrl: '/authentication/v1/authenticate',
            scopes: {
                'data:read': 'The application will be able to read the end user’s data within the Autodesk ecosystem.',
                'data:write': 'The application will be able to create, update, and delete data on behalf of the end user within the Autodesk ecosystem.',
                'data:create': 'The application will be able to create data on behalf of the end user within the Autodesk ecosystem.',
                'data:search': 'The application will be able to search the end user’s data within the Autodesk ecosystem.',
                'bucket:create': 'The application will be able to create an OSS bucket it will own.',
                'bucket:read': 'The application will be able to read the metadata and list contents for OSS buckets that it has access to.',
                'bucket:update': 'The application will be able to set permissions and entitlements for OSS buckets that it has permission to modify.',
                'bucket:delete': 'The application will be able to delete a bucket that it has permission to delete.',
                'code:all': 'The application will be able to author and execute code on behalf of the end user (e.g., scripts processed by the Design Automation API).',
                'account:read': 'For Product APIs, the application will be able to read the account data the end user has entitlements to.',
                'account:write': 'For Product APIs, the application will be able to update the account data the end user has entitlements to.',
                'user-profile:read': 'The application will be able to read the end user’s profile data.',
                'viewables:read': 'The application will have read access to viewable resources such as thumbnails. This scope is a subset of data:read.'
            }
        };

        this.authName = 'oauth2_application';

        OAuth2.call(this, clientId, null, SCOPE, false);
    };

    OAuth2MultiCredentials.prototype = Object.create(OAuth2.prototype);

    OAuth2MultiCredentials.prototype.constructor = OAuth2MultiCredentials;

    Object.assign(OAuth2MultiCredentials.prototype, {
        setCredentials: (credentials) => {
            this.credentials = credentials;
        },

        getCredentials: () => this.credentials,

        isAuthorized: () => !!this.credentials,

        authenticate: () => new Promise((resolve) => {
            resolve(this.getCredentials());
        }),
    });

    return OAuth2MultiCredentials;
}());
