#!/usr/bin/env node

// builtin
var http = require('http');
var querystring = require('querystring');
var crypto = require('crypto');
var readline = require('readline');

var colors = require('colors');

// trader setup
var config = require('../config.json');

// the hmac which will sign our requests
var api_key = config.api_key;
var sec_key = config.sec_key;

var host = config.host;
var port = config.port;

/// send payload to url
/// nonce will be added
/// callback(response)
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

    var req = http.request(options, function(res) {
        var buff = '';
        res.setEncoding('utf8');
        res.on('data', function(data) {
            buff += data;
        });

        res.on('end', function() {
            var msg = JSON.parse(buff);
            cb(msg);
        });

    });

    // write the payload out to the request
    req.write(body);
    req.end();
}

function order_new(product, price, size, side, cb) {
    var out = {
        price: price,
        size: size,
        product_id: product,
        side: side,
    };

    send('/order/new', out, function(response) {
        if (response.error) {
            console.log('[rejected] %s'.red, response.error);
        } else if (response.order_id) {
            console.log('[placed] order id: %s'.green, response.order_id);
        } else {
            console.log('unknown response: %j'.red, response);
        }

        cb();
    });
}

function order_cancel(product, order_id, cb) {
    var out = {
        product_id: product,
        order_id: order_id
    };

    send('/order/cancel', out, function(response) {
        if (response.error) {
            console.log('[rejected] %s'.red, response.error);
        } else if (response.order_id) {
            console.log('[cancelled] %s'.green, response.order_id);
        } else {
            console.log('unknown response: %j'.red, response);
        }

        cb();
    });
}

function orders(cb) {
    send('/orders', {}, function(response) {
        response.forEach(function(order) {
            var side = 'buy';
            if (order.side === 1) {
                side = 'sell'
            }
            console.log('id: %s product: %s %s %d @ %d'.yellow,
                        order.id, order.product_id, side, order.size, order.price);
        });

        cb();
    });
}

function order(order_id, cb) {
    send('/order/details', { order_id: order_id }, function(response) {
        console.log(response);
        cb();
    });
}

function positions(cb) {
    send('/positions', {}, function(response) {
        response.forEach(function(position) {
            var amnt = position.amount;
            var hold = position.hold;
            console.log('%s\tamnt: %d\thold: %d\t avail: %d',
                        position.currency, amnt, hold, amnt - hold);
        });
        cb();
    });
}

var rl = readline.createInterface(process.stdin, process.stdout);

rl.prompt();

// handle commands from readline
var handlers = {
    'buy': function(params, cb) {
        if (params.length != 3) {
            console.log('buy <product_id> <size> <price>');
            return cb();
        }

        var product = params.shift();
        var size = params.shift();
        var price = params.shift();

        // send new order
        order_new(product, price, size, 0, cb);
    },
    'sell': function(params, cb) {
        if (params.length != 3) {
            console.log('sell <product_id> <size> <price>');
            return cb();
        }

        var product = params.shift();
        var size = params.shift();
        var price = params.shift();

        // send new order
        order_new(product, price, size, 1, cb);
    },
    'orders': function(params, cb) {
        orders(cb);
    },
    'order': function(params, cb) {
        var order_id = params.shift();
        order(order_id, cb);
    },
    'cancel': function(params, cb) {
        if (params.length != 2) {
            console.log('cancel <product_id> <order_id>');
            return cb();
        }

        var product = params.shift();
        var order_id = params.shift();

        order_cancel(product, order_id, cb);
    },
    'positions': function(params, cb) {
        positions(cb);
    },
    'exit': function() {
        rl.close();
        process.stdin.destroy();
    }
}


rl.on('line', function(line) {
    var args = line.split(' ');
    var cmd = args.shift();
    var handler = handlers[cmd];
    if (!handler) {
        console.log('not a valid command: ' + cmd);
        rl.prompt();
        return;
    }

    // redisplay the prompt after the callback has printed
    handler(args, function() {
        rl.prompt();
    });
});

