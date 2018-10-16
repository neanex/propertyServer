const OAuth2 = require('../node_modules/forge-apis/src/auth/OAuth2');

class OAuth2MultiCredentials extends OAuth2 {
    constructor(clientId) {
        const scope = [
            'data:write',
            'data:read',
            'bucket:read',
            'bucket:create',
            'bucket:delete'
        ];
        super(clientId, null, scope, false);
        Object.assign(this, {
            setCredentials: this.setCredentials.bind(this),
            getCredentials: this.getCredentials.bind(this),
            isAuthorized: this.isAuthorized.bind(this),
            authenticate: this.authenticate.bind(this),
        });
    }

    get authentication() {
        return {
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
    }

    setCredentials(credentials) {
        this.credentials = credentials;
    }

    getCredentials() {
        return this.credentials;
    }

    isAuthorized() {
        return Boolean(this.credentials);
    }

    authenticate() {
        return Promise.resolve(this.getCredentials());
    }
}

module.exports = OAuth2MultiCredentials;
