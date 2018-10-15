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
'use strict' ;

var defaults = require('./defaults');

var config ={

	credentials: {
		// Replace placeholder below by the Consumer Key and Consumer Secret you got from
		// http://developer.autodesk.com/ for the production server
		client_id: process.env.FORGE_CLIENT_ID || defaults.FORGE_CLIENT_ID,
		client_secret: process.env.FORGE_CLIENT_SECRET || defaults.FORGE_CLIENT_SECRET,
		grant_type: 'client_credentials',
		scope: ['data:read', 'data:search', 'bucket:read', 'viewables:read' ]
	},
	callback: process.env.FORGE_CALLBACK,
	apiEndpoint: 'developer.api.autodesk.com'

} ;

module.exports =config ;