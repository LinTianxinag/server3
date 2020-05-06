var typedef = Driver.Load('/BasicControl/common/typedef');
var CRC = Driver.Load('/BasicControl/common/crc');
var _ = require('underscore');
var moment = require('moment');
const util = Driver.Load('//BasicControl/common/util');

var FMU = '00';
//帧格式定义
var LengthOfCSCode = 4; //CS校验长度

//命令映射
var INSTRUCTIONMAPPING = {};
INSTRUCTIONMAPPING[Driver.Command.EMC_STATUS] = {
    Do: EMCViewStatus,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: function (ext, parameter) {
    }
};
INSTRUCTIONMAPPING[Driver.Command.EMC_WINDSPEED] = {
    Do: EMCWindSpeed,
    Channels: ['38'],
    StatusWords: [Driver.StatusWords.windspeed.word],
    StatusWriteBack: function (ext, parameter) {
        var channel = {};
        channel['38'] = parameter.value;
        return {
            channel: channel
        }
    }
};
INSTRUCTIONMAPPING[Driver.Command.EMC_MODE] = {
    Do: EMCCHMode,
    Channels: [],
    StatusWords: [Driver.StatusWords.mode.word],
    StatusWriteBack: function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.mode.word] = parameter.mode;
        return {
            status: status
        }
    }
};
INSTRUCTIONMAPPING[Driver.Command.EMC_SWITCH] = {
    Do: EMCSwitch,
    Channels: [],
    StatusWords: [Driver.StatusWords.switch.word],
    StatusWriteBack: function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.switch.word] = parameter.mode;
        return {
            status: status
        }
    }
};
INSTRUCTIONMAPPING[Driver.Command.EMC_VALVE] = {
    Do: EMCVALVE,
    Channels: [],
    StatusWords: [Driver.StatusWords.valve.word],
    StatusWriteBack: function (ext, parameter) {
        var status = {};
        status[Driver.StatusWords.valve.word] = parameter.mode;
        return {
            status: status
        }
    }
};
// INSTRUCTIONMAPPING[Driver.Command.EMC_TIME] = {
//     Do: EMCTime,
//     Channels: [],
//     StatusWords: [],
//     StatusWriteBack: function (ext, parameter) {
//         return {};
//     }
// };
INSTRUCTIONMAPPING[Driver.Command.EMC_TEMPERATURE] = {
    Do: EMCTemperature,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: function (ext, parameter) {
        return {};
    }
};INSTRUCTIONMAPPING[Driver.Command.EMC_ENERGYPARAM] = {
    Do: EMCEnergyParam,
    Channels: [],
    StatusWords: [],
    StatusWriteBack: function (ext, parameter) {
        return {};
    }
};


//适用型号
var ADAPTDEVICE = {
    TMR:{
        code: '24',
        desc: '时间采集器'
    }
};

exports = module.exports = INSTRUCTIONMAPPING;

function toNumber(value) {
    var hex = Driver.ReverseBytes(value);
    return parseInt(hex, 16);
}

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

//变量代号
var Variable = {
    'Switch': {
        key: 'switch',
        code: '10',
        place: 1,
        desc: '开关阀',
        mode: {
            on: '55',
            off: '99'
        },
        Read: function(data)
        {
            //
        },
        Switch: function(flag)
        {
            var swh = Variable.Switch;
            if(flag == Driver.Command.EMC_ON){
                return swh.code + swh.mode.on;
            }
            else if(flag == Driver.Command.EMC_OFF){
                return swh.code + swh.mode.off;
            }
        },
        Status: function(data)
        {
            var swh = Variable.Switch;
            var command = Driver.Read(data, swh.place);
            return command;
        }
    },
    'VALVE':{
        key: 'valve',
        code: '10',
        place: 1,
        desc: '阀门开关',
        mode: {
            on: '55',
            off: '99'
        },
        Switch: function (flag) {
            var swh = Variable.VALVE;
            if(flag == Driver.Command.EMC_ON){
                return swh.code + swh.mode.on;
            }
            else if(flag == Driver.Command.EMC_OFF){
                return swh.code + swh.mode.off;
            }
        }
    },
    'WorkMode':{
        key: 'chmod',
        code: '14',
        Place: function (highPositionFlag) {
            return 1;
        },
        desc: '制冷/制热类型',
        mode:{
            cooling: '4B',
            heating: '4C',
            dehumidifying: '02',
            vertilating: '01'
        },
        SwitchMode: function(workmode)
        {
            var wm = Variable.WorkMode;

            var modeV;
            switch(workmode){
                case Driver.Command.EMC_COOLING:
                    modeV = wm.mode.cooling;
                    break;
                case Driver.Command.EMC_HEATING:
                    modeV = wm.mode.heating;
                    break;
                case Driver.Command.EMC_DEHUMIDIFYING:
                    modeV = wm.mode.dehumidifying;
                    break;
                case Driver.Command.EMC_VERTILATING:
                    modeV = wm.mode.vertilating;
                    break;
            }

            // return '1C00'+wm.code + modeV;
            return wm.code + modeV;
        }
    },
    'WindSpeed':{
        key: 'chmod',
        code: '1D',
        Place: function (highPositionFlag) {
            return 1;
        },
        desc: '盘管风机档位',
        mode:{
            low: '00',
            medium: '01',
            high: '02',
            close: '03'
        },
        SwitchSpeed: function(speed)
        {
            var spd = Variable.WindSpeed;

            var modeV;
            switch(speed){
                case Driver.Command.EMC_LOW:
                    modeV = spd.mode.low;
                    break;
                case Driver.Command.EMC_MEDIUM:
                    modeV = spd.mode.medium;
                    break;
                case Driver.Command.EMC_HIGH:
                    modeV = spd.mode.high;
                    break;
            }

            return spd.code + modeV;
        }
    },
    'Temperature':{
        key: 'temperature',
        code: '8A',
        Place: function (highPositionFlag) {
            return 1;
        },
        desc: '温度设定',
        mode:{},
        SetTemperature: function(temp)
        {
            var temperatureVar = Variable.Temperature;
            var temperatureHex = Driver.Padding(temp.toString(16), 2);
            return '1CFF'+temperatureVar.code + temperatureHex;
        }
    },
    'Time':{
        key: 'time',
        code: '01',
        Place: function (highPositionFlag) {
            return 8;
        },
        desc: '时间',
        Read: function (data) {
            if(!data || !data.length){
                return null;
            }
            var timeStr = data.substr(0, Variable.Time.Place()*2);
            var time = moment();
            //seconds
            {
                time.second( parseInt(timeStr.substr(0, 2)) );
                timeStr = timeStr.substr(2);
            }
            //minutes
            {
                time.minute( parseInt(timeStr.substr(0, 2)) );
                timeStr = timeStr.substr(2);
            }
            //hours
            {
                time.hour( parseInt(timeStr.substr(0, 2)) );
                timeStr = timeStr.substr(2);
            }
            //Date
            {
                time.date( parseInt(timeStr.substr(0, 2)) );
                timeStr = timeStr.substr(2);
            }
            //Month
            {
                time.month( parseInt(timeStr.substr(0, 2)) );
                timeStr = timeStr.substr(2);
            }
            //year
            {
                var lowpart = parseInt(timeStr.substr(0, 2));
                timeStr = timeStr.substr(2);
                var highpart = parseInt(timeStr.substr(0, 2));
                var year = highpart * 100+lowpart;
                time.year(year);
            }

            return time;
        },
        Sync: function (data){
            var tm = Variable.Time;

            var nowTime = moment();
            var timeStr = nowTime.format('ssmmHHDDMM')
                + Driver.ReverseBytes(nowTime.format('YYYY'))
                + Driver.Padding( nowTime.format('E'), 2 );
            var commandWord = '25' + '09' + '01' + timeStr;
            return commandWord;
        }
    },
    'Status':{
        key: 'status',
        code: '56',
        Place: function (highPositionFlag) {
            return 4;
        },
        desc: '状态',
        Read: function (data) {
            if(!data || !data.length){
                return null;
            }

            return 0;
        }
    },
    'EnergyParam':{
        key: 'energyparam',
        code: '',
        Place: function (highPositionFlag) {
            return 4;
        },
        desc: '能量系数',
        Write: function (param) {
            if(!param || _.isEmpty(param)){
                return null;
            }

            var commandWord = '';
            _.map(param, function (v, k) {
                switch(k){
                    case Driver.Command.EMC_LOW:
                        v *= 100;
                        commandWord += '5F'+Driver.ReverseBytes( Driver.Padding(v.toString(16), 8, 'LEFT') );
                        break;
                    case Driver.Command.EMC_MEDIUM:
                        v *= 100;
                        commandWord += '60'+Driver.ReverseBytes( Driver.Padding(v.toString(16), 8, 'LEFT') );
                        break;
                    case Driver.Command.EMC_HIGH:
                        v *= 100;
                        commandWord += '61'+Driver.ReverseBytes( Driver.Padding(v.toString(16), 8, 'LEFT') );
                        break;
                }
            });

            return commandWord;
        },
        Parse: function (data)
        {
            var value = Driver.ReverseBytes(data);
            value = parseInt(value, 16) / 100;
            return value;
        },
    }
};
function LookupByCode(code)
{
    return _.find(Variable, function (v) {
        if(v.code === code){
            return v;
        }
    });
}
var StatusWord = {
    '01': { //时间
        word: Driver.StatusWords.time.word,
        Read: function(data){
            var timestr = data.substr(0, 16);
            var time = Driver.ReverseBytes(timestr.substr(0,14));
            return {
                value: time,
                length: timestr.length
            }
        }
    },
    '1B':{  //制冷温差阀值
        word: Driver.StatusWords.ac_td_threshold.word,
        Read: data=>{
            var value = data.substr(0, 2);
            value = toNumber(value) * 10;
            return {
                value: value,
                length: 2
            }
        }
    },
    '22':{  //采暖阀值
        word: Driver.StatusWords.heating_threshold.word,
        Read: data=>{
            var value = data.substr(0, 4);
            value = toNumber(value) * 10;
            return {
                value: value,
                length: 4
            }
        }
    },
    '23':{  //空调阀值
        word: Driver.StatusWords.ac_threshold.word,
        Read: data=>{
            var value = data.substr(0, 4);
            value = toNumber(value) * 10;
            return {
                value: value,
                length: 4
            }
        }
    },
    '24':{
        Read: data=>{
            var value = data.substr(0, 4);
            return {
                value: value,
                length: 4
            }
        }
    },
    '25':{
        Read: data=>{
            var value = data.substr(0, 4);
            return {
                value: value,
                length: 4
            }
        }
    },
    '29':{
        Read: data=>{
            var value = data.substr(0, 4);
            return {
                value: value,
                length: 4
            }
        }
    },
    '2A':{  //
        Read: data=>{
            var value = data.substr(0, 4);
            return {
                value: value,
                length: 4
            }
        }
    },
    '2B':{  //
        Read: data=>{
            var value = data.substr(0, 4);
            return {
                value: value,
                length: 4
            }
        }
    },
    '2F':{  //最小有效流量设置
        word: Driver.StatusWords.mineff_flow.word,
        Read: data=>{
            var value = data.substr(0, 2);
            return {
                value: value,
                length: 2
            }
        }
    },
    '30':{  //冷效率
        word: Driver.StatusWords.cold_efficient.word,
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: toNumber(v),
                length: 4
            }
        }
    },
    '31':{  //热效率
        word: Driver.StatusWords.hot_efficient.word,
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: toNumber(v),
                length: 4
            }
        }
    },
    '32':{
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: v,
                length: 4
            }
        }
    },
    '33':{
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: v,
                length: 4
            }
        }
    },
    '34':{
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: v,
                length: 4
            }
        }
    },
    '3A':{
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: v,
                length: 4
            }
        }
    },
    '36':{
        Read: data=>{
            var v = data.substr(0, 4);
            return {
                value: v,
                length: 4
            }
        }
    },
    '4C':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CC01':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CC02':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CC03':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CC04':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    '4B':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CB01':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CB02':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CB03':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    'CB04':{
        Read: (data)=>{
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    '50':{
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    '51':{
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: value,
                length: 8
            }
        }
    },
    '5D':{  //总能量系数
        word: Driver.StatusWords.energycoefficient.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = toNumber(value)/100;
            return {
                value: value,
                length: 8
            }
        }
    },
    '62':{  //低档能量系数
        word: Driver.StatusWords.energyparam_low.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = toNumber(value)/100;
            return {
                value: value,
                length: 8
            }
        }
    },
    '63':{  //中档能量系数
        word: Driver.StatusWords.energyparam_medium.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = toNumber(value)/100;
            return {
                value: value,
                length: 8
            }
        }
    },
    '64':{  //高档能量系数
        word: Driver.StatusWords.energyparam_high.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = toNumber(value)/100;
            return {
                value: value,
                length: 8
            }
        }
    },
    'DD01': {
        word: Driver.StatusWords.dd_section_1.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: toNumber(value) / 100,
                length: 8
            };
        }
    },
    'DD02': {
        word: Driver.StatusWords.dd_section_2.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: toNumber(value) / 100,
                length: 8
            };
        }
    },
    'DD03': {
        word: Driver.StatusWords.dd_section_3.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: toNumber(value) / 100,
                length: 8
            };
        }
    },
    'DD04': {
        word: Driver.StatusWords.dd_section_4.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            return {
                value: toNumber(value) / 100,
                length: 8
            };
        }
    },
    '3E':{
        funcid: 40,
        word: Driver.StatusWords.inroomtemperature.word,
        Read: function (data) {
            var roomTemperature = data.substr(0, 4);
            roomTemperature = toNumber(roomTemperature)/10;
            return {
                value: roomTemperature,
                length: 4
            }
        }
    },
    '8A':{  //设置温度
        funcid: 37,
        word: Driver.StatusWords.temperature.word,
        Read: function (data) {
            var setTemperature = data.substr(0, 2);
            setTemperature = toNumber(setTemperature);
            return {
                value: setTemperature,
                length: 2
            }
        }
    },
    '11':{
        Read: function (data) {
            var v = data.substr(0, 2);
            return {
                value: v,
                length: 2
            }
        }
    },
    '15':{
        Read: function (data) {
            var v = data.substr(0, 2);
            return {
                value: v,
                length: 2
            }
        }
    },
    '17':{
        Read: function (data) {
            var v = data.substr(0, 2);
            return {
                value: v,
                length: 2
            }
        }
    },
    '19':{
        Read: function (data) {
            var v = data.substr(0, 2);
            return {
                value: v,
                length: 2
            }
        }
    },
    '12':{
        word: Driver.StatusWords.alert_status.word,
        Read: data=>{
            var alertStatus = data.substr(0, 2);
            var status = Driver.Command.EMC_MASK;
            switch(alertStatus){
                case 'FF':
                    status = Driver.Command.EMC_OPEN;
                    break;
                default:
                    status = Driver.Command.EMC_MASK;
                    break;
            }

            return {
                value: status,
                length: 2
            };
        }
    },
    '13':{  //风机盘管检测设置
        Read: data=>{
            var fcStatus = data.substr(0, 2);
            var status = Driver.Command.EMC_MASK;
            switch(fcStatus){
                case 'FF':
                    status = Driver.Command.EMC_OPEN;
                    break;
                default:
                    status = Driver.Command.EMC_MASK;
                    break;
            }

            return {
                value: status,
                length: 2
            };
        }
    },
    '14':{  //工作模式
        word: Driver.StatusWords.mode.word,
        funcid: 39,
        Read: function (data) {
            var workMode = parseInt( data.substr(0, 2), 16);
            var mode;
            switch(workMode){
                case 75:
                    mode = Driver.Command.EMC_COOLING;
                    break;
                case 76:
                    mode = Driver.Command.EMC_HEATING;
                    break;
                case 1:
                    mode = Driver.Command.EMC_VERTILATING;
                    break;
                case 2:
                    mode = Driver.Command.EMC_DEHUMIDIFYING;
                    break;
            }
            return {
                value: mode,
                length: 2
            }
        }
    },
    '10':{  //阀门控制
        // word: Driver.StatusWords.valve.word,
        Read: function (data) {

            var switchStatus = data.substr(0, 2);
            var status = Driver.Command.EMC_ON;
            if(switchStatus == '55'){
                status = Driver.Command.EMC_ON;
            }
            else if(switchStatus == '99'){
                status = Driver.Command.EMC_OFF;
            }
            return {
                value: status,
                length: 2
            }
        }
    },
    '1A':{
        Read: data=>{
            return {
                value: data.substr(0, 2),
                length: 2
            }
        }
    },
    '1C':{  //盘管机档位检测
        word: Driver.StatusWords.fan_gearstatus.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            switch(value){
                case '00':
                    value = Driver.Command.EMC_REMOTE;
                    break;
                case 'FF':
                    value = Driver.Command.EMC_LOCAL;
                    break;
            }
            return {
                value: value,
                length: 2
            }
        }
    },
    '1D':{  //盘管风机档位
        // word: Driver.StatusWords.windspeed.word,
        funcid: 38,
        Read: function (data) {
            var level = Driver.Command.EMC_NONE;
            switch(data.substr(0, 2)){
                case '00':
                    level = Driver.Command.EMC_LOW;
                    break;
                case '01':
                    level = Driver.Command.EMC_MEDIUM;
                    break;
                case '02':
                    level = Driver.Command.EMC_HIGH;
                    break;
                case '03':
                    level = Driver.Command.EMC_OFF;
                    break;
            }
            return {
                value: level,
                length: 2
            }
        }
    },
    '9A':{  //设定温控模式:本地
        word: Driver.StatusWords.mode_temperatureset.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            switch(value){
                case '00':
                    value = Driver.Command.EMC_REMOTE;
                    break;
                case 'FF':
                    value = Driver.Command.EMC_LOCAL;
                    break;
            }
            return {
                value: value,
                length: 2
            }
        }
    },
    '9B':{  //阀门开关模式:本地
        word: Driver.StatusWords.mode_valveswitch.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            switch(value){
                case '00':
                    value = Driver.Command.EMC_REMOTE;
                    break;
                case 'FF':
                    value = Driver.Command.EMC_LOCAL;
                    break;
            }
            return {
                value: value,
                length: 2
            }
        }
    },
    '9C':{  //面板开关状态
        word: Driver.StatusWords.switch.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            var status = Driver.Command.EMC_OFF;
            if(value == '01'){
                status = Driver.Command.EMC_ON;
            }
            else if(value == '00'){
                status = Driver.Command.EMC_OFF;
            }
            return {
                value: status,
                length: 2
            }
        }
    },
    '9D':{  //面板锁定状态
        word: Driver.StatusWords.panel_lockstatus.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            var status = Driver.Command.EMC_OFF;
            if(value == '01'){
                status = Driver.Command.EMC_ON;
            }
            else if(value == '00'){
                status = Driver.Command.EMC_OFF;
            }
            return {
                value: status,
                length: 2
            }
        }
    },
    '56':{  //状态
        Parse: (value)=>{
            var status = {};
            if(value & 0x8){
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_OFF;
            }
            else if(value & 0x10){
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_LOW;
            }
            else if(value & 0x20){
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_MEDIUM;
            }
            else if(value & 0x40){
                status[Driver.StatusWords.windspeed.word] = Driver.Command.EMC_HIGH;
            }

            if(value & 0x1){
                status[Driver.StatusWords.valve.word] = Driver.Command.EMC_ON;
            }
            else if(value & 0x2){
                status[Driver.StatusWords.valve.word] = Driver.Command.EMC_OFF;
            }
            else if(value & 0x4){
                status[Driver.StatusWords.valve.word] = Driver.Command.EMC_EXCPTION;
            }

            return status;
        },
        Read: function (data) {
            var value = data.substr(0, 8);
            var first = parseInt( value.substr(0, 2), 16 );
            var status = StatusWord['56'].Parse(first);
            return {
                value: status,
                length: 8
            }
        }
    },
    '58':{  //综合冷系数
        word: Driver.StatusWords.synthesize_cold.word,
        Read: (data)=>{
            var value = data.substr(0, 8);
            value = toNumber(value) / 1000;
            return {
                value: value,
                length: 8
            }
        }
    },
    '5C':{  //综合热系数
        word: Driver.StatusWords.synthesize_hot.word,
        Read: (data)=>{
            var value = data.substr(0, 8);
            value = toNumber(value) / 1000;
            return {
                value: value,
                length: 8
            }
        }
    },
    '59':{
        word: Driver.StatusWords.airflow_low.word,
        Read: (data)=>{
            var value = data.substr(0, 8);
            value = toNumber(value);
            return {
                value: value,
                length: 8
            }
        }
    },
    '5A':{
        word: Driver.StatusWords.airflow_medium.word,
        Read: (data)=>{
            var value = data.substr(0, 8);
            value = toNumber(value);
            return {
                value: value,
                length: 8
            }
        }
    },
    '5B':{
        word: Driver.StatusWords.airflow_high.word,
        Read: (data)=>{
            var value = data.substr(0, 8);
            value = toNumber(value);
            return {
                value: value,
                length: 8
            }
        }
    },
    '5F':{  //低档能量参数
        word: Driver.StatusWords.energyparam_low.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: value,
                length: 8
            }
        }
    },
    '60':{  //中档能量参数
        word: Driver.StatusWords.energyparam_medium.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: value,
                length: 8
            }
        }
    },
    '61':{  //高档能量参数
        word: Driver.StatusWords.energyparam_high.word,
        Read: function (data) {
            var value = data.substr(0, 8);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: value,
                length: 8
            }
        }
    },
    '80':{  //温度系数1:1
        Read: function (data) {
            var value = data.substr(0, 2);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: null,
                length: 2
            }
        }
    },
    '81':{  //温度系数2:1
        Read: function (data) {
            var value = data.substr(0, 2);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: null,
                length: 2
            }
        }
    },
    '82':{  //温度系数3:1
        Read: function (data) {
            var value = data.substr(0, 2);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: null,
                length: 2
            }
        }
    },
    '83':{  //温度系数4:1
        Read: function (data) {
            var value = data.substr(0, 2);
            value = Variable.EnergyParam.Parse(value);

            return {
                value: null,
                length: 2
            }
        }
    },
    '84':{  //主机状态检测
        word: Driver.StatusWords.host_checkstatus.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            var status = Driver.Command.EMC_SCAN;
            switch(value){
                case 'FF':
                    status = Driver.Command.EMC_SCAN;
                    break;
                case '00':
                    status = Driver.Command.EMC_MASK;
                    break;
            }

            return {
                value: status,
                length: 2
            }
        }
    },
    '85':{  //主机状态
        word: Driver.StatusWords.host_status.word,
        Read: function (data) {
            var value = data.substr(0, 2);
            var status = Driver.Command.EMC_SCAN;
            switch(value){
                case '55':
                    status = Driver.Command.EMC_ON;
                    break;
                case '99':
                    status = Driver.Command.EMC_OFF;
                    break;
            }

            return {
                value: status,
                length: 2
            }
        }
    },
};

//应答控制码映射
var CONTROLCODEMAPPING = {
    //读刻度正确应答
    'A0': {
        Do: ReadDataNormalReply
    },
    //读刻度错误应答
    'E0': {
        Do: ReadDataExceptionReply
    },
    //读其他设置正确应答
    'A6':{
        Do: ReadDataNormalReply
    },
    //读其他设置错误应答
    'E6':{
        Do: ReadOtherSettingExceptionReply
    },
    //校时正常应答
    'A2':{
        Do:TimingNormalReply
    },
    //25H下载其他设置正常应答
    'A5':{
        Do: ReadDownOtherSettingNormalReply
    },
    //25H下载其他设置错误应答
    'E5':{
        Do: ReadDownOtherSettingExceptionReply
    },
    //下载刻度数据应答
    'A1':{
        Do: WriteScalaNormalReply
    },
    '95':{
        Do: ValveNormalReply
    },
    'D4':{
        Do: ValveExceptionReply
    }
};

/*
 * 解析命令
 * */
exports.ParseInstruction = function (buildingid, gatewayid, meterid, command, origincommand, param)
{
    var validCommand = command;
    if(!validCommand){
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result: {}
        };
    }

    //先定位4241
    var bcFlag = validCommand.indexOf('4241');
    if(bcFlag === -1 || bcFlag < 10){
        return ErrorCode.ack(ErrorCode.Code.PROTOCOLUNSUPPORT);
    }

    bcFlag -= 10;
    validCommand = validCommand.substr(bcFlag);

    //CSCheck
    var csCodeInCommand = validCommand.substr(validCommand.length-LengthOfCSCode);
    validCommand = validCommand.substr(0, validCommand.length-LengthOfCSCode);
    var csCodeNewGen = Driver.ReverseBytes(CRC(validCommand));
    if(csCodeInCommand !== csCodeNewGen){
        return {
            code: ErrorCode.Code.DATACALIBRATERROR,
            message: ErrorCode.Message.DATACALIBRATERROR
        };
    }

    //解析地址
    var addrid = validCommand.substr(0, 8);
    validCommand =validCommand.substr(addrid.length);

    //获取FMU
    var fmu = validCommand.substr(0, 2);
    validCommand = validCommand.substr(fmu.length);

    //公司代码
    var companyCode = validCommand.substr(0, typedef.COMPANYCODE.length);
    validCommand = validCommand.substr(companyCode.length);

    //仪表类型
    var adaptdevice = validCommand.substr(0, 2);
    validCommand = validCommand.substr(adaptdevice.length);

    //控制码
    var controlCode = validCommand.substr(0, 2);
    validCommand = validCommand.substr(controlCode.length);

    //处理数据
    var dataLength = validCommand.substr(0, 2);
    validCommand = validCommand.substr(2);

    var controlCodeModule = CONTROLCODEMAPPING[controlCode];
    if(!controlCodeModule){
        log.warn(command, ' control code unmatch: ', controlCode);
        return {
            code: ErrorCode.Code.CONTROLCODEUNSUPPORT,
            message: ErrorCode.Message.CONTROLCODEUNSUPPORT
        };
    }
    return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result: controlCodeModule.Do(validCommand, origincommand, param)
    };
};

exports.TranslateValue = function (driverName, command, funcid, value)
{
    var status = {};
    switch(funcid){
        case '10':
            try {
                status = StatusWord['56'].Parse(value);
            }
            catch(e){
                status = {};
            }
            status[funcid] = value;
            break;
        default:
            status[funcid] = value;
            break;
    }
    return status;
};

exports.BuildCommand = function (command, param, ext, data)
{
    const deviceAddr = util.buildAddr(param.addrid);

    var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + (ext.adaptdevice || '')  + command;
    var dataLength = Driver.Padding(data.length/2, 2);
    commandWord += dataLength + data;

    var crc = CRC(commandWord);
    commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

    return commandWord;
};

/*
* 驱动信息
* */
exports.DriverInfo = function()
{
    return {
        adaptdevice: ADAPTDEVICE
    };
};

//控制码处理

//读刻度正确应答
function ReadDataNormalReply(data, origincommand, param)
{
    var status = {};
    while(data.length){
        var code2 = data.substr(0, 2);
        var code4 = data.substr(0, 4);
        var mode2 = StatusWord[code2];
        var mode4 = StatusWord[code4];
        var mode = mode4 || mode2;
        var codeLength = mode4 ? 4:2;
        var code = mode4 ? code4 : code2;
        if(!mode){
            data = data.substr(2);
            continue;
        }

        data = data.substr(codeLength);
        var value = mode.Read(data);
        if(value.value != null){
            if(_.isObject(value.value)){
                _.map(value.value, (v,k)=>{
                    status[k] = v;
                });
            }
            else {
                status[mode.word || code] = value.value;
            }
        }
        data = data.substr(value.length);
    }

    return status;
}

//读其他设置正确应答
function ReadOtherSettingNormalReply(data, origincommand, param)
{
    var status = {};
    while(data.length){
        var code = data.substr(0, 2);
        data = data.substr(2);

        var mode = StatusWord[code];
        if(!mode){
            continue;
        }
        var value = mode.Read(data);

        if(value.value != null){
            status[mode.word||code] = value.value;
        }
        data = data.substr(value.length);
    }

    return status;
}

//读刻度错误应答
function ReadDataExceptionReply(data, origincommand, param)
{
    return {};
}

function ReadOtherSettingExceptionReply()
{
    return {};
}

//校时正常应答
function TimingNormalReply(data, origincommand, param)
{}

//25H下载其他设置正常应答
function ReadDownOtherSettingNormalReply(data, origincommand, param)
{
    var status = {};
    if(origincommand.command === Driver.Command.EMC_SWITCH){
        //
        status[Driver.StatusWords.switch.word] = origincommand.mode;
    }
    else if(origincommand.command === Driver.Command.EMC_WINDSPEED){
        //
        status[Driver.StatusWords.windspeed.word] = origincommand.mode;
    }
    else if(origincommand.command === Driver.Command.EMC_TEMPERATURE){
        //
        status[Driver.StatusWords.temperature.word] = param.value || 0.0;
    }
    else if(origincommand.command === Driver.Command.EMC_MODE){
        switch (origincommand.mode){
            case Driver.Command.EMC_COOLING:
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_COOLING;
                break;
            case Driver.Command.EMC_HEATING:
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_HEATING;
                break;
            case Driver.Command.EMC_DEHUMIDIFYING:
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_DEHUMIDIFYING;
                break;
            case Driver.Command.EMC_VERTILATING:
                status[Driver.StatusWords.mode.word] = Driver.Command.EMC_VERTILATING;
                break;
        }
    }

    return status;
}
//25H下载其他设置错误应答
function ReadDownOtherSettingExceptionReply(data, origincommand, param)
{
    return {};
}

function WriteScalaNormalReply(data, origincommand, param)
{
    return {};
}

function ValveNormalReply(data, origincommand, param) {
    var obj = {};
    obj[Driver.StatusWords.valve.word] = param.mode;
    return obj;
}

function ValveExceptionReply(data, origincommmand, param) {
    return {};
}

//Code==>Variable
//获取状态
function EMCViewStatus(ext, param)
{
    //
    var returnObj = {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result: {}
    };

    var commandEMCScale = ()=>{
        var command = '20'; //读刻度数据
        var deviceAddr = Driver.ToHex(param.addrid);
        deviceAddr = Driver.ToByteArray(deviceAddr);
        deviceAddr = deviceAddr.reverse();
        deviceAddr = Driver.ToString(deviceAddr);
        var adaptDevice = ext.adaptdevice;
        if (!adaptDevice) {
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
            reqdata: plainCommand + strCRCCode,
            retry: 10
        };
    };

    var commandEMCOther = ()=>{
        var command = '26'; //读刻度数据
        var deviceAddr = Driver.ToHex(param.addrid);
        deviceAddr = Driver.ToByteArray(deviceAddr);
        deviceAddr = deviceAddr.reverse();
        deviceAddr = Driver.ToString(deviceAddr);
        var adaptDevice = ext.adaptdevice;
        if (!adaptDevice) {
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
            reqdata: plainCommand + strCRCCode,
            retry: 10
        };
    };

    switch(param.mode){
        case Driver.Command.EMC_FETCH:
        {
            returnObj.result = [];
            var result = commandEMCScale();
            if( result ){
                returnObj.result.push(result);
            }
            result = commandEMCOther();
            if(result){
                returnObj.result.push(result);
            }
        }
            break;
        case Driver.Command.EMC_SCALE:
        {
            var command = '20'; //读刻度数据
            var deviceAddr = Driver.ToHex(param.addrid);
            deviceAddr = Driver.ToByteArray(deviceAddr);
            deviceAddr = deviceAddr.reverse();
            deviceAddr = Driver.ToString(deviceAddr);
            var adaptDevice = ext.adaptdevice;
            if (!adaptDevice) {
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
            returnObj.result = {
                reqdata: plainCommand + strCRCCode,
                retry: 10
            };
        }
            break;
        case Driver.Command.EMC_OTHER:
        {
            var command = '26'; //读刻度数据
            var deviceAddr = Driver.ToHex(param.addrid);
            deviceAddr = Driver.ToByteArray(deviceAddr);
            deviceAddr = deviceAddr.reverse();
            deviceAddr = Driver.ToString(deviceAddr);
            var adaptDevice = ext.adaptdevice;
            if (!adaptDevice) {
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
            returnObj.result = {
                reqdata: plainCommand + strCRCCode,
                retry: 10
            };
        }
            break;
    }

    return returnObj;
}

function EMCCHMode(ext, param)
{
    var SetCHMode = function(mode, ext, param)
    {
        if(!param.addrid){
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
        }
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }
        var data = Variable.WorkMode.SwitchMode(param.mode);
        if(!data){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var command = '25';
        const deviceAddr = util.buildAddr(param.addrid);

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command;
        var dataLength = Driver.Padding(data.length/2, 2);
        commandWord += dataLength + data;
        // if(mode == Driver.Command.EMC_COOLING) {
        //     commandWord += '02' + '144B';
        // }
        // else if(mode == Driver.Command.EMC_HEATING){
        //     commandWord += '02' + '144C';
        // }
        // else{
        //     commandWord += '00';
        // }

        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    };

    switch(param.mode){
        case Driver.Command.EMC_COOLING:
            return SetCHMode(Driver.Command.EMC_COOLING, ext, param);
        case Driver.Command.EMC_HEATING:
            return SetCHMode(Driver.Command.EMC_HEATING, ext, param);
        case Driver.Command.EMC_DEHUMIDIFYING:
            return SetCHMode(Driver.Command.EMC_DEHUMIDIFYING, ext, param);
        case Driver.Command.EMC_VERTILATING:
            return SetCHMode(Driver.Command.EMC_VERTILATING, ext, param);
        case Driver.Command.EMC_FETCH:
            return EMCViewStatus(ext, param);
        default:
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
    }
}

function EMCWindSpeed(ext, param)
{
    var SetWindSpeed = function(mode, ext, param)
    {
        if(!param.addrid){
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
        }
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }
        var data = Variable.WindSpeed.SwitchSpeed(param.mode);
        if(!data){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var command = '25'
        const deviceAddr = util.buildAddr(param.addrid);

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command;
        var dataLength = Driver.Padding(data.length/2, 2);
        commandWord += dataLength + data;

        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    };

    switch(param.mode){
        case Driver.Command.EMC_LOW:
            return SetWindSpeed(Driver.Command.EMC_LOW, ext, param);
        case Driver.Command.EMC_MEDIUM:
            return SetWindSpeed(Driver.Command.EMC_MEDIUM, ext, param);
        case Driver.Command.EMC_HIGH:
            return SetWindSpeed(Driver.Command.EMC_HIGH, ext, param);
        default:
            return {
                code: ErrorCode.Code.PARAMETERMISSED,
                message: ErrorCode.Message.PARAMETERMISSED
            };
    }
}

//面板开关
function EMCSwitch(ext, param)
{
    if(param.mode){
        //
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }

        var data = Variable.Switch.Switch(param.mode);
        if(!data){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var command = '25';
        // var deviceAddr = Driver.ToByteArray(Driver.ToHex(param.addrid)).reverse();
        // deviceAddr = Driver.ToString(deviceAddr);
        const deviceAddr = util.buildAddr(param.addrid);

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command;
        var dataLength = Driver.Padding(data.length/2, 2);
        commandWord += dataLength + data;

        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    }
    else{
        return {
            code: ErrorCode.Code.PARAMETERMISSED,
            message: ErrorCode.Message.PARAMETERMISSED
        };
    }
}

//合闸开闸
function EMCVALVE(ext, param)
{
    if(param.mode){
        //
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }

        var data = Variable.VALVE.Switch(param.mode);
        if(!data){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var command = '15';
        const deviceAddr = util.buildAddr(param.addrid);

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command;
        var dataLength = Driver.Padding(data.length/2, 2);
        commandWord += dataLength + data;

        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    }
    else{
        return {
            code: ErrorCode.Code.PARAMETERMISSED,
            message: ErrorCode.Message.PARAMETERMISSED
        };
    }
}

//同步时间
function EMCTime(ext, param)
{
    if(param.mode){
        //
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }

        var commandWord;
        if(param.mode = Driver.Command.EMC_SYNC) {
            commandWord = Variable.Time.Sync(param.mode);
            if (!commandWord) {
                return {
                    code: ErrorCode.Code.DATAFORMATERROR,
                    message: ErrorCode.Message.DATAFORMATERROR
                };
            }

            const deviceAddr = util.buildAddr(param.addrid);

            commandWord = deviceAddr + '01' + typedef.COMPANYCODE + adaptDevice + commandWord;

            var crc = CRC(commandWord);
            commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());
        }

        if(commandWord) {
            return {
                code: ErrorCode.Code.OK,
                message: ErrorCode.Message.OK,
                result: {
                    reqdata: commandWord,
                    retry: 10
                }
            };
        }
        else{
            return {
                code: ErrorCode.Code.COMMANDUNSUPPORT,
                message: ErrorCode.Message.COMMANDUNSUPPORT
            };
        }
    }
    else{
        return {
            code: ErrorCode.Code.PARAMETERMISSED,
            message: ErrorCode.Message.PARAMETERMISSED
        };
    }
}

//设置温度
function EMCTemperature(ext, param)
{
    if(param.value){
        //
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }

        var commandWord = Variable.Temperature.SetTemperature(param.value);
        if(!commandWord){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var command = '25';
        const deviceAddr = util.buildAddr(param.addrid);

        var dataLength = Driver.Padding(commandWord.length/2, 2);
        commandWord = dataLength + commandWord;

        commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command + commandWord;
        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    }
    else{
        return {
            code: ErrorCode.Code.PARAMETERMISSED,
            message: ErrorCode.Message.PARAMETERMISSED
        };
    }
}

//能量参数
function EMCEnergyParam(ext, param)
{
    //
    if(param.mode === Driver.Command.EMC_FETCH){
        //
        var command = '26';
        var deviceAddr = Driver.ToHex(param.addrid);
        deviceAddr = Driver.ToByteArray(deviceAddr);
        deviceAddr = deviceAddr.reverse();
        deviceAddr = Driver.ToString(deviceAddr);
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command + "00";
        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    }
    else{
        //写数据
        var command = '25';
        const deviceAddr = util.buildAddr(param.addrid);
        var adaptDevice = ext.adaptdevice;
        if(!adaptDevice){
            return {
                code: ErrorCode.Code.DEVICETYPEUNSUPPORT,
                message: ErrorCode.Message.DEVICETYPEUNSUPPORT
            };
        }
        var frame = Variable.EnergyParam.Write(param);
        if(!frame){
            return {
                code: ErrorCode.Code.DATAFORMATERROR,
                message: ErrorCode.Message.DATAFORMATERROR
            };
        }

        var commandWord = deviceAddr + FMU + typedef.COMPANYCODE + adaptDevice + command;
        var dataLength = (frame.length/2).toString(16).toUpperCase();
        dataLength = Driver.Padding(dataLength, 2);
        commandWord += dataLength + frame;
        var crc = CRC(commandWord);
        commandWord += Driver.ToString(Driver.ToByteArray(crc).reverse());

        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result:{
                reqdata: commandWord,
                retry: 10
            }
        };
    }

}