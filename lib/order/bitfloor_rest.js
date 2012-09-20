/// order entry through the rest interface

// builtin
var https = require('https');
var http = require('http');
var querystring = require('querystring');
var crypto = require('crypto');

var microtime = require('microtime');

var Trader = function(options) {
    var self = this;
    self.sec_key = options.sec_key;
    self.api_key = options.api_key;
    self.host = options.host;
    self.port = options.port;
    self.passphrase = options.passphrase;

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
            return cb(null, response.order_id);
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

        var orders = [];
        response.forEach(function(order) {
            orders.push({
                id: order.order_id,
                side: order.side,
                size: order.size,
                price: order.price,
            });
        });

        return cb(null, orders);
    });
}

/// get list of accounts
/// callback(err, accounts)
Trader.prototype.accounts = function(cb) {
    this._send('/accounts', {}, function(err, response) {
        return cb(err, response);
    });
}

Trader.prototype.withdraw = function(params, cb) {
    var payload = {
        currency: params.currency,
        amount: params.amount,
        method: params.method,
        destination: params.destination,
    };
    this._send('/withdraw', payload, function(err, response) {
        if (err) {
            return cb(err);
        }

        if (response.error) {
            return cb(new Error(response.error));
        }
        return cb(err, response);
    });
};

Trader.prototype.deposit = function(source, options, cb) {
    var payload = {
        source: source,
        mtgox_code: options.mtgox_code,
    };

    this._send('/deposit', payload, function(err, response) {
        if (err) {
            return cb(err);
        }

        if (response.error) {
            return cb(new Error(response.error));
        }
        return cb(err, response);
    });
};

// create a new rest trader for bitfloor
module.exports.create = function(options) {
    return new Trader(options);
};

/// send payload to url
/// nonce will be added
/// callback(err, response)
Trader.prototype._send = function(url, payload, cb) {
    var self = this;
    var port = self.port;

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
            'bitfloor-passphrase': self.passphrase,
            'bitfloor-version': 1,
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
