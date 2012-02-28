/// order entry through the rest interface

// builtin
var https = require('https');
var querystring = require('querystring');
var crypto = require('crypto');

var microtime = require('microtime');

var Trader = function(options) {
    var self = this;
    self.sec_key = options.sec_key;
    self.api_key = options.api_key;
    self.host = options.host;

    self.poll_interval = options.poll_interval || 1000;

    // TODO
    setInterval(function() {
        // get list of orders
        // record details for each order
        // if there are new fills for the order
        // emit events for those fills
    }, self.poll_interval);
};

/// callback(err, detail)
Trader.prototype.new_order = function(details, cb) {
    this._send('/order/new', details, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        } else if (response.order_id) {
            return cb(null, response);
        }

        return cb(new Error('unknown message: ' + response));
    });
};

/// cancel an orders
/// details { product_id, order_id }
/// callback(err, detail)
Trader.prototype.cancel_order = function(details, cb) {
    this._send('/order/cancel', details, function(err, response) {
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

/// get order details
/// callback(err, details)
Trader.prototype.order_details = function(order_id, cb) {
    this._send('/order/details', { order_id: order_id }, function(err, response) {
        if (response.error) {
            return cb(new Error(response.error));
        }

        return cb(err, response);
    });
}

/// get list of open orders
/// callback(err, orders)
Trader.prototype.orders = function(cb) {
    this._send('/orders', {}, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        }

        return cb(null, response);
    });
}

/// get list of accounts
/// callback(err, accounts)
Trader.prototype.accounts = function(cb) {
    this._send('/accounts', {}, function(err, response) {
        return cb(err, response);
    });
}

Trader.prototype.withdraw = function(currency, amount, destination, cb) {
    var payload = {
        currency: currency,
        amount: amount,
        destination: destination
    };
    this._send('/withdraw', payload, function(err, response) {
        if (response.error) {
            return cb(new Error(response.error));
        }
        return cb(err, response);
    });
}

// create a new rest trader for bitfloor
module.exports.create = function(options) {
    return new Trader(options);
};

/// send payload to url
/// nonce will be added
/// callback(err, response)
Trader.prototype._send = function(url, payload, cb) {
    var self = this;
    var port = 443;

    payload.nonce = microtime.now();
    var body = querystring.stringify(payload);

    var sec_key_buffer = Buffer(self.sec_key, 'base64');
    var hmac = crypto.createHmac('sha512', sec_key_buffer);
    var sign = hmac.update(body).digest('base64');

    var options = {
        host: self.host,
        port: port,
        path: url,
        method: 'POST',
        headers: {
            'bitfloor-key': self.api_key,
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
