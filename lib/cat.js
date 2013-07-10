/** Copyright (c) 2013 Toby Jaffey <toby@1248.io>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

var config = require('./config');
var db = require('./mongo');
var _ = require('underscore');

function sanitize(doc) {
    delete doc._id;
    return doc;
}

function create_item(item, cb) {
    var items = db.get().collection('items');
    items.ensureIndex({href:1}, {unique:true}, function(err, indexName) {
        if (err)
            cb("duplicate href", null);
        else {
            items.insert(item, {w:1}, function(err, rspdoc) {
                if (err)
                    cb("insert fail", null);
                else {
                    cb(null, rspdoc);
                }
            });
        }
    });
}

function update_item(href, item, cb) {
    var items = db.get().collection('items');
    items.update({href:href}, {$set: item}, {safe: true, upsert: true}, function(err, doc) {
        if (err)
            cb("update failed");
        else {
            cb(null);
        }
    });
}

function validateMetadataArray(metadataArray) {
    var hasDescription = false;
    for (var i=0;i<metadataArray.length;i++) {
        if (typeof metadataArray[i] != 'object')
            return false;
        if (Object.keys(metadataArray[i]).length != 2)
            return false;
        if (typeof metadataArray[i].rel != 'string')
            return false;
        if (typeof metadataArray[i].val != 'string')
            return false;
        if (metadataArray[i].rel == 'urn:X-tsbiot:rels:hasDescription:en')
            hasDescription = true;
    }
    if (!hasDescription)
        return false;
    return true;
}

function validateItem(item) {
    try {
        // a valid item must have href and a metadata array
        if (typeof item.href != 'string')
            return false;
        if (!(item['i-object-metadata'] instanceof Array))
            return false;
        if (!validateMetadataArray(item['i-object-metadata']))
            return false;
    } catch(e) { return false; }
    return true;
}

function filterSearch(docs, href, rel, val) {
    // FIXME, this is for clarity, not speed
    var ret = [];

    if (href === undefined && rel === undefined && val === undefined)
        return docs;

    for (var i=0;i<docs.length;i++) {
        if (href !== undefined && href == docs[i].href) {
            ret.push(docs[i]);
            continue;
        }
        for (var j=0;j<docs[i]['i-object-metadata'].length;j++) {
            if (rel !== undefined && rel == docs[i]['i-object-metadata'][j].rel) {
                ret.push(docs[i]);
                continue;
            }
            if (val !== undefined && val == docs[i]['i-object-metadata'][j].val) {
                ret.push(docs[i]);
                continue;
            }
        }
    }
    return ret;
}

exports.get = function(req, res) {
    items = db.get().collection('items');
    var filter = {};

    items.find(filter, function(err, cursor) {
        if (err)
            res.send(500);
        else {
            cursor.toArray(function(err, docs) {
                // FIXME, this should be done with mongodb find() in the db, not here
                docs = filterSearch(docs, req.query.href, req.query.rel, req.query.val);

                // construct a catalogue object
                var cat = {
                    "item-metadata": [
                        {
                            rel:"urn:X-tsbiot:rels:isContentType",
                            val:"application/vnd.tsbiot.catalogue+json"
                        },
                        {
                            rel:"urn:X-tsbiot:rels:hasDescription:en",
                            val:"Catalogue test"
                        },
                        {
                            rel:"urn:X-tsbiot:rels:supportsSearch",
                            val:"urn:X-tsbiot:search:simple"
                        }
                    ],
                    items: _.map(docs, sanitize)
                };
                res.send(200, cat);
            });
        }
    });
};

exports.put = function(req, res) {
    if (!validateItem(req.body)) {
        res.send(400);  // bad request
    } else {
        items = db.get().collection('items');
        items.findOne({href:req.query.href}, function(err, doc) {
            if (err !== null)
                res.send(400);
            else
            if (doc !== null) {
                update_item(req.query.href, req.body, function(err) {
                    if (err) {
                        res.send(400);  // problem
                    } else {
                        res.send(200);
                    }
                });
            } else {
                res.send(404);  // not found
            }
        });
    }
};

exports.post = function(req, res) {
    if (!validateItem(req.body)) {
        res.send(400);  // bad request
    } else {
        items = db.get().collection('items');
        items.findOne({href:req.query.href}, function(err, doc) {
            if (err !== null)
                res.send(400);
            else
            if (doc !== null) {
                update_item(req.query.href, req.body, function(err) {
                    if (err) {
                        res.send(400);  // problem
                    } else {
                        res.send(200);
                    }
                });
            } else {
                if (req.query.href != req.body.href) {
                    res.send(409);  // conflict
                    return;
                }
                create_item(req.body, function(err) {
                    if (err) {
                        res.send(409, err);  // conflict
                    } else {
                        res.location('/cat');
                        res.send(201);  // created
                    }
                });
            }
        });
    }
};

exports.delete = function(req, res) {
    items = db.get().collection('items');
    var filter = {href:req.query.href};
    items.remove(filter, function(err, doc) {
        if (err)
            res.send(500);  // not found
        else
            res.send(200);
    });
};

/*
exports.create = function(req, res) {
    // check if already exists
    req.params.cat_id
    // validate req.body as complete catalogue
};
*/

