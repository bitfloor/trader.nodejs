// methods to get the order book over the rest api
var http = require('http');
var https = require('https');

// trader setup
var config = require('../config.json');

var host = config.host;
var port = config.port;

var proto = (port === 443) ? https : http;

/// callback(err, l1_book)
module.exports.l1_book = function(product_id, cb) {
};

module.exports.l2_book = function(product_id, cb) {
    var options = {
        host: host,
        path: '/book/l2/' + product_id,
    }

    proto.get(options, function(res) {
        if (res.statusCode !== 200) {
            return cb(new Error('unable to get book'));
        }

        res.setEncoding('utf8');
        res.on('data', function(data) {
            var book = JSON.parse(data);
            cb(null, book);
        });
    }).on('error', function(err) {
        cb(err);
    });
};
