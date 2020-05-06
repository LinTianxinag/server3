
var CRC = require('crc');
var _ = require('underscore');
var bases = require('bases');

function CRC_CCITT16(plain)
{
    var crc = 0xffff;
    var poly = 0x8408;

    for(var i = 0; i<plain.length; i+=2){
        var v = plain.substr(i, 2);
        v = parseInt(v, 16);

        // console.log(crc, v, crc ^ v);
        crc = crc ^ v;

        for(var j=0; j < 8; j++)
        {
            if ((crc & 0x0001) !=0 )
            {
                crc >>= 1;
                crc = crc^poly;
            }
            else
            {
                crc >>= 1;
            }
        }
    }

    return crc;
}

exports = module.exports = function(plain)
{
    var crc = CRC_CCITT16(plain);
    var crcCode = (~crc & 0xFFFF).toString(16).toUpperCase();
    return Driver.Padding(crcCode, 4);
};