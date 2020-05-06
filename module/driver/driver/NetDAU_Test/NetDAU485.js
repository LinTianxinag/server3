var config = require('config');
// var typedef = Driver.Load('/BasicControl/common/typedef');
var Driver =require('../../driver');
var CRC = Driver.Load('/BasicControl/common/modbusCRC');
var _ = require('underscore');
var moment = require('moment');

var signal = require('./common/signal');
var Message = require('./common/message');
var dataSaving = require('./common/dataSaving');

const startTag = 0x55aa55aa;
const endTag = 0x68681616;

const IDLE = 'idle';
const AUTH = 'auth';
const INIT = 'init';
const ONLINE = 'online';

/*
* MODBUS RTU
*   传感器地址 功能码 REGISTER基地址+偏移地址 寄存器个数 数值 CRC
* */
function BuildCommandWord(deviceAddr, funcCode, registerBase, registerOffset, registerNumber, value)
{
    //寄存器地址
    var registerAddr = registerBase + registerOffset;
    registerAddr = registerAddr.toString(16);
    registerAddr = Driver.Padding(registerAddr, 4, 'LEFT').toUpperCase();

    //仪表地址
    var deviceAddr = Number(deviceAddr).toString();
    deviceAddr = Driver.Padding(deviceAddr, 2, 'LEFT');

    //寄存器数量
    var regNumber = '';
    if(registerNumber) {
        regNumber = registerNumber.toString(16);
        regNumber = Driver.Padding(regNumber, 4, 'LEFT');
    }

    //数值
    //最长数据字节长度
    var data = '';
    if(value !== null && value !== undefined) {
        if( typeof(value) != 'string') {
            var rn = Number(regNumber || 1);
            var maxBytes = rn * REGISTERBITS / 8;
            //生成截取器
            var mask = Math.pow(2, (8 * maxBytes)) - 1;
            value = value & mask;
            value = value.toString(16);
            value = Driver.Padding(value, maxBytes * 2, 'LEFT');
            //data = Driver.Padding(maxBytes, 2, 'LEFT') + value;
            data = value;
        }
        else if(typeof(value) == 'string'){
            //var length = value.length/2;
            //length = Driver.Padding(length, 2, 'LEFT');
            data = value;
        }
    }

    var command = deviceAddr + funcCode + registerAddr + regNumber + data;
    var CRCCode = CRC(command);
    var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
    return command + strCRCCode;
}
function ParseCommandWord(commandWord)
{
    var deviceAddr = commandWord.substr(0, 2);

    commandWord = commandWord.substr(2);
    var crc = commandWord.substr(commandWord.length-CRCLENGTH);
    crc = Driver.ReverseBytes(crc);
    commandWord = commandWord.substr(0, commandWord.length - CRCLENGTH);

    var funcCode = commandWord.substr(0, 2);
    commandWord = commandWord.substr(2);

    return {
        deviceAddr: deviceAddr,
        funcCode: funcCode,
        data: commandWord,
        crc: crc
    };
}

function EMCSwitch()
{
    this.funcCode = '10';
    var funcCode = this.funcCode;
    var baseAddr = 0x0057;
    var offsetAddr = 0x0000;
    var registerNumber = 1;
    this.Send = function (ext, param)
    {
        if(!param.mode){
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
        }

        var value;
        switch(param.mode){
            case Driver.Command.EMC_ON:
                value = '0400010000';
                break;
            case Driver.Command.EMC_OFF:
                value = '0400010001';
                break;
            case Driver.Command.EMC_FETCH:
                funcCode = '03';
                baseAddr = 0x0100;
                offsetAddr = 0x0000;
                break;
            default:
                return {
                    code: ErrorCode.Code.COMMANDUNSUPPORT,
                    message: ErrorCode.Message.COMMANDUNSUPPORT
                };
        }
        var deviceAddr = Number(param.addrid).toString(16);
        deviceAddr = Driver.Padding(deviceAddr, 2, 'LEFT');

        var commandWord = deviceAddr + 'AA00570002' + value;
        var CRCCode = CRC(commandWord);
        var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
        commandWord += strCRCCode;

        // var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, null, value);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 100
            }
        };
    };
    this.Read = function (data, length) {
        var status = {};
        if(data && data.length) {
            var value = data.substr(4);
            switch(value){
                case '0000':
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_OFF;
                    break;
                case 'FF00':
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_ON;
                    break;
            }
        }
        return status;
    };
    this.StatusWriteBack = function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.switch.word] = parameter.switch;
        return {
            status: status
        }
    }
}

function EMCStatus(ext, param)
{
    this.funcCode = '03';
    var funcCode = this.funcCode;
    var baseAddr = 0x0058;
    var offsetAddr = 0x0000;
    var registerNumber = 2;
    this.Send = function (ext, param)
    {
        if(!param.mode){
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
        }

        // var deviceAddr = Number(param.addrid).toString(16);
        // deviceAddr = Driver.Padding(deviceAddr, 2, 'LEFT');
        //
        // var commandWord = deviceAddr + '0300580002';
        // var CRCCode = CRC(commandWord);
        // var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
        // commandWord += strCRCCode;

        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, registerNumber, null);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 100
            }
        };
    };
    this.Read = function (data, length) {
        var status = {};
        if(data && data.length && data.length == 10) {
            var value = data.substr(2);
            switch(value){
                case '00010000':
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_OFF;
                    break;
                case '00000000':
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_ON;
                    break;
            }
        }
        return status;
    };
}


var CommandSet = {};
CommandSet[Driver.Command.EMC_SWITCH] = new EMCSwitch();
CommandSet[Driver.Command.EMC_STATUS] = new EMCStatus();

//命令映射
var INSTRUCTIONMAPPING = {};
INSTRUCTIONMAPPING[Driver.Command.EMC_SWITCH] = {
    Do: CommandSet[Driver.Command.EMC_SWITCH].Send
};
INSTRUCTIONMAPPING[Driver.Command.EMC_STATUS] = {
    Do: CommandSet[Driver.Command.EMC_STATUS].Send
};

exports = module.exports = INSTRUCTIONMAPPING;

/*
 * 驱动信息
 * */
exports.DriverInfo = function()
{
    return {
    };
};
/*
 * 解析命令
 * */
exports.ParseInstruction = function (buildingid, gatewayid, meterid, command, origincommand)
{
    if(!command){
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result: {}
        };
    }
    var commandWord = ParseCommandWord(command);

    var encryptString = command.substr(0, command.length - CRCLENGTH);
    var calcCRC = CRC(encryptString);
    if(calcCRC !== commandWord.crc){
        return {
            code: ErrorCode.Code.DATACALIBRATERROR,
            message: ErrorCode.Message.DATACALIBRATERROR,
            result: {}
        };
    }

    var handler = CommandSet[origincommand.command];
    if(!handler){
        return {
            code: ErrorCode.Code.CONTROLCODEUNSUPPORT,
            message: ErrorCode.Message.CONTROLCODEUNSUPPORT,
            result: {}
        };
    }

    var ret = handler.Read(commandWord.data, commandWord.length);
    return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result: ret
    };
};

exports.TranslateValue = function (driverName, command, funcid, value)
{
    if(command){
        switch(command){
            case Driver.Command.EMC_WINDSPEED:
                if(value > VALUE2SPEED.length){
                    return value;
                }
                var windSpeed = VALUE2SPEED[value];
                if(!windSpeed){
                    return value;
                }
                return windSpeed.status;
                break;
            case Driver.Command.EMC_MODE:
                if(value > VALUE2MODE.length){
                    return value;
                }
                var mode = VALUE2MODE[value];
                if(!mode){
                    return value;
                }
                return mode.status;
                break;
        }
    }
    else if(funcid){
        switch(funcid){
            case '38':
                if(value > VALUE2SPEED.length){
                    return value;
                }
                var windSpeed = VALUE2SPEED[value];
                if(!windSpeed){
                    return value;
                }
                return windSpeed.status;
                break;
            case '39':
                if(value > VALUE2MODE.length){
                    return value;
                }
                var mode = VALUE2MODE[value];
                if(!mode){
                    return value;
                }
                return mode.status;
                break;
        }
    }

    return value;
};

function BuildControlCommandSets(commandSets)
{
    //
    var GenerateCommand = function (cmdTemplate, infoArray) {
        var infoStr = infoArray.toString();
        infoStr = infoStr.replace(/,/g, '');
        cmdTemplate = cmdTemplate.replace(/%INFO%/, infoStr);

        log.info('CommandWord: ', cmdTemplate);

        var ackMsg = Message();
        ackMsg.buildingID = commandSets.buildingid;
        ackMsg.gatewayid = commandSets.gatewayid;
        ackMsg.command = 'control';
        ackMsg.message = cmdTemplate;

        var buffer = signal.pack(ackMsg.Serilize());
        return buffer;
    };

    var CommandTemplate = '<?xml version="1.0" encoding="UTF-8" ?>'
        + '<root><common>'
        + '<building_id>%BUILDINGID%</building_id>'
        + '<gateway_id>%GATEWAYID%</gateway_id>'
        + '<type>control</type></common>'
        + '<instruction operation="control">'
        + '<control_info>%INFO%</control_info></instruction></root>';

    CommandTemplate = CommandTemplate.replace(/%BUILDINGID%/, commandSets.buildingid);
    CommandTemplate = CommandTemplate.replace(/%GATEWAYID%/, commandSets.gatewayid);

    var commandArray = [];
    var infoArray = [];
    var infoTemplate = '<control idx="%IDX%" meterId="%METERID%" delay="%DELAY%" timeout="200" retry="%RETRY%" size="%SIZE%" cmd="%CMD%"/>';
    _.each(commandSets.info, function (info) {
        //
        var iTemplate = infoTemplate;
        iTemplate = iTemplate.replace(/%IDX%/g, info.index.toString());
        iTemplate = iTemplate.replace(/%METERID%/g, parseInt(info.meterid));
        iTemplate = iTemplate.replace(/%DELAY%/g, parseInt(info.delay || 200));
        iTemplate = iTemplate.replace(/%RETRY%/g, parseInt(info.retry || 10));
        var commandSize = parseInt(info.command.length / 2);
        iTemplate = iTemplate.replace(/%SIZE%/g, commandSize.toString());
        iTemplate = iTemplate.replace(/%CMD%/g, info.command);
        // infoStr += iTemplate;
        infoArray.push(iTemplate);
        if(infoArray.length >= config.MaxControlIndex){
            commandArray.push( GenerateCommand(CommandTemplate, infoArray) );
            infoArray = [];
        }
    });
    if(infoArray.length){
        commandArray.push( GenerateCommand(CommandTemplate, infoArray) );
    }

    return commandArray;
}

function ReceiveCommand(buildingid, gatewayid, infos)
{
    _.each(infos, function (info) {
        var sequenceID = info.index;
        var storeObj = SequenceID.Get(sequenceID);
        var commandGUID = storeObj.commandguid || storeObj.id;
        var originCommand = storeObj.command;

        var meterID = GUID.Padding('meterid', info.meterid);
        var sensorID = buildingid + gatewayid + meterID;

        log.info('CommandAck: ', buildingid, gatewayid, info.meterid, sequenceID, commandGUID, info.err, info.data);

        if(config.dbswitch.mongodb) {
            var code = ErrorCode.Code.OK;
            switch(info.err) {
                case 'F0':
                    //正常
                    break;
                case 'F1':
                    //meterID相对应仪表未找到
                    code = ErrorCode.Code.DEVICENOTEXISTS;
                    break;
                case 'F2':
                    //仪表对应串口参数没有配置
                    code = ErrorCode.Code.SERIALCONFNOTEXISTS;
                    break;
                case 'F3':
                    code = ErrorCode.Code.DEVICETIMEOUT;
                    break;
            }

            if(storeObj.type == 'devicesync'){
                var returnData = Driver.ParseInstruction(storeObj.driver, buildingid, gatewayid, info.meterid, info.data, storeObj.command, storeObj.param);
                if(returnData.code){
                    log.error(returnData);
                    return;
                }

                var updateObj = {};
                _.map(returnData.result, function (value, key) {
                    updateObj['status.'+key] = value;
                });
                storeObj.response = updateObj;
                return MQ.OnAck(storeObj);
            }

            MongoDB.SensorAttribute
                .findOne({_id: sensorID})
                .exec(function (err, sensorAttribute) {
                    if(err || !sensorAttribute){
                        log.warn(sensorID, ' can not find or error: ', err);
                    }
                    else{
                        var returnData = Driver.ParseInstruction(sensorAttribute.driver, buildingid, gatewayid, info.meterid, info.data, originCommand, originCommand.param);
                        if(returnData.code){
                            log.error(returnData);
                            return;
                        }
                        var updateObj = {};
                        _.map(returnData.result, function (value, key) {
                            updateObj['status.'+key] = value;
                        });
                        log.info('CommandAck: ', sensorID, 'response', updateObj);

                        if(storeObj.callback == 'DIRECT'){
                            var answerObj = {
                                code: code,
                                result:{
                                    id: storeObj.id,
                                    apiAUID: storeObj.apiAUID,
                                    session: storeObj.session,
                                    data: returnData.result
                                }
                            };
                            var statusSync = Include('/libs/statusSync');
                            statusSync.Publish(answerObj);
                        }

                        MongoDB.SensorAttribute.update(
                            {_id: sensorID},
                            {$set: updateObj},
                            {}, function (err, doc) {
                                if(err){
                                    log.error('SensorAttribute Update Failed: ', err, sensorID, updateObj)
                                }
                            });
                    }
                });


            if(!storeObj.callback){
                MongoDB.SensorCommandQueue.update(
                    {_id: commandGUID},
                    {
                        $set: {
                            status: 'RSP',
                            code: code,
                            respdata: info.data || '',
                            timedone: moment().unix()
                        }
                    },
                    {},
                    function (err) {
                        if (err) {
                            log.error('SensorCommandQueue Update Error: ', err.message, commandGUID, info);
                        }
                        else {
                        }
                    }
                );
            }
        }
        else if(config.dbswitch.mysql){
            MySQL.SensorCommandQueue.create({
                status: 'REP',
                buildingid: buildingid,
                gatewayid: gatewayid,
                meterid: meterid,
                auid: AUID,
                command: info.command
            });
        }
    });
}

class NetDAU485 {
    constructor(sock) {
        this.seqNumber = undefined;
        this.address = sock.remoteAddress;
        this.port = sock.remotePort;
        this.sock = sock;
        this.status = IDLE;
        this.key = null;
    }

    write(data) {
        if (this.sock && !this.sock.destroyed) {
            var ret = this.sock.write(data, 'binary');
            return data.length;
        }
        log.error('socket destroyed: ', this.key);
        return 0;
    }

    clear() {
    }

    get ID() {
        return this.key;
    }

    static match(buffer) {
        var startPos = -1;
        var forcastStartPos = 0;
        var endPos = -1;
        var forcastEndPos = 0;
        while (forcastStartPos < buffer.length) {
            //定位包头
            while (forcastStartPos + 4 <= buffer.length) {
                if (buffer.readUInt32BE(forcastStartPos) == startTag) {
                    startPos = forcastStartPos;
                    break;
                }
                forcastStartPos++;
            }
            if (startPos == -1) {
                // log.error('无法定位包头', buffer.toString('hex'));
                return 0
            }

            // log.info('定位包头于: ', startPos, '-----------------');
            forcastEndPos = startPos;
            //定位包尾
            while (forcastEndPos + 4 <= buffer.length) {
                if (buffer.readUInt32BE(forcastEndPos) == endTag) {
                    endPos = forcastEndPos;
                    break;
                }
                forcastEndPos++;
            }
            if (endPos == -1) {
                return 0;
            }

            return {
                start: startPos + 4,
                end: endPos
            };

            // if(ismatch){
            //     return true;
            // }
            //
            // var data = buffer.slice(startPos+4, endPos);
            //
            // var msg = Message();
            // var length = msg.UnSerilize(data);
            // if(length == 0){
            //     //
            //     return 0;
            // }
            // //process msg
            // NetDau485.process(sock, msg);
            //
            // length = endPos+4;
            // forcastStartPos = length;
            // startPos = -1;
            // endPos = -1;
        }
    };

    parse(buffer) {
        var _this = this;
        var range = NetDAU485.match(buffer);
        if (!range) {
            return 0;
        }
        var data = buffer.slice(range.start, range.end);
        var msg = Message();
        var length = msg.UnSerilize(data);
        if (length == 0) {
            //
            return 0;
        }
        //process msg
        var param = this.process(msg);
        param.start = range.start - 4;
        param.end = range.end + 4;
        return param;
    }

    process(msg) {
        // log.debug('Command: ', msg.command);
        // log.debug(msg.message.toString());
        var _this = this;
        switch (msg.command) {
            case signal.REQUEST: {
                var seq = new signal.Sequence();
                seq.buildingID = msg.buildingID;
                seq.gatewayID = msg.gatewayID;
                _this.seqNumber = seq.seq;

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = seq.Serilize();

                var buffer = signal.pack(ackMsg.Serilize())

                _this.sock.write(buffer, 'binary');
                _this.status = AUTH;
            }
                break;
            case signal.SEQUENCEMD5: {
                if (_this.status != AUTH) {
                    break;
                }
                var seqMd5 = new signal.SequenceMD5();
                seqMd5.seq = _this.seqNumber;
                seqMd5.UnSerilize(msg.message);
                if (!seqMd5.isEqual) {
                    //
                    _this.status = IDLE;
                }

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = seqMd5.Serilize();

                var buffer = signal.pack(ackMsg.Serilize());

                _this.sock.write(buffer, 'binary');
            }
                break;
            case signal.DEVICEINFO: {
                if (_this.status != AUTH) {
                    break;
                }

                var devInfo = new signal.DeviceInfo();
                devInfo.UnSerilize(msg.message);

                var devInfoAck = new signal.DeviceInfoAck();

                devInfoAck.buildingID = msg.buildingID;
                devInfoAck.gatewayID = msg.gatewayID;

                this.key = `${msg.buildingID}${msg.gatewayID}`;

                log.info('DEVICEINFO: ', msg.buildingID + msg.gatewayID, devInfo.software, devInfo.ip);
                MongoDB.Collector.update(
                    {
                        _id: msg.buildingID + msg.gatewayID
                    }, {
                        $set: {
                            software: devInfo.software,
                            hardware: devInfo.hardware,
                            ip: devInfo.ip,
                            lastupdate: moment().unix()
                        }
                    }, {}, function (err) {
                        if (err) {
                            log.error(err, devInfo);
                        }
                    }
                );
                MongoDB.SensorAttribute.update(
                    {
                        _id: new RegExp(`${msg.buildingID}${msg.gatewayID}`)
                    }, {
                        $set: {
                            auid: AUID
                        }
                    }, {multi: true}, err => {
                        if (err) {
                            log.error(err, devInfo);
                        }
                    }
                );

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = devInfoAck.Serilize();

                var buffer = signal.pack(ackMsg.Serilize());

                _this.sock.write(buffer, 'binary');

                //发送archive请求进行传感器初始化
                {
                    var archives = new signal.Archives();
                    archives.buildingID = msg.buildingID;
                    archives.gatewayID = msg.gatewayID;

                    var archivesMsg = Message();
                    archivesMsg.Clone(msg);
                    archivesMsg.message = archives.Serilize();

                    var buffer = signal.pack(archivesMsg.Serilize());
                    _this.sock.write(buffer, 'binary');
                }
            }
                break;
            case signal.ARCHIVESACK: {
                if (_this.status != AUTH) {
                    break;
                }

                _this.status = INIT;

                var archives = new signal.Archives();
                var archivesInfo = archives.UnSerilize(msg.message);

                //不管自动初始化是否成功，数据还是需要接收的
                var autoInit = Include('/libs/autoInit');
                autoInit.Init(archivesInfo).then(
                    function (result) {
                        log.warn(_this.sock.remoteAddress + ':' + _this.sock.remotePort, 'ONLINE');
                        _this.status = ONLINE;
                    }, function (err) {
                        log.error(_this.sock.remoteAddress + ':' + _this.sock.remotePort, 'ONLINE');
                        _this.status = ONLINE;
                    }
                );
            }
                break;
            case signal.NOTIFY: {
                if (_this.status != ONLINE) {
                    break;
                }

                //update lastOperationTime/HeartBeat
                var notify = new signal.Notify();
                notify.UnSerilize(msg.message);
                //log.info('Notify: ', notify);

                var notifyAck = new signal.NotifyAck();
                notifyAck.buildingID = msg.buildingID;
                notifyAck.gatewayID = msg.gatewayID;

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = notifyAck.Serilize();
                //log.info('NotifyAck: ',ackMsg.message);

                MongoDB.Collector.update(
                    {
                        _id: msg.buildingID + msg.gatewayID
                    }, {
                        $set: {
                            lastupdate: moment().unix()
                        }
                    }, {}, function (err) {
                        if (err) {
                            log.error(err, devInfo);
                        }
                    }
                );

                var buffer = signal.pack(ackMsg.Serilize());
                _this.sock.write(buffer, 'binary');
            }
                break;
            case signal.CONTINUOUS: {
                if (_this.status != ONLINE) {
                    break;
                }

                var continuous = new signal.Continuous();
                //log.info(msg.message.toString());
                continuous.UnSerilize(msg.message);
                //log.info('Continuous: ', continuous);

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.command = continuous.command;
                ackMsg.message = continuous.Serilize();

                var buffer = signal.pack(ackMsg.Serilize());
                _this.sock.write(buffer, 'binary');

                dataSaving.Saving(msg.message.toString());
            }
                break;
            case signal.REPORT: {
                if (_this.status != ONLINE) {
                    break;
                }

                var report = new signal.Report();
                //log.info(msg.message.toString());
                report.UnSerilize(msg.message);
                //log.info('report: ', report);

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = report.Serilize();

                var buffer = signal.pack(ackMsg.Serilize());
                _this.sock.write(buffer, 'binary');

                dataSaving.Saving(msg.message.toString());
            }
                break;
            case signal.CONTROLACK: {
                //log.debug(msg.message.toString());

                var controlAck = new signal.ControlAck();
                controlAck.UnSerilize(msg.message);

                ReceiveCommand(controlAck.buildingID, controlAck.gatewayID, controlAck.infos);

                //_.each(controlAck.infos, function (info) {
                //    var newCommand = new MongoDB.SensorCommandQueue;
                //    newCommand.status = 'REP';
                //    newCommand.buildingid = controlAck.buildingID;
                //    newCommand.gatewayid = controlAck.gatewayID;
                //    newCommand.meterid = guid.Padding('meterID', info.meterid);
                //    newCommand.auid = AUID;
                //    newCommand.command = info.command;
                //
                //    newCommand.save(function(err){
                //        if(err){
                //            log.error('SensorCommandQueue Save Error: ', err);
                //        }
                //    });
                //});
            }
                break;
            // case signal.REPLY:
            // {
            //     if(status != ONLINE){
            //         return;
            //     }
            //
            //     var query = new signal.Query();
            //     //log.info(msg.message.toString());
            //     query.UnSerilize(msg.message);
            //     //log.info('report: ', report);
            //
            //     var statusSync = Include('/libs/statusSync');
            //     statusSync.Reply(msg.message);
            // }
            //     break;
        }

        return {};
    }

    send(commands) {
        var _this = this;
        if(!_.isArray(commands)){
            commands = [commands];
        }

        var commandRequest = {};
        commands.map(command=>{
            // log.info(command.buildingid, command.gatewayid, command.meterid, command.command, command.reqdata);
            var key = command.buildingid+command.gatewayid;
            if(!commandRequest[key]){
                commandRequest[key] = {
                    buildingid: command.buildingid,
                    gatewayid: command.gatewayid,
                    info: []
                };
            }

            var req = commandRequest[key];
            var cmdCache = new Widget.CommandCache(command);
            var seqID = SequenceID.Create(cmdCache);
            req.info.push({
                index: seqID,
                meterid: command.meterid,
                command: command.reqdata,
                retry: command.retry,
                delay: command.delay
            });
        });

        var commandArray = [];
        _.each(commandRequest, function(req){
            var vArray = BuildControlCommandSets(req);

            vArray.map(v=>{
                commandArray.push({
                    key:req.buildingid+req.gatewayid,
                    word: v
                });
            });
        });

        commandArray.map(v=>{
            _this.write(v.word);
        });

        // var sendIns = {
        //     buildingid: command.buildingid,
        //     gatewayid: command.gatewayid,
        //     info: []
        // };
        //
        // var cmdCache = new Widget.CommandCache(command);
        // var seqID = SequenceID.Create(cmdCache);
        // sendIns.info.push({
        //     index: seqID,
        //     meterid: command.meterid,
        //     command: command.reqdata,
        //     retry: command.retry
        // });
        //
        // var vArray = BuildControlCommandSets(sendIns);
        //
        // this.write(vArray[0]);
    };
}

exports.Match = (sock, buffer)=>{
    return NetDAU485.match(sock, buffer);
};
exports.Alloc = (sock)=>{
    return new NetDAU485(sock);
};
