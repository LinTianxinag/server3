
var typedef = Driver.Load('/BasicControl/common/typedef');
var CRC = Driver.Load('/BasicControl/common/modbusCRC');
var _ = require('underscore');
var moment = require('moment');

var CRCLENGTH = 4;
var REGISTERBITS = 16;
const VALUE2SPEED = [
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
    this.funcCode = '10';
    var funcCode = this.funcCode;
    var baseAddr = 0x0DB8;
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
                value = '1111';
                break;
            case Driver.Command.EMC_OFF:
                value = '2222';
                break;
            case Driver.Command.EMC_FETCH:
                funcCode = '03';
                baseAddr = 0x0DBA;
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

        // var commandWord = deviceAddr + '000102' + value;
        // var CRCCode = CRC(commandWord);
        // var strCRCCode = Driver.ToString(Driver.ToByteArray(CRCCode).reverse());
        // commandWord += strCRCCode;

        var commandWord = BuildCommandWord(param.addrid, funcCode, baseAddr, offsetAddr, '000102', value);
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
    var baseAddr = 0x0DBA;
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
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_ON;
                    break;
                case '00000000':
                    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_OFF;
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
    Do: CommandSet[Driver.Command.EMC_SWITCH].Send,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: CommandSet[Driver.Command.EMC_SWITCH].StatusWriteBack
};
INSTRUCTIONMAPPING[Driver.Command.EMC_STATUS] = {
    Do: CommandSet[Driver.Command.EMC_STATUS].Send,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: null
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