/// simple market data bot
/// will print the top of the book as it changes

var books = require('..').books;

// create a new l1 book for an exchange
var book = books.build({
    exchange: 'bitfloor',
    depth: 'L1',
    protocol: 'rest',
    // the host is the base url, some exchanges have testing networks
    host: 'api.bitfloor.com',
    // bitfloor uses numeric product ids
    product: 1, //BTCUSD,
});

book.on('error', function(err) {
    console.error(err);
});

// the l1 book emits a 'changed' event when there is an update
book.on('changed', function(details) {
    // the details will contain a side, price, and size
    var side = (details.side === 0) ? 'BID' : 'ASK';
    console.log('bitfloor: ', side, details.size + '@' + details.price);
});

/// same as above except for mtgox now

var gox = books.build({
    exchange: 'mtgox',
    depth: 'L1',
    protocol: 'rest',
    host: 'mtgox.com',
    // specified per mtgox api v0
    product: 'USD',
});

gox.on('error', function(err) {
    console.error(err);
});

// the l1 book emits a 'changed' event when there is an update
gox.on('changed', function(details) {
    // the details will contain a side, price, and size
    var side = (details.side === 0) ? 'BID' : 'ASK';
    console.log('mtgox: ', side, details.size + '@' + details.price);
});

