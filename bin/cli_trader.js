#!/usr/bin/env node

// builtin
var readline = require('readline');

// 3rd party
var colors = require('colors');

var trader = require('../lib/rest_trader');
var book = require('../lib/rest_book');

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
                            order.order_id, order.product_id, side, order.size, order.price);
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
    'accounts': function(params, cb) {
        trader.accounts(function(err, accounts) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            accounts.forEach(function(account) {
                var amnt = account.amount;
                var hold = account.hold;
                console.log('%s\tamnt: %d\thold: %d\t avail: %d',
                            account.currency, amnt, hold, amnt - hold);
            });

            cb();
        });
    },
    'book': function(params, cb) {
        var product_id = params.shift();

        if (!product_id) {
            console.log('book <product_id>');
            return cb();
        }

        book.l2_book(product_id, function(err, book) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            var bids = book.bids;
            var asks = book.asks;

            function print_level(name, level) {
                if (!level) {
                    return console.log('%s: empty', name);
                }
                console.log('%s: %d @ %d', name, level[1], level[0]);
            }

            print_level('bid', bids.shift());
            print_level('ask', asks.shift());
            cb();
        });
    },
    'help': function(params, cb) {
        console.log('buy <product_id> <size> <price>');
        console.log('sell <product_id> <size> <price>');
        console.log('cancel <product_id> <order_id>');
        console.log('--------');
        console.log('orders');
        console.log('order <order_id>');
        console.log('book <product_id>');
        console.log('accounts');
        console.log('--------');
        console.log('help');
        console.log('exit');
        cb();
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

