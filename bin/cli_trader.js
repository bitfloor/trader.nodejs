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

// for order entry
var api_key = config.api_key;
var sec_key = config.sec_key;

// order entry and market data
var host = config.host;

// setup order entry
var trader = trader_builder.build({
    exchange: exchange,
    protocol: 'rest',
    host: host,
    api_key: api_key,
    sec_key: sec_key,
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
            productt: params.shift(),
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
        var amount = params.shift();
        var destination = params.shift();

        if (!amount || !destination) {
            console.log('withdraw <amount> <destination>');
            return cb();
        }

        trader.withdraw('BTC', amount, destination, function(err) {
            if (err) {
                console.log('[error] %s'.red, err.message);
                return cb();
            }

            console.log('[info] withdraw submitted');
            cb();
        });
    },
    'help': function(params, cb) {
        console.log('buy <product_id> <size> <price>');
        console.log('sell <product_id> <size> <price>');
        console.log('cancel <product_id> <order_id>');
        console.log('--------');
        console.log('orders');
        console.log('accounts');
        console.log('withdraw <amount> <destination>');
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

