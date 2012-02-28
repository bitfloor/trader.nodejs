var bitfloor = require('./order/bitfloor_rest');

module.exports.build = function(spec) {
    switch (spec.exchange) {
    case 'bitfloor':
        return bitfloor.create(spec);
    default:
        throw new Error('unknown exchange: ' + spec.exchange);
    }
};

