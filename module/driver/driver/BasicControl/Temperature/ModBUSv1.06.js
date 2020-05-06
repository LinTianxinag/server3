
var typedef = Driver.Load('/BasicControl/common/typedef');
var CRC = Driver.Load('/BasicControl/common/modbusCRC');
var _ = require('underscore');
var moment = require('moment');

var CRCLENGTH = 4;
var REGISTERBITS = 16;

var VALUE2MODE = [
    {
        status: Driver.Command.EMC_COOLING,
        name: "制冷"
    },
    {
        status: Driver.Command.EMC_DEHUMIDIFYING,
        name: "除湿"
    },
    {
        status: Driver.Command.EMC_VERTILATING,
        name: "送风"
    },
    {
        status: Driver.Command.EMC_HEATING,
        name: "制热"
    }
];
var VALUE2SPEED = [
    {
        status: Driver.Command.EMC_LOW,
        name: "低档"
    },
    {
        status: Driver.Command.EMC_MEDIUM,
        name: "中档"
    },
    {
        status: Driver.Command.EMC_HIGH,
        name: "高档"
    },
    {
        status: Driver.Command.EMC_OFF,
        name: "关闭"
    }
];

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
    this.funcCode = '05';
    var funcCode = this.funcCode;
    var baseAddr = 0x0800;
    var offsetAddr = 0x0006;
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
                value = 'FF00';
                break;
            case Driver.Command.EMC_OFF:
                value = '0000';
                break;
            case Driver.Command.EMC_FETCH:
                funcCode = '01';
                baseAddr = 0x0000;
                offsetAddr = 0x0001;
                break;
            default:
                return {
                    code: ErrorCode.Code.COMMANDUNSUPPORT,
                    message: ErrorCode.Message.COMMANDUNSUPPORT
                };
        }
        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, null, value);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 3
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
        status[Driver.StatusWords.switch.word] = parameter.mode;
        return {
            status: status
        }
    }
}

function EMCWindSpeed()
{
    this.funcCode = '03';
    var funcCode = this.funcCode;
    var baseAddr = 0x2000;
    var offsetAddr = 0x0001;
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
            case Driver.Command.EMC_LOW:
                funcCode = '06';
                value = '0000';
                registerNumber = null;
                break;
            case Driver.Command.EMC_MEDIUM:
                funcCode = '06';
                value = '0001';
                registerNumber = null;
                break;
            case Driver.Command.EMC_HIGH:
                funcCode = '06';
                value = '0002';
                registerNumber = null;
                break;
            case Driver.Command.EMC_FETCH:
                break;
            default:
                return {
                    code: ErrorCode.Code.COMMANDUNSUPPORT,
                    message: ErrorCode.Message.COMMANDUNSUPPORT
                };
        }

        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, registerNumber, value);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 3
            }
        };
    };
    this.Read = function (data, length) {
        var status = {};
        switch(data){
            case '0000':
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_LOW;
                break;
            case '0001':
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_MEDIUM;
                break;
            case '0002':
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_HIGH;
                break;
            default:
                return {};
        }
        return  status;
    };
    this.StatusWriteBack =function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.windspeed.word] = parameter.mode;
        var channel = {};
        _.each(VALUE2SPEED, function (windspeed, index) {
            if( windspeed.status == parameter.mode) {
                channel['38'] = index;
                return true;
            }
            return false;
        });

        return {
            channel: channel,
            status: status
        }
    };
}

function EMCMode()
{
    this.funcCode = '03';
    var funcCode = this.funcCode;
    var baseAddr = 0x2000;
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
            case Driver.Command.EMC_COOLING:
                funcCode = '06';
                value = '0000';
                registerNumber = null;
                break;
            case Driver.Command.EMC_DEHUMIDIFYING:
                funcCode = '06';
                value = '0001';
                registerNumber = null;
                break;
            case Driver.Command.EMC_VERTILATING:
                funcCode = '06';
                value = '0002';
                registerNumber = null;
                break;
            case Driver.Command.EMC_HEATING:
                funcCode = '06';
                value = '0003';
                registerNumber = null;
                break;
            case Driver.Command.EMC_HIGH:
                funcCode = '06';
                value = '0002';
                registerNumber = null;
                break;
            case Driver.Command.EMC_FETCH:
                break;
            default:
                return {
                    code: ErrorCode.Code.COMMANDUNSUPPORT,
                    message: ErrorCode.Message.COMMANDUNSUPPORT
                };
        }

        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, registerNumber, value);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 3
            }
        };
    };
    this.Read = function (data, length) {
        var status = {};
        var mode = data.substr(4);
        switch(mode){
            case '0000':
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_COOLING;
                break;
            case '0001':
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_DEHUMIDIFYING;
                break;
            case '0002':
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_VERTILATING;
                break;
            case '0003':
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_HEATING;
                break;
            default:
                break;
        }
        return status;
    };
    this.StatusWriteBack =function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.mode.word] = parameter.mode;
        var channel = {};
        _.each(VALUE2MODE, function (mode, index) {
            if( mode.status == parameter.mode) {
                channel['39'] = index;
                return true;
            }
            return false;
        });

        return {
            channel: channel,
            status: status
        }
    };
}

function EMCTemprature()
{
    this.funcCode = '03';
    var funcCode = this.funcCode;
    var baseAddr = 0x2000;
    var offsetAddr = 0x0003;
    var registerNumber = 1;

    this.Send = function (ext, param)
    {
        if(param.value){
            //
            funcCode = '06';
            var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, null, param.value);
            return {
                code: ErrorCode.Code.OK,
                message: ErrorCode.Message.OK,
                result:{
                    reqdata: commandWord,
                    retry: 3
                }
            };
        }
        else if(param.mode){
            funcCode = '03';
            var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, registerNumber);
            return {
                code: ErrorCode.Code.OK,
                message: ErrorCode.Message.OK,
                result:{
                    reqdata: commandWord,
                    retry: 3
                }
            };
        }

        return {
            code: ErrorCode.Code.PARAMETERMISSED,
            message: ErrorCode.Message.PARAMETERMISSED
        };
    };
    this.Read = function (data, length) {
        var status = {};
        if(data && data.length) {
            var value = data.substr(2);
            if (value && value.length) {
                value = parseInt(value, 16);
                status[Driver.StatusWords.temperature.word] = value;
            }
        }

        return status;
    };
    this.StatusWriteBack =function (ext, parameter) {
        var channel = {};
        channel['37'] = parameter.value;
        return {
            channel: channel
        }
    };
}

function EMCLock()
{
    this.funcCode = '05';
    var funcCode = this.funcCode;
    var baseAddr = 0x0800;
    var offsetAddr = 0x000B;
    var registerNumber = 1;
    this.Send = function (ext, param)
    {
        if(!param.mode){
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
        }

        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, registerNumber);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 3
            }
        };

        var value;
        switch(param.mode){
            case Driver.Command.EMC_ON:
                value = '0000';
                break;
            case Driver.Command.EMC_OFF:
                value = 'FF00';
                break;
            default:
                return {
                    code: ErrorCode.Code.COMMANDUNSUPPORT,
                    message: ErrorCode.Message.COMMANDUNSUPPORT
                };
        }
        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, null, value);
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 3
            }
        };
    };
    this.Read = function (data, length) {
    };
    this.StatusWriteBack =function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.lock.word] = parameter.mode;
        return {
            status: status
        };
    };
}

var CommandSet = {};
CommandSet[Driver.Command.EMC_SWITCH] = new EMCSwitch();
CommandSet[Driver.Command.EMC_WINDSPEED] = new EMCWindSpeed();
CommandSet[Driver.Command.EMC_MODE] = new EMCMode();
CommandSet[Driver.Command.EMC_TEMPERATURE] = new EMCTemprature();
CommandSet[Driver.Command.EMC_LOCK] = new EMCLock();


//命令映射
var INSTRUCTIONMAPPING = {};
INSTRUCTIONMAPPING[Driver.Command.EMC_SWITCH] = {
    Do: CommandSet[Driver.Command.EMC_SWITCH].Send,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_SWITCH].StatusWriteBack
};
INSTRUCTIONMAPPING[Driver.Command.EMC_WINDSPEED] = {
    Do: CommandSet[Driver.Command.EMC_WINDSPEED].Send,
    Channels: ['38'],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_WINDSPEED].StatusWriteBack
};
INSTRUCTIONMAPPING[Driver.Command.EMC_MODE] = {
    Do: CommandSet[Driver.Command.EMC_MODE].Send,
    Channels: ['39'],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_MODE].StatusWriteBack
};
INSTRUCTIONMAPPING[Driver.Command.EMC_TEMPERATURE] = {
    Do: CommandSet[Driver.Command.EMC_TEMPERATURE].Send,
    Channels: ['37'],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_TEMPERATURE].StatusWriteBack
};
INSTRUCTIONMAPPING[Driver.Command.EMC_LOCK] = {
    Do: CommandSet[Driver.Command.EMC_LOCK].Send,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_LOCK].StatusWriteBack
};

//适用型号
var ADAPTDEVICE = {
    ACM:{
        code: '20',
        desc: '中央空调热能表ACM'
    },
    UHM:{
        code: '28',
        desc: '超声波热量表UHM'
    },
    GUM:{
        code: '29',
        desc: '阀控超声波表'
    }
};

exports = module.exports = INSTRUCTIONMAPPING;

function ParseNumber(value, indicateExtendValue)
{
    value = Driver.ReverseBytes(value);

    var flagMask = '0x' + Driver.Padding('80', value.length, 'RIGHT', '0');
    var dataMask = '0x' + Driver.Padding('7F', value.length, 'RIGHT', 'F');
    var offset = Math.pow(2, value.length) -1;

    var extendFactor = (parseInt(value, 16) & parseInt(flagMask, 16)) >> offset;
    value = parseInt(value, 16) & dataMask;   //过滤掉最高位

    var extendValue;
    if(indicateExtendValue){
        extendValue = indicateExtendValue;
    }
    else {
        extendValue = extendFactor ? 100 : 10;
    }

    value /= extendValue;
    return value;
}

/*
 * 驱动信息
 * */
exports.DriverInfo = function()
{
    return {
        adaptdevice: ADAPTDEVICE
    };
};
/*
 * 解析命令
 * */
exports.ParseInstruction = function (buildingid, gatewayid, meterid, command, origincommand, param)
{
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

//控制码处理

//获取状态
function EMCViewStatus(ext, param)
{
    //
    var emcSwitch = new EMCSwitch();
    var commandWord = emcSwitch.Send(param.addrid);
    return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result:{
            reqdata: commandWord,
            retry: 3
        }
    };

    return;

    var deviceAddr = Number(param.addrid).toString();
    deviceAddr = Driver.Padding(deviceAddr, 2, 'LEFT');

    var functionID = '04';
    var base = 1000;
    var offset = 0;
    var physics = base + offset;

    var command = deviceAddr + functionID + physics + '0001';
    var CRCCode = CRC(command);
    var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
    return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result:{
            reqdata: command + strCRCCode,
            retry: 3
        }
    };


    var command = '20'; //读刻度数据
    var deviceAddr = Driver.ToHex(param.addrid);
    deviceAddr = Driver.ToByteArray(deviceAddr);
    deviceAddr = deviceAddr.reverse();
    deviceAddr = Driver.ToString(deviceAddr);
    deviceAddr = Driver.Padding(deviceAddr, 8, 'RIGHT');
    var adaptDevice = ext.adaptdevice;
    if(!adaptDevice){
        return {
            code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
            message: ErrorCode.Message.DEVICETYPEUNSUPPORT
        };
    }
    var addrRegion = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice;
    var dataLen = '00';

    var plainCommand = addrRegion + command + dataLen;
    var CRCCode = CRC(plainCommand);
    var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
    return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result:{
            reqdata: plainCommand + strCRCCode,
            retry: 60
        }
    };
}