Dynamic Catalogue Server
========================

A simple dynamic catalogue server implementing:

 * A single catalogue at /cat
 * Read/insert/modify of items
 * Basic Auth for authentication (required for write operations)
 * Search of catalogue (urn:X-tsbiot:search:simple)

The server is built for simplicity, not performance.
See htdocs/index.html for more information.

Prerequisites
-------------

The server relies on mongodb for persistent storage.

Running
-------

    npm install
    npm start

Access http://localhost:8001


Wiping the catalogue
--------------------

For test purposes, the catalogue may be wiped with

    node dropdb.js

