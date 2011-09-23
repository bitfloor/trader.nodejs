/// order entry through the rest interface

// builtin
var http = require('http');
var https = require('https');
var querystring = require('querystring');
var crypto = require('crypto');

// trader setup
var config = require('../config.json');

// the hmac which will sign our requests
var api_key = config.api_key;
var sec_key = config.sec_key;

var host = config.host;
var port = config.port;

/// place a new order
/// callback(err, detail)
function order_new(product, price, size, side, cb) {
    var out = {
        price: price,
        size: size,
        product_id: product,
        side: side,
    };

    send('/order/new', out, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        } else if (response.order_id) {
            return cb(null, response);
        }

        return cb(new Error('unknown message: ' + response));
    });
}
module.exports.order_new = order_new;

/// cancel an orders
/// callback(err, detail)
function order_cancel(product, order_id, cb) {
    var out = {
        product_id: product,
        order_id: order_id
    };

    send('/order/cancel', out, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        } else if (response.order_id) {
            return cb(null, response);
        }

        return cb(new Error('unknown message: ' + response));
        cb();
    });
}
module.exports.order_cancel = order_cancel;

/// get order details
/// callback(err, details)
function order_details(order_id, cb) {
    send('/order/details', { order_id: order_id }, function(err, response) {
        if (response.error) {
            return cb(new Error(response.error));
        }

        cb(err, response);
    });
}
module.exports.order_details = order_details;

/// get list of open orders
/// callback(err, orders)
function orders(cb) {
    send('/orders', {}, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        }

        cb(null, response);
    });
}
module.exports.orders = orders;

/// get list of accounts
/// callback(err, accounts)
function accounts(cb) {
    send('/accounts', {}, function(err, response) {
        cb(err, response);
    });
}
module.exports.accounts = accounts;

/// send payload to url
/// nonce will be added
/// callback(err, response)
function send(url, payload, cb) {
    payload.nonce = Date.now();
    var body = querystring.stringify(payload);

    var hmac = crypto.createHmac('sha512', sec_key);
    hmac.update(body);
    var sign = hmac.digest('base64');

    var options = {
        host: host,
        port: port,
        path: url,
        method: 'POST',
        headers: {
            'bitfloor-key': api_key,
            'bitfloor-sign': sign,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': body.length
        }
    };

    var proto = port === 443 ? https : http;
    var req = proto.request(options, function(res) {
        var buff = '';
        res.setEncoding('utf8');
        res.on('data', function(data) {
            buff += data;
        });

        res.on('end', function() {
            try {
                var msg = JSON.parse(buff);
            } catch (e) {
                console.error('invalid response: \n', buff);
                return cb(new Error('body was not valid json'));
            }
            cb(null, msg);
        });

    });

    // write the payload out to the request
    req.write(body);
    req.end();
}
