var bitfloor = require('./order/bitfloor_rest');
var mtgox = require('./order/mtgox_rest');

module.exports.build = function(spec) {
    switch (spec.exchange) {
    case 'bitfloor':
        return bitfloor.create(spec);
    case 'mtgox':
        return mtgox.create(spec);
    default:
        throw new Error('unknown exchange: ' + spec.exchange);
    }
};

