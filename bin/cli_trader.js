#!/usr/bin/env node

// builtin
var readline = require('readline');
var fs = require('fs');

// 3rd party
var colors = require('colors');

// local
var trader_builder = require('..').traders;

if (!process.argv[2]) {
    console.error('<config>');
    process.exit();
}

var config = JSON.parse(fs.readFileSync(process.argv[2]));
var exchange = config.exchange;

// order entry and market data
var host = config.host;

// setup order entry
var trader = trader_builder.build({
    exchange: exchange,
    protocol: 'rest',
    host: host,
    port: config.port,
    api_key: config.api_key,
    sec_key: config.sec_key,
    passphrase: config.passphrase,
});

var rl = readline.createInterface(process.stdin, process.stdout);
rl.prompt();

// handle commands from readline
var handlers = {
    'buy': function(params, cb) {
        if (params.length != 3) {
            console.log('buy <product_id> <size> <price>');
            return cb();
        }

        var details = {
            product_id: params.shift(),
            size: params.shift(),
            price: params.shift(),
            side: 0,
        }

        trader.new_order(details, function(err, order_id) {
            if (err) {
                console.log('[rejected] %s'.red, err.message);
                return cb();
            }

            console.log('[placed] order id: %s'.green, order_id);
            cb();
        });
    },
    'sell': function(params, cb) {
        if (params.length != 3) {
            console.log('sell <product_id> <size> <price>');
            return cb();
        }

        var details = {
            product_id: params.shift(),
            size: params.shift(),
            price: params.shift(),
            side: 1,
        }

        trader.new_order(details, function(err, order_id) {
            if (err) {
                console.log('[rejected] %s'.red, err.message);
                cb();
            }

            console.log('[placed] order id: %s'.green, order_id);
            cb();
        });
    },
    'cancel': function(params, cb) {
        if (params.length != 2) {
            console.log('cancel <product_id> <order_id>');
            return cb();
        }

        var details = {
            product_id: params.shift(),
            order_id: params.shift(),
        }

        trader.cancel_order(details, function(err, detail) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            console.log('[cancelled] order id: %s'.green, detail.order_id);
            cb();
        });
    },
    'cancel-all': function(params, cb) {
        if (params.length != 1) {
            console.log('cancel-all <product_id>');
            return cb();
        }

        var product_id = params.shift();

        trader.orders(function(err, orders) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            (function next(err, detail) {
                if (err) {
                    console.log('[error] %s'.red, err.message);
                    return cb();
                }

                if (detail) {
                    console.log('[cancelled] order id: %s'.green, detail.order_id);
                }

                var order = orders.shift();
                if (!order) {
                    return cb();
                }

                var details = {
                    product_id: product_id,
                    order_id: order.id,
                }

                trader.cancel_order(details, next);
            })();
        });
    },
    'orders': function(params, cb) {
        trader.orders(function(err, orders) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            orders.forEach(function(order) {
                var side = (order.side === 0) ? 'buy' : 'sell';
                console.log('[%s] %s %d @ %d'.yellow,
                            order.id, side, order.size, order.price);
            });
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
    'withdraw': function(params, cb) {
        var currency = params.shift();
        var amount = params.shift();
        var method = params.shift();
        var destination = params.shift();

        var opt = {
            currency: currency,
            amount: amount,
            method: method,
            destination: destination,
        };

        trader.withdraw(opt, function(err, response) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            console.log('[info] withdraw submitted %j', response);
            cb();
        });
    },
    'help': function(params, cb) {
        console.log('buy <product_id> <size> <price>');
        console.log('sell <product_id> <size> <price>');
        console.log('cancel <product_id> <order_id>');
        console.log('cancel-all <product_id>');
        console.log('--------');
        console.log('orders');
        console.log('accounts');
        console.log('withdraw <currency> <amount> <method> [destination]');
        console.log('deposit <method> <details>');
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

