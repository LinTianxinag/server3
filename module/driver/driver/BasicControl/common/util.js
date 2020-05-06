'use strict';

const fp = require('lodash/fp');

const createCommand = (addr, cmd) => {
    const body = `68${reverseAddr(addr)}68 1C 10 35 33 33 33 33 33 33 33 ${cmd} 33 33 33 33 34 34 CC`.replace(/\s+/g, '').toUpperCase();
    return `FEFEFEFE${body}${checkSumOf(body)}16`;
};

const reverseAddr = addr => Buffer.from(addr, 'hex').reverse().toString('hex')

const checkSumNumber = buffer => fp.sum([...Buffer.from(buffer, 'hex')]) %
  0x100;
const checkSumOf = buffer => fp.padCharsStart('0')(2)(
  checkSumNumber(buffer).toString(16).toUpperCase());

module.exports = {
    buildAddr(addrid) {
        return Driver.ToString( Driver.ToByteArray(
          Driver.Padding(Driver.ToHex(addrid), 8)
        ).reverse() );
    },
    createCommand
};