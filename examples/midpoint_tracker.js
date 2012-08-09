/// simple trader to track the inside bid/ask and place an order
/// one tick around it (further outside)

// builtin
var fs = require('fs');

// 3rd party
var num = require('num');

// library
var books = require('..').books;
var order_entry = require('..').traders;

if (!process.argv[2]) {
    console.error('config argument required');
    process.exit();
}

var config = JSON.parse(fs.readFileSync(process.argv[2]));

// for order entry
var api_key = config.api_key;
var sec_key = config.sec_key;

// order entry and market data
var host = config.host;

var product_id = 1; // BTCUSD

// the amount to go below the bid and above the ask
var tick_increment = 0.01;

var trader = order_entry.build({
    exchange: 'bitfloor',

    // exchange specific
    protocol: 'rest',
    host: host,
    api_key: api_key,
    sec_key: sec_key,
    product_id: product_id,
});

// setup new l1 book for market data
var book = books.build({
    exchange: 'bitfloor',
    depth: 'L1',
    protocol: 'rest',
    host: host,
    product: product_id,
});

// previous orders for a given side
var previous = [];

book.on('changed', function(details) {
    var existing;

    var price = num(details.price);
    var size = 0.1;
    var side = details.side;

    if (side > 1) {
        console.error('unknown side in level: ' + details.side);
        return;
    }

    var existing = previous[side];

    switch (side) {
    case 0:
        if (existing && existing.price.gte(price)) {
            return;
        }
        price = price.sub(tick_increment);
        break;
    case 1:
        if (existing && existing.price.lte(price)) {
            return;
        }
        price = price.add(tick_increment);
        break;
    }

    // prices rounded to 2 decimal places
    price.set_precision(2);

    // place the new order
    function new_order() {

        // no need to place order if negative price
        if (price <= 0) {
            return;
        }

        // if there is no size, then don't try to place anything
        if (details.size === 0) {
            return;
        }

        var order = {
            product_id: product_id,
            size: size,
            price: price.toNumber(),
            // same side as the level update
            side: details.side,
        }

        trader.new_order(order, function(err, details) {
            if (err) {
                return console.error(err);
            }

            console.log('entered order [' + details.order_id + '] ' + size + ' @ ' + price);

            previous[side] = {
                order_id: details.order_id,
                product_id: order.product_id,
                price: price,
            };
        });
    }

    if (existing) {
        console.log('request cancel: ', existing.order_id);

        // if there is an existing order, cancel it
        trader.cancel_order(existing, function(err) {
            if (err) {
                return console.error(err);
            }
            console.log('cancelled order: ' + existing.order_id);

            // remove order from existing
            previous[side] = undefined;

            // ok to place new order since existing was cancelled
            new_order();
        });

        return;
    }

    // no existing order, run order placement
    new_order();
});

// cancel all our orders
function cancel_all(cb) {
    // TODO disable entering of new orders

    previous.forEach(function(order) {
        trader.cancel_order(order, function(err) {
            if (err) {
                console.error(err);
            }

            console.log('cancelled order: ' + order.order_id);
        });
    });

    // TODO better wait for responses
    setTimeout(function() {
        cb();
    }, 5000);
};

// terminate any outstanding orders
process.on('SIGTERM', function() {
    cancel_all(function() {
        process.exit();
    });
});

process.on('SIGINT', function() {
    cancel_all(function() {
        process.exit();
    });
});

