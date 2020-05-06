var BigInteger = require("jsbn");
var moment = require('moment');

var twepoch = 1288834974657;
var workerIdBits = 5;
var dataCenterIdBits = 5;
const MaxWorkerID = -1 ^ (-1 << workerIdBits);
const MaxDataCenterID = -1 ^ (-1 << dataCenterIdBits);
var sequenceBits = 12;
var workerIdShift = sequenceBits;
var dataCenterIdShift = sequenceBits + workerIdBits;
var timestampLeftShift = sequenceBits + workerIdBits + dataCenterIdBits;
var sequenceMask = -1 ^ (-1 << sequenceBits);
var lastTimestamp = -1;

class SnowFlake{
    constructor(workerID, dataCenterID, sequence) {
        this.workerID = workerID;
        this.dataCenterID = dataCenterID;
        this.sequence = 0;
        if(sequence){
            this.sequence = sequence;
        }
        if (this.workerID > MaxWorkerID || this.workerID < 0) {
            throw new Error('workID must max than 0 and small than maxWrokerId-[' +MaxWorkerID + ']');
        }
        if (this.dataCenterID > MaxDataCenterID || this.dataCenterID < 0) {
            throw new Error('config.data_center_id must max than 0 and small than maxDataCenterId-[' + MaxDataCenterID + ']');
        }
    }

    nextID(){
        var timestampGenerate = ()=>{return moment().unix();};
        var nextUniqTimestamp = (lastTimestamp)=>{
            var timestamp = timestampGenerate();
            while (timestamp <= lastTimestamp) {
                timestamp = timestampGenerate();
            }
            return timestamp;
        };

        var timestamp = timestampGenerate();
        if (lastTimestamp === timestamp) {
            this.sequence = (this.sequence + 1) & sequenceMask;
            if (this.sequence === 0) {
                timestamp = nextUniqTimestamp(lastTimestamp);
            }
        } else {
            this.sequence = 0;
        }
        if (timestamp < lastTimestamp) {
            throw new Error('Clock moved backwards. Refusing to generate id for ' + (lastTimestamp - timestamp));
        }

        lastTimestamp = timestamp;
        var shiftNum = (this.dataCenterID << dataCenterIdShift) | (this.workerID << workerIdShift) | this.sequence;
        var nfirst = new BigInteger.BigInteger(String(timestamp - twepoch), 10);
        nfirst = nfirst.shiftLeft(timestampLeftShift);
        var nnextId = nfirst.or(new BigInteger.BigInteger(String(shiftNum), 10));
        var nextId = nnextId.toRadix(10);
        nextId = Number(nextId)>>>0;
        return String(nextId);
    }
}

exports = module.exports = SnowFlake;

// snowflake.init = function (config) {
//     if (!isNaN(config.worker_id)) {
//         c_workerId = Number(config.worker_id);
//     }
//     if (!isNaN(config.data_center_id)) {
//         c_dataCenterId = Number(config.data_center_id);
//     }
//     if (!isNaN(config.sequence)) {
//         c_sequence = Number(config.sequence);
//     }
//     if (c_workerId > MaxWorkerID || c_workerId < 0) {
//         throw new Error('config.worker_id must max than 0 and small than maxWrokerId-[' +
//             MaxWorkerID + ']');
//     }
//     if (c_dataCenterId > MaxDataCenterID || c_dataCenterId < 0) {
//         throw new Error('config.data_center_id must max than 0 and small than maxDataCenterId-[' +
//             MaxDataCenterID + ']');
//     }
// };
//
// snowflake.nextId = function (workerId, dataCenterId, sequence) {
//     if (!isNaN(workerId)) {
//         workerId = Number(workerId);
//     } else {
//         workerId = c_workerId;
//     }
//     if (!isNaN(dataCenterId)) {
//         dataCenterId = Number(dataCenterId);
//     } else {
//         dataCenterId = c_dataCenterId;
//     }
//     if (!isNaN(sequence)) {
//         sequence = Number(sequence);
//     } else {
//         sequence = c_sequence;
//     }
//
//     if (workerId > MaxWorkerID || workerId < 0) {
//         throw new Error('workerId must max than 0 and small than maxWrokerId-[' +
//             MaxWorkerID + ']');
//     }
//     if (dataCenterId > MaxDataCenterID || dataCenterId < 0) {
//         throw new Error('dataCenterId must max than 0 and small than maxDataCenterId-[' +
//             MaxDataCenterID + ']');
//     }
//
//     var timestamp = timeGen();
//     if (lastTimestamp === timestamp) {
//         sequence = (sequence + 1) & sequenceMask;
//         if (sequence === 0) {
//             timestamp = tilNextMillis(lastTimestamp);
//         }
//     } else {
//         sequence = 0;
//     }
//     if (timestamp < lastTimestamp) {
//         throw new Error('Clock moved backwards. Refusing to generate id for ' +
//             (lastTimestamp - timestamp));
//     }
//
//     lastTimestamp = timestamp;
//     var shiftNum = (dataCenterId << dataCenterIdShift) |
//         (workerId << workerIdShift) | sequence;
//     var nfirst = new BigInteger(String(timestamp - twepoch), 10);
//     nfirst = nfirst.shiftLeft(timestampLeftShift);
//     var nnextId = nfirst.or(new BigInteger(String(shiftNum), 10));
//     var nextId = nnextId.toRadix(10);
//     return String(nextId);
// };
//
// function tilNextMillis(lastTimestamp) {
//     var timestamp = timeGen();
//     while (timestamp <= lastTimestamp) {
//         timestamp = timeGen();
//     }
//     return timestamp;
// }
//
// function timeGen() {
//     var dt = new Date();
//     return dt.getTime();
// }