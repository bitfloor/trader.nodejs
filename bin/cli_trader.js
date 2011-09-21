#!/usr/bin/env node

// builtin
var readline = require('readline');

// 3rd party
var colors = require('colors');

var trader = require('../lib/rest_trader');

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

        trader.order_new(product, price, size, 0, function(err, detail) {
            if (err) {
                console.log('[rejected] %s'.red, err.message);
                return cb();
            }

            console.log('[placed] order id: %s'.green, detail.order_id);
            cb();
        });
    },
    'sell': function(params, cb) {
        if (params.length != 3) {
            console.log('sell <product_id> <size> <price>');
            return cb();
        }

        var product = params.shift();
        var size = params.shift();
        var price = params.shift();

        trader.order_new(product, price, size, 1, function(err, detail) {
            if (err) {
                console.log('[rejected] %s'.red, err.message);
                cb();
            }

            console.log('[placed] order id: %s'.green, detail.order_id);
            cb();
        });
    },
    'orders': function(params, cb) {
        trader.orders(function(err, orders) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            orders.forEach(function(order) {
                var side = 'buy';
                if (order.side === 1) {
                    side = 'sell'
                }
                console.log('id: %s product: %s %s %d @ %d'.yellow,
                            order.id, order.product_id, side, order.size, order.price);
            });

            cb();
        });
    },
    'order': function(params, cb) {
        var order_id = params.shift();
        trader.order_details(order_id, function(err, details) {
            console.log(details);
            cb();
        });
    },
    'cancel': function(params, cb) {
        if (params.length != 2) {
            console.log('cancel <product_id> <order_id>');
            return cb();
        }

        var product = params.shift();
        var order_id = params.shift();

        trader.order_cancel(product, order_id, function(err, detail) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            console.log('[cancelled] order id: %s'.green, detail.order_id);
            cb();
        });
    },
    'positions': function(params, cb) {
        trader.positions(function(err, positions) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            positions.forEach(function(position) {
                var amnt = position.amount;
                var hold = position.hold;
                console.log('%s\tamnt: %d\thold: %d\t avail: %d',
                            position.currency, amnt, hold, amnt - hold);
            });

            cb();
        });
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

