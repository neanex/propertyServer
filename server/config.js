//
// Copyright (c) Autodesk, Inc. All rights reserved
//
// Permission to use, copy, modify, and distribute this software in
// object code form for any purpose and without fee is hereby granted,
// provided that the above copyright notice appears in all copies and
// that both that copyright notice and the limited warranty and
// restricted rights notice below appear in all supporting
// documentation.
//
// AUTODESK PROVIDES THIS PROGRAM "AS IS" AND WITH ALL FAULTS.
// AUTODESK SPECIFICALLY DISCLAIMS ANY IMPLIED WARRANTY OF
// MERCHANTABILITY OR FITNESS FOR A PARTICULAR USE.  AUTODESK, INC.
// DOES NOT WARRANT THAT THE OPERATION OF THE PROGRAM WILL BE
// UNINTERRUPTED OR ERROR FREE.
//
// Forge Property Server
// by Cyrille Fauvel - Autodesk Developer Network (ADN)
//

/* eslint camelcase: 0 */

const { FORGE_CLIENT_ID, FORGE_CLIENT_SECRET, PORT } = require('./defaults');

const { env } = process;

const client_id = env.FORGE_CLIENT_ID || FORGE_CLIENT_ID;
const client_secret = env.FORGE_CLIENT_SECRET || FORGE_CLIENT_SECRET;
const callback = env.FORGE_CALLBACK;
const port = env.PORT || PORT;

const HAS_DEFAULTS = client_id === FORGE_CLIENT_ID || client_secret === FORGE_CLIENT_SECRET;
const HAS_CALLBACK = callback !== undefined;

const config = {
    credentials: {
        client_id,
        client_secret,
        HAS_DEFAULTS,
        grant_type: 'client_credentials',
        scope: [
            'data:read',
            'data:search',
            'bucket:read',
            'viewables:read',
        ],
    },
    callback,
    HAS_CALLBACK,
    apiEndpoint: 'developer.api.autodesk.com',
    port,
};

module.exports = config;
