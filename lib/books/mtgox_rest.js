/// mtgox rest order book

var https = require('https');
var events = require('events');

// emits level_changed events
var L1RestBook = function(options) {
    var self = this;

    var host = options.host;
    var path = '/api/0/data/getDepth.php?Currency=USD' + options.product;

    var bid = {};
    var ask = {};

    function maybe_update(side, old_value, new_value) {
        var new_level = {
            price: new_value[0] - 0,
            size: new_value[1] - 0,
        };

        function emit(event) {
            old_value.price = new_level.price;
            old_value.size = new_level.size;
            self.emit(event, {
                side: side,
                price: old_value.price,
                size: old_value.size
            });
        };

        if (!old_value.price || !old_value.size) {
            if (new_value) {
                emit('changed');
            }
            return;
        }

        if (old_value.price !== new_level.price || old_value.size !== new_level.size) {
            emit('changed');
        }
    }

    function process_new_book(book) {
        maybe_update(0, bid, book.bids[book.bids.length - 1]);
        maybe_update(1, ask, book.asks[0]);
    }

    function refresh() {
        var options = {
            host: host,
            path: path,
            headers: {
                accept: 'application/json',
                'user-agent': 'nodejs',
            }
        };

        https.get(options, function(res) {
            var buff = '';
            res.setEncoding('utf8');
            res.on('data', function(chunk) {
                buff += chunk;
            });

            res.on('end', function() {
                var book = JSON.parse(buff);
                process_new_book(book);
            });

            res.on('error', function(err) {
                self.emit('error', err);
            });
        });
    };

    setInterval(refresh, options.refresh_interval || 1000);
};

L1RestBook.prototype = new events.EventEmitter();

module.exports.l1_book = function(options) {
    return new L1RestBook(options);
};

