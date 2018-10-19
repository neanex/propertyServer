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

/* eslint no-console: 0 */

// To avoid the EXDEV rename error, see http://stackoverflow.com/q/21071303/76173
process.env.TMPDIR = 'tmp';
// process.env ['NODE_TLS_REJECT_UNAUTHORIZED'] ='0' ;
// Ignore 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' authorization error

const app = require('./server/server');
const {
    credentials: {
        client_id: apiKey,
        HAS_DEFAULTS,
    },
    port,
} = require('./server/config');

const server = app.listen(port, () => {
    if (!HAS_DEFAULTS) {
        console.log(`API key ${apiKey}`);
    }
    console.log(`Server listening on port ${port}`);
});

server.on('error', ({ errno }) => {
    if (errno === 'EACCES') {
        console.log(`Port ${port} already in use.\nExiting...`);
        process.exit(1);
    }
});
