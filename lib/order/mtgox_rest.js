/// mtgox rest trader

// builtin
var https = require('https');
var querystring = require('querystring');
var crypto = require('crypto');

// 3rd party
var num = require('num');
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
    var url = '/api/1/' + details.product_id + '/private/order/add';
    var price = num(details.price).mul(1e5).toString();
    var size = num(details.size).mul(1e8).toString();

    var params = {
        type: (details.side === 0) ? 'bid' : 'ask',
        amount_int: size,
        price_int: price,
    };

    this._send(url, params, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        } else if (response.return) {
            return cb(null, response.return);
        }

        return cb(new Error('unknown message: ' + response));
    });
};

/// cancel an orders
/// details { product_id, order_id }
/// callback(err, detail)
Trader.prototype.cancel_order = function(details, cb) {
    var url = '/api/1/' + details.product_id + '/private/order/remove';
    var params = {
        oid: details.order_id,
    };
    this._send('/api/0/cancelOrder.php', params, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        }

        return cb(null, details);
    });
}

/// get list of open orders
/// callback(err, orders)
Trader.prototype.orders = function(cb) {
    this._send('/api/1/generic/private/orders', {}, function(err, response) {
        if (err) {
            return cb(err);
        } else if (response.error) {
            return cb(new Error(response.error));
        }

        var orders = [];
        response.return.forEach(function(order) {
            orders.push({
                id: order.oid,
                side: (order.type === 'bid') ? 0 : 1,
                size: order.amount.value,
                price: order.price.value,
            });
        });

        return cb(null, orders);
    });
}

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
            'Rest-Key': self.api_key,
            'Rest-Sign': sign,
            'User-Agent': 'btctrader',
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

    req.on('error', function(err) {
        cb(err);
    });

    // write the payload out to the request
    req.end(body);
}

// create a new rest trader for mtgox
module.exports.create = function(options) {
    return new Trader(options);
};
