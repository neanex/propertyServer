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

/* eslint class-methods-use-this: 0 */
/* eslint lines-between-class-members: 0 */
/* eslint array-callback-return: 0 */
/* eslint consistent-return: 0 */
/* eslint no-underscore-dangle: 0 */
/* eslint no-continue: 0 */
/* eslint no-plusplus: 0 */
/* eslint no-prototype-builtins: 0 */
/* eslint no-param-reassign: 0 */
/* eslint no-console: 0 */
/* eslint no-bitwise: 0 */
/* eslint no-unused-vars: 0 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');
const mkdirp = require('mkdirp');
const moment = require('moment');
const {
    AuthClientTwoLegged,
    DerivativesApi,
} = require('forge-apis');
const config = require('./config');
const utils = require('./utils');

const forgeToken = require('./token');

const getUrn = ({ params: { urn } }) => utils._safeBase64encode(urn);

const getToken = (urn, token) => token || (
    config.credentials.HAS_DEFAULTS
        ? forgeToken.get(urn)
        : forgeToken
);

const router = express.Router();

const propertiesDict = {};

setInterval(
    () => {
        Object.keys(propertiesDict).forEach((key) => {
            if (!propertiesDict.hasOwnProperty(key) || !propertiesDict[key].hasOwnProperty('tm')) {
                return;
            }
            if (propertiesDict[key].tm.isBefore(moment())) {
                delete propertiesDict[key];
            }
        });
    },
    10000, // 10 seconds
);

class JsonProperties {
    constructor(urn) {
        this.urn = urn;
        this.offs = null;
        this.avs = null;
        this.vals = null;
        this.attrs = null;
        this.ids = null;
    }

    static get dbs() {
        return (['objects_offs', 'objects_avs', 'objects_vals', 'objects_attrs', 'objects_ids']);
    }

    static get iNAME() { return (0); }

    static get iCATEGORY() { return (1); }

    static get iTYPE() { return (2); }
    // Type (1 = Boolean, 2 = Color, 3 = Numeric, 11 = ObjectReference, 20 = String)
    static get iUNIT() { return (3); }

    // The PropertyDB use GNU Units to specify units of properties.
    // For compound units, like for density,
    // which don’t have an atomic name you can for expressions like kg/m^3
    static get DESCRIPTION() { return (4); }

    static get iDISPLAYNAME() { return (5); }

    static get iFLAGS() { return (6); }

    static get iDISPLAYPRECISION() { return (7); }

    static get tBoolean() { return (1); }

    static get tColor() { return (2); }

    static get tNumeric() { return (3); }

    static get tObjectReference() { return (11); }

    static get tString() { return (20); }

    static get tString2() { return (21); }

    get idMax() {
        return (this.offs.length - 1);
    }

    load(dbPath) {
        let self = this;
        return (new Promise(((fulfill, reject) => {
            if (propertiesDict.hasOwnProperty(dbPath)) {
                self = propertiesDict[self.urn];
                propertiesDict[self.urn].tm = moment().add(1, 'minutes');
                fulfill(self);
                return;
            }
            self._load(dbPath)
                .then((results) => {
                    propertiesDict[self.urn] = self;
                    propertiesDict[self.urn].tm = moment().add(1, 'minutes');
                    JsonProperties.dbs.map((elt, index) => {
                        const name = elt.substring(8);
                        self[name] = results[index];
                    });
                    fulfill(self);
                })
                .catch((error) => {
                    reject(error);
                });
        })));
    }

    readFull(dbId, includeParents) {
        includeParents = includeParents || false;
        dbId = parseInt(dbId, 10);
        const result = {
            objectid: dbId,
            guid: this.ids[dbId],
            properties: {},
            parents: [],
        };
        let parent = this._readFull(dbId, result);
        while (includeParents === true && parent !== null && parent !== 1) {
            parent = this._readFull(parent, result, includeParents);
        }
        result.properties = Object.keys(result.properties).map(elt => result.properties[elt]);
        return (result);
    }

    read(dbId) {
        dbId = parseInt(dbId, 10);
        const result = {
            objectid: dbId,
            name: '',
            externalId: this.ids[dbId],
            properties: {},
        };
        const parent = this._read(dbId, result);
        // while ( parent !== null && parent !== 1 )
        //  parent =this._read (parent, result) ;
        // result.properties =Object.keys (result.properties).map (function (elt) {
        //  return (result.properties [elt]) ;
        // }) ;
        return (result);
    }

    _load(dbPath) {
        const prs = JsonProperties.dbs.map(elt => (utils.jsonGzRoot(path.join(dbPath, `${elt}.json.gz`))));
        return (Promise.all(prs));
    }

    _readFull(dbId, result, includeParents) {
        includeParents = includeParents || false;
        let parent = null;
        const propStart = 2 * this.offs[dbId];
        const propStop = (this.offs.length <= dbId + 1) ? this.avs.length : 2 * this.offs[dbId + 1];
        for (let i = propStart; i < propStop; i += 2) {
            const attr = this.attrs[this.avs[i]];
            const key = `${attr[JsonProperties.iCATEGORY]}/${attr[JsonProperties.iNAME]}`;
            if (key === '__parent__/parent') {
                parent = parseInt(this.vals[this.avs[i + 1]], 10);
                result.parents.push(parent);
                continue;
            }
            if (result.properties.hasOwnProperty(key)) { continue; }
            result.propertiess[key] = {
                category: attr[JsonProperties.iCATEGORY],
                name: attr[JsonProperties.iNAME],
                displayName: attr[JsonProperties.iDISPLAYNAME],
                type: attr[JsonProperties.iTYPE],
                value: this.vals[this.avs[i + 1]],
                unit: attr[JsonProperties.iUNIT],
                hidden: ((attr[JsonProperties.iFLAGS] & 1) === 1),
                // id: dbId,
            };
        }
        return (parent);
    }

    _read(dbId, result) {
        const parent = null;
        const propStart = 2 * this.offs[dbId];
        const propStop = (this.offs.length <= dbId + 1) ? this.avs.length : 2 * this.offs[dbId + 1];
        for (let i = propStart; i < propStop; i += 2) {
            const attr = this.attrs[this.avs[i]];
            const category = attr[JsonProperties.iCATEGORY];
            let key = `${attr[JsonProperties.iCATEGORY]}/${attr[JsonProperties.iNAME]}`;
            // if ( key === '__parent__/parent' ) {
            //  parent =parseInt (this.vals [this.avs [i + 1]]) ;
            //  result.parents.push (parent) ;
            //  continue ;
            // }
            if (key === '__instanceof__/instanceof_objid') {
                // Allright, we need to read teh definition
                this._read(parseInt(this.vals[this.avs[i + 1]], 10), result);
                continue;
            }
            if (key === '__viewable_in__/viewable_in'
                || key === '__parent__/parent'
                || key === '__child__/child'
                || key === '__node_flags__/node_flags'
                || key === '__document__/schema_name'
                || key === '__document__/schema_version'
                || key === '__document__/is_doc_property'
            ) {
                continue;
            }
            // console.log (key) ;
            if (key === '__name__/name') {
                if (result.name === '') { result.name = this.vals[this.avs[i + 1]]; }
                continue;
            }
            if (!result.properties.hasOwnProperty(category)) { result.properties[category] = {}; }
            if (key !== 'Identity Data/ibcGUID') {
                key = attr[JsonProperties.iDISPLAYNAME];
            }
            let value = '';
            if (attr[JsonProperties.iTYPE] === JsonProperties.tBoolean) { value = this.vals[this.avs[i + 1]] === 0 ? 'No' : 'Yes'; } else if (attr[JsonProperties.iTYPE] === JsonProperties.tColor) { value = this.vals[this.avs[i + 1]].toString(); } else if (attr[JsonProperties.iTYPE] === JsonProperties.tNumeric) { value = Number.parseFloat(this.vals[this.avs[i + 1]]).toFixed(3); } else { value = this.vals[this.avs[i + 1]]; }

            if (attr[JsonProperties.iUNIT] !== null) { value += ` ${attr[JsonProperties.iUNIT]}`; }

            // result.properties [category] [key] =value ;
            if (result.properties[category].hasOwnProperty(key)) {
                if (!Array.isArray(result.properties[category][key])) {
                    result.properties[category][key] = [result.properties[category][key]];
                }
                result.properties[category][key].push(value);
            } else if (!['', ' ', null, undefined].includes(value)) {
                if (attr[0] === 'ibcGUID') {
                    result.properties[category][attr[0]] = value;
                } else {
                    result.properties[category][key] = value;
                }
            }
        }
        // Sorting objects
        Object.keys(result.properties).sort().every((cat) => {
            const r = {};
            Object.keys(result.properties[cat]).sort().every((elt) => {
                r[elt] = result.properties[cat][elt];
                return (true);
            });
            delete result.properties[cat];
            result.properties[cat] = r;
            return (true);
        });
        return (parent);
    }
}

const jobs = {};
class BubbleAccess {
    static getManifest(urn, _forgeToken) {
        // Verify the required parameter 'urn' is set
        if ([undefined, null].includes(urn)) {
            return Promise.reject(
                new Error("Missing the required parameter 'urn' when calling getManifest"),
            );
        }
        const token = getToken(urn, _forgeToken);
        jobs[urn].status = 'started';
        jobs[urn].progress = 0;
        const { apiClient } = new DerivativesApi();
        return apiClient.callApi(
            '/derivativeservice/v2/manifest/{urn}', 'GET',
            { urn }, {}, { },
            {}, null,
            [], ['application/vnd.api+json', 'application/json'], null,
            token, token.credentials,
        );
    }

    static extractPathsFromGraphicsUrn(urn, result) {
        // This needs to be done for encoded OSS URNs, because the paths
        // in there are url encoded and lose the / character.
        urn = decodeURIComponent(urn);
        const basePath = urn.slice(0, urn.lastIndexOf('/') + 1);
        let localPath = basePath.slice(basePath.indexOf('/') + 1);
        const urnBase = basePath.slice(0, basePath.indexOf('/'));
        localPath = localPath.replace(/^output\//, '');
        // For supporting compound bubbles, we need to prefix
        // by sub-urn as well, otherwise files might clash.
        // var localPrefix = urnBase
        //  ? crypto.createHash('md5').update(urnBase).digest("hex") + "/"
        //  : "";
        const localPrefix = '';
        result.urn = urn;
        result.basePath = basePath;
        result.localPath = localPrefix + localPath;
        result.rootFileName = urn.slice(urn.lastIndexOf('/') + 1);
    }

    static listAllDerivativeFiles(bubble, callback) {
        const modelURN = bubble.urn;
        // First get all the root derivative files from the bubble
        const res = [];
        (function traverse(node, parent) {
            if (node.role === 'Autodesk.CloudPlatform.PropertyDatabase') {
                const item = { mime: node.mime };
                BubbleAccess.extractPathsFromGraphicsUrn(node.urn, item);
                node.urn = `$file$/${item.localPath}${item.rootFileName}`;
                item.modelURN = modelURN;
                res.push(item);
                return;
            }
            if (node.children && res.length === 0) {
                node.children.forEach((child) => {
                    if (res.length === 0) { traverse(child, node); }
                });
            }
        }(bubble, null));

        if (res.length === 0) { return (callback('DB not found', null)); }

        let current = 0;
        let done = 0;
        const processOne = () => {
            const onProgress = () => {
                done++;
                // console.log ('Manifests done ', done) ;
                if (done === res.length) {
                    const result = {
                        list: res,
                    };
                    callback(null, result);
                } else {
                    setTimeout(processOne, 0);
                }
            };

            if (current >= res.length) { return; }
            const rootItem = res[current++];
            rootItem.files = [];
            const { files } = rootItem;
            if (rootItem.mime === 'application/autodesk-db') {
                // The file list for property database files is fixed,
                // no need to go to the server to find out
                files.push('objects_attrs.json.gz');
                files.push('objects_vals.json.gz');
                files.push('objects_avs.json.gz');
                files.push('objects_offs.json.gz');
                files.push('objects_ids.json.gz');
                onProgress();
            }
        };
        // Kick off 6 parallel jobs
        for (let k = 0; k < 6; k++) { processOne(); }
    }

    static downloadAllDerivativeFiles(urn, fileList, destDir, _forgeToken, callback) {
        const token = getToken(urn, _forgeToken);
        let succeeded = 0;
        let failed = 0;
        const flatList = [];
        for (let i = 0; i < fileList.length; i++) {
            const item = fileList[i];
            for (let j = 0; j < item.files.length; j++) {
                const flatItem = {
                    basePath: item.basePath,
                    localPath: destDir, // + item.localPath,
                    fileName: item.files[j],
                    modelURN: item.modelURN,
                };
                if (item.name) { flatItem.name = item.name; }
                if (item.urn) {
                    flatItem.urn = item.urn;
                    flatItem.guid = item.guid;
                    flatItem.mime = item.mime;
                }
                flatList.push(flatItem);
            }
        }
        // console.log (JSON.stringify (flatList, null, 2)) ;
        if (flatList.length === 0) { return (callback(failed, succeeded)); }
        let current = 0;
        let done = 0;
        const downloadOneItem = () => {
            if (current >= flatList.length) { return; }
            const fi = flatList[current++];
            const downloadComplete = (error, success) => {
                done++;
                if (error) {
                    failed++;
                    console.error('Failed to download file:', fi.fileName, fi.modelURN, error);
                } else {
                    succeeded++;
                    console.log('Downloaded:', fi.fileName, fi.modelURN);
                }
                jobs[urn].progress = (100 * (failed + succeeded) / flatList.length) | 0;
                // console.log ('Progress: ', jobs [urn].progress, '%') ;
                if (done === flatList.length) {
                    callback(flatList);
                } else {
                    setTimeout(downloadOneItem, 0);
                }
            };
            // console.log ((fi.basePath + '/' + fi.fileName).replace (/\/\//g, '/')) ;
            // console.log (path.join (fi.localPath, fi.modelURN, fi.fileName));
            BubbleAccess.getItem(
                (`${fi.basePath}/${fi.fileName}`).replace(/\/\//g, '/'),
                path.join(fi.localPath, fi.modelURN, fi.fileName),
                token,
                downloadComplete,
            );
        };
        // Kick off 10 parallel jobs
        for (let k = 0; k < 10; k++) { downloadOneItem(); }
    }

    static downloadItem(urn, _forgeToken) {
        if ([undefined, null].includes(urn)) {
            return Promise.reject(
                new Error("Missing the required parameter 'urn' when calling downloadItem"),
            );
        }
        const token = getToken(urn, _forgeToken);
        const { apiClient } = new DerivativesApi();
        return apiClient.callApi(
            '/derivativeservice/v2/derivatives/{urn}', 'GET',
            { urn }, {}, { 'Accept-Encoding': 'gzip, deflate' },
            {}, null,
            [], [], null,
            token, token.credentials,
        );
    }

    static openWriteStream(outFile) {
        let wstream;
        if (outFile) {
            try {
                mkdirp.sync(path.dirname(outFile));
                wstream = fs.createWriteStream(outFile);
            } catch (e) {
                console.error('Error:', e.message);
            }
        }
        return (wstream);
    }

    static getItem(urn, outFile, _forgeToken, callback) {
        const token = getToken(urn, _forgeToken);
        BubbleAccess.downloadItem(urn, token)
            .then(({ statusCode, body }) => {
                if (statusCode !== 200) {
                    return callback(statusCode);
                }
                // Skip unzipping of items
                // to make the downloaded content compatible with viewer debugging
                const wstream = BubbleAccess.openWriteStream(outFile);
                if (wstream) {
                    wstream.write(
                        typeof body === 'object' && path.extname(outFile) === '.json'
                            ? JSON.stringify(body)
                            : body,
                    );
                    wstream.end();
                    callback(null, statusCode);
                } else {
                    callback(null, body);
                }
            })
            .catch((error) => {
                console.error('Error:', error.message);
                callback(error, null);
            });
    }
}

function returnJsonPayload(json, compMethod, res) {
    switch (compMethod) {
    default:
        res.json(json);
        // utils.logTimeStamp (req.params.urn) ;
        break;
    case 'gzip':
    case 'deflate':
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Encoding', compMethod);

        zlib[compMethod](Buffer.from(JSON.stringify(json), 'utf-8'), (_, result) => {
            res.setHeader('Content-Length', result.length);
            res.end(result);
        });
        break;
    }
}

router.get('/:urn/load/progress', (req, res) => {
    const urn = getUrn(req);
    console.log(`jobs: ${JSON.stringify(jobs, null, 2)}`);
    if (jobs.hasOwnProperty(urn)) {
        return res.status(201).json(jobs[urn]);
    }
    utils.fileexists(utils.dataPath(urn, ''))
        .then((bExists) => {
            if (bExists) {
                res.status(200).json({ status: 'completed', progress: 100 });
            } else {
                res.status(404).end();
            }
        })
        .catch(() => {
            res.status(500).end();
        });
});

router.get('/:urn/load', (req, res) => {
    const { credentials } = config;
    const urn = getUrn(req);
    if (jobs.hasOwnProperty(urn) && jobs[urn].status !== 'failed') {
        return res.status(201).json(jobs[urn]);
    }
    let token = getToken(urn);
    if (!credentials.HAS_DEFAULTS) {
        const bearer = utils.authorization(req);
        if (bearer !== null) {
            const { client_id: id, client_secret: secret, scope } = credentials;
            token = new AuthClientTwoLegged(id, secret, scope);
            Object.assign(token.credentials, {
                token_type: 'Bearer',
                expires_in: 3599,
                access_token: bearer,
            });
        }
    }
    jobs[urn] = { status: 'accepted' };
    BubbleAccess.getManifest(urn, token)
        .then((bubble) => {
            // console.log (JSON.stringify (bubble, null, 2)) ;
            res.status(201).json(jobs[urn]);
            BubbleAccess.listAllDerivativeFiles(bubble.body, (error, result) => {
                if (error !== null || result === null) {
                    delete jobs[urn];
                    return;
                }
                // console.log (JSON.stringify (result, null, 2)) ;
                // var filesToFetch =result.list [0].files.length ;
                // console.log ('Number of files to fetch:', filesToFetch) ;
                jobs[urn].status = 'inprogress';
                jobs[urn].progress = 0;
                // console.log (JSON.stringify (result, null, 2)) ;
                const outPath = utils.dataPath('', '');
                BubbleAccess.downloadAllDerivativeFiles(urn, result.list, outPath, token, () => {
                    delete jobs[urn];
                });
            });
        })
        .catch((error) => {
            console.error(error);
            jobs[urn] = { status: 'failed', error };
            res.status(500).end();
        });
});

router.delete('/:urn', (req, res) => {
    const urn = getUrn(req);
    if (jobs.hasOwnProperty(urn)) {
        delete jobs[urn];
    }
    if (config.credentials.HAS_DEFAULTS && getToken(urn)) {
        forgeToken.delete(urn);
    }
    utils.rimraf(utils.dataPath(urn, ''))
        .then(() => {
            res.status(200).end();
        })
        .catch(() => {
            res.status(500).end();
        });
});

// Request Object(s)' properties
// set the structure to be equal to the metadata MD payload
router.get('/:urn/properties/*', (req, res) => {
    const urn = getUrn(req);
    let dbIds = utils.csv(req.params[0]); // csv format
    const compMethod = utils.accepts(req);

    const props = new JsonProperties(urn);
    // props.dbIds =dbIds ;
    props.load(utils.dataPath(urn, ''))
        .then((result) => {
            const json = {
                data: {
                    type: 'properties',
                    collection: [],
                },
            };

            if (dbIds.includes('*')) {
                const max = result.idMax;
                dbIds = [];
                // can become a problem if the size is too big (call stack)
                // dbIds =Array.apply (null, { length: max }).map (function (e, i) {
                //  return (i + 1) ;
                // }) ;
                for (let i = 1; i <= max; i++) { dbIds.push(i); }
            }
            dbIds.map((elt) => {
                if (elt > result.idMax) { throw new Error('objID out of range!'); }
                const obj = result.read(elt);
                if (obj != null) { json.data.collection.push(obj); }
            });
            // res.json (json) ;
            returnJsonPayload(json, compMethod, res);
        })
        .catch((err) => {
            console.error(err);
            // res.status (err.code || err.statusCode).end (err.message | err.statusMessage) ;
            utils.returnResponseError(res, err);
        });
});

router.get('/:urn/ids/*', (req, res) => {
    const urn = getUrn(req);
    let dbIds = utils.csv(req.params[0]); // csv format
    const compMethod = utils.accepts(req);

    const props = new JsonProperties(urn);
    // props.dbIds =dbIds ;
    props.load(utils.dataPath(urn, ''))
        .then((result) => {
            const json = {
                data: {
                    type: 'ids',
                    collection: [],
                },
            };

            if (dbIds.includes('range')) {
                dbIds = [];
                json.idMax = result.idMax;
            }
            if (dbIds.includes('*')) {
                const max = result.idMax;
                dbIds = [];
                // dbIds =Array.apply (null, { length: max }).map (Number.call, Number) ;
                // can become a problem if the size is too big (call stack)
                // dbIds =Array.apply (null, { length: max }).map (function (e, i) {
                //  return (i + 1) ;
                // }) ;
                for (let i = 1; i <= max; i++) { dbIds.push(i); }
            }
            dbIds.map((elt, index) => {
                if (elt > result.idMax) { throw new Error('objID out of range!'); }
                // json.data.collection.push (result.ids [elt]) ;
                const obj = { dbId: elt, externalID: result.ids[elt] };
                json.data.collection.push(obj);
            });

            // res.json (json) ;
            returnJsonPayload(json, compMethod, res);
        })
        .catch((err) => {
            console.error(err);
            // res.status (err.code || err.statusCode).end (err.message | err.statusMessage) ;
            utils.returnResponseError(res, err);
        });
});

router.post('/refreshToken', ({ body: { clientId, urn, token } }, res) => {
    forgeToken.refresh({ clientId, urn, token });
    res.status(200).json({ status: 'tokenRefreshed' });
});

module.exports = router;
