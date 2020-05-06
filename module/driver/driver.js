var watch = require('watch');
var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var moment = require('moment');
var Q = require('q');
var bases = require('bases');

var directoryRoot = {};
var parserList = [];
var driverCache = {};
const baseDir = './driver/';
const driverPath = path.join(
    path.dirname(__filename),
    baseDir
);

exports = module.exports = function() {
};

/*
*   命令字:
*   EMC_ADAPTDEVICE:适配设备
*   EMC_STATUS:获取设备状态
*
*   EMC_SWITCH: 设置开关机
*       mode:
*           EMC_ON: 开机
*           EMC_OFF: 关机
*           EMC_FETCH: 获取开关状态
*
*   EMC_MODE: 设置运行模式
*       mode:
*           EMC_COOLING: 设置制冷
*           EMC_HEATING: 设置制热
*           EMC_DEHUMIDIFYING: 设置除湿
*           EMC_VERTILATING: 设置通风
*           EMC_FETCH: 获取模式
*
*   EMC_COOLING: 制冷
*       value: 设置读数
*       mode:
*           EMC_FETCH: 获取制冷量
*
*   EMC_HEATING: 制热
*       value: 设置读数
*       mode:
*           EMC_FETCH: 获取制热量
*
*   EMC_INTEGRATEDFLUX: 累积流量
*       value: 设置读数
*       mode:
*           EMC_FETCH: 获取累积流量
*
*   EMC_FLOWRATE: 流速
*       value: 设置读数
*       mode:
*           EMC_FETCH: 获取流速
*
*   EMC_FORWARDACTIVE: 正向有功
*       value: 设置读数
*       mode:
*           EMC_FETCH: 获取正向有功
*
*   EMC_WINDSPEED: 风速
*       mode:
*           EMC_LOW: 低档风速
*           EMC_MEDIUM: 中档风速
*           EMC_HIGH: 高档风速
*           EM_FETCH: 获取风速
*
*   EMC_TEMPERATURE: 温度
*       value: 设置温度
*       mode:
*           EMC_FETCH: 获取温度
*
*   EMC_LOCK: 锁定
*       mode:
*           EMC_ON: 锁定终端
*           EMC_OFF: 解除锁定
*
*   EMC_ENERGYPARAM: 能量参数
*       value:{
*           EMC_LOW: 低档能量参数,
*           EMC_MEDIUM: 中档能量参数,
*           EMC_HIGH: 高档能量参数
*       },
*       mode: EMC_FETCH //获取参数
* */
exports.Command = {};
function BuildControlCommand(key, cmd)
{
    if(!cmd){
        cmd = key;
    }
    exports.Command[key] = cmd;
}

BuildControlCommand('EMC_STATUS');
BuildControlCommand('EMC_SWITCH');
BuildControlCommand('EMC_MODE');
BuildControlCommand('EMC_COOLING');
BuildControlCommand('EMC_HEATING');
BuildControlCommand('EMC_DEHUMIDIFYING');
BuildControlCommand('EMC_VERTILATING');
BuildControlCommand('EMC_INTEGRATEDFLUX');
BuildControlCommand('EMC_FLOWRATE');
BuildControlCommand('EMC_FORWARDACTIVE');
BuildControlCommand('EMC_WINDSPEED');
BuildControlCommand('EMC_TEMPERATURE');
BuildControlCommand('EMC_LOCK');
BuildControlCommand('EMC_TIME');
BuildControlCommand('EMC_ENERGYPARAM'); //低/中/高 能量参数
BuildControlCommand('EMC_VALVE'); //阀门控制

BuildControlCommand('EMC_ON');
BuildControlCommand('EMC_OFF');
BuildControlCommand('EMC_EXCPTION');
BuildControlCommand('EMC_FETCH');
BuildControlCommand('EMC_LOW');
BuildControlCommand('EMC_MEDIUM');
BuildControlCommand('EMC_HIGH');
BuildControlCommand('EMC_AUTO');
BuildControlCommand('EMC_NONE');
BuildControlCommand('EMC_SYNC');
BuildControlCommand('EMC_SCALE');   //为状态准备的,温控有2种状态,刻度状态和其它状态
BuildControlCommand('EMC_OTHER');
BuildControlCommand('EMC_OPEN');    //开放
BuildControlCommand('EMC_MASK');    //屏蔽
BuildControlCommand('EMC_SCAN');    //屏蔽


BuildControlCommand('EMC_REMOTE');
BuildControlCommand('EMC_LOCAL');

/*
 * 传感器属性列表
 *   switch: 开关状态,
 *   forwardactive: 正向有功
 *
 * */
const StatusWord = {
    'switch': {
        word: 'switch',
        name: '开关'
    },
    'valve':{
        word: 'valve',
        name: '阀门开关'
    },
    'fa':{
        word: 'forwardactive'
    },
    'mode':{
        word: 'mode'
    },
    'flowsize':{
        word: 'flowsize'
    },
    'time':{
        word: 'time'
    },
    'cooling':{
        word: 'cooling'
    },
    'heating':{
        word: 'heating'
    },
    'intergratedflux':{
        word: 'intergratedflux'
    },
    'watersupplytemperature':{
        word: 'watersupplytemperature'
    },
    'waterreturntemperature':{
        word: 'waterreturntemperature'
    },
    'flowrate': {
        word: 'flowrate'
    },
    'windspeed':{
        word: 'windspeed'
    },
    'temperature':{
        word: 'temperature',
        name: '设定温度'
    },
    'energycoefficient':{
        word: 'energycoefficient',
        name: '能量系数'
    },
    'inroomtemperature':{
        funcid: 40,
        word: 'inroomtemperature',
        name: '室内温度'
    },
    'lock':{
        word: 'lock'
    },
    'energyparam_low': {
        word: 'energyparam_low',
        name: '低档能量参数'
    },
    'energyparam_medium': {
        word: 'energyparam_medium',
        name: '中档能量参数'
    },
    'energyparam_high': {
        word: 'energyparam_high',
        name: '高档能量参数'
    },
    'synthesize_cold': {
        word: 'synthesize_cold',
        name: '综合冷系数'
    },
    'synthesize_hot': {
        word: 'synthesize_hot',
        name: '综合热系数'
    },
    'panel_status': {
        word: 'panel_status',
        name: '面板状态'
    },
    'panel_lockstatus': {
        word: 'panel_lockstatus',
        name: '面板锁定状态'
    },
    'fan_gearstatus':{
        word: 'fan_gearstatus',
        name: '风机档位状态'
    },
    'dd_section_1':{
        word: 'dd_section_1',
        name: 'DD分段01能量参数'
    },
    'dd_section_2':{
        word: 'dd_section_2',
        name: 'DD分段02能量参数'
    },
    'dd_section_3':{
        word: 'dd_section_3',
        name: 'DD分段03能量参数'
    },
    'dd_section_4':{
        word: 'dd_section_4',
        name: 'DD分段04能量参数'
    },
    'mode_temperatureset':{
        word: 'mode_temperatureset',
        name: '设定温度模式'
    },
    'mode_valveswitch':{
        word: 'mode_valveswitch',
        name: '阀门开关模式'
    },
    'airflow_low': {
        word: 'airflow_low',
        name: '低档风量'
    },
    'airflow_medium': {
        word: 'airflow_medium',
        name: '中档风量'
    },
    'airflow_high': {
        word: 'airflow_high',
        name: '高档风量'
    },
    'alert_status':{
        word: 'alert_status',
        name: '报警设置'
    },
    'host_checkstatus':{
        word: 'host_checkstatus',
        name: '主机检测状态'
    },
    'host_status':{
        word: 'host_status',
        name: '主机状态'
    },
    'cold_efficient':{
        word: 'cold_efficient',
        name: '冷效率'
    },
    'hot_efficient':{
        word: 'hot_efficient',
        name: '热效率'
    },
    'heating_threshold':{
        word: 'heating_threshold',
        name: '采暖阀值'
    },
    'ac_threshold':{
        word: 'ac_threshold',
        name: '空调阀值'
    },
    'ac_td_threshold':{
        word: 'ac_td_threshold',
        name: '制冷温差阀值'
    },
    'mineff_flow':{
        word: 'mineff_flow',
        name: '最小有效流量设置'
    },
    'fancoil_dec':{
        word: 'fancoil_dec',
        name: '风机盘管检测设置'
    }
};
exports.StatusWords = StatusWord;

//
function TranverseLoad(root, subPath)
{
    //
    var files;
    try{
        files = fs.readdirSync(subPath);
    }
    catch(e){
        console.error('Error: ', e);
    }

    if(files){
        _.each(files, function(basename){
            //
            var newSubPath = path.join(subPath, basename);
            var stat = fs.statSync(newSubPath);
            if(stat){
                if(stat.isDirectory()){
                    //
                    root[basename] = {
                    };
                    if(basename === 'common'){
                        return;
                    }
                    return TranverseLoad(root[basename], newSubPath);
                }
                else{
                    //
                    root[basename] = {
                    };
                    try {
                        var driver = require(newSubPath);
                        if(_.isFunction(driver.Match)){
                            parserList.push(driver);
                        }

                        var key = path.relative(driverPath, newSubPath);
                        driverCache[key] = driver;
                    }
                    catch(e){
                        // log.error(e, basename);
                    }
                }
            }
        })
    }

}

function ReLoad(isDirect)
{
    var Do = function()
    {
        var newRoot = {};
        TranverseLoad(newRoot, driverPath);
        directoryRoot = newRoot;
        //log.debug(directoryRoot);
    };
    setTimeout(function(){
        setTimeout(function(){
            Do();
            ReLoad();
        }, 1000 * 30);
    }, 0);
    if(isDirect){
        Do();
    }
}

function LoadDriver(driverName)
{
    return driverCache[driverName];
    if(!driverName || !driverName.length){
        return null;
    }
    var driverFileName = path.join(driverPath,driverName);
    try{
        var needless = require('needless');
        needless(driverFileName);
        return require(driverFileName);
    }
    catch(e){
        log.debug(e)
    }
    return null;
}

exports.Load = function(filepath)
{
    if(!filepath || !filepath.length){
        return null;
    }
    var filePath = path.join(driverPath, filepath);
    try{
        var needless = require('needless');
        needless(filePath);
        return require(filePath);
    }
    catch(e){
        console.error(e);
    }
    return null;
};

exports.Run = function()
{
    ReLoad(true);
    // EventLoop();
};

/*
 返回所有公司的所有驱动
 * */
exports.Enum = function()
{
    var EnumDriver = function(directory)
    {
        var obj = {};
        _.map(directory, function(v, k){
            const blacklist = ['common', '.DS_Store'];
            if(_.contains(blacklist, k)){
                return;
            }
            obj[k] = {
                driver: EnumDriver(v),
                name: k
            };
            //if(_.isEmpty(obj[k])){
            //    obj[k] = true;
            //}
        });
        return obj;
    };

    return EnumDriver(directoryRoot);
};

exports.DriverList = ()=>{
    var list = [];
    _.map(driverCache, (v, k)=>{
        var info = v.DriverInfo && v.DriverInfo();
        if(info && info.adaptdevice){
            _.map(info.adaptdevice, adaptdevice=>{
                list.push(`${k}?adaptdevice=${adaptdevice.code}&desc=${adaptdevice.desc}`);
            });
        }
        else{
            list.push(k);
        }
    });

    return list;
};

/*
* 驱动支持的命令
* */
exports.SupportCommand = function (driverName)
{
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }

    var data = [];
    _.map(driver, function (content, command) {
        if(_.isFunction(content)){
            return;
        }
        data.push({
            channels: content.Channels,
            statuswords: content.StatusWords,
            command: command
        });
    });
    return data;
};

/*
* 状态回写
* */
exports.StatusWriteBack = function (command, driverName, ext, parameter)
{
    //
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }
    var driverHandle = driver[command];
    if(!driverHandle){
        return {
            code: ErrorCode.Code.COMMANDUNSUPPORT,
            message: ErrorCode.Message.COMMANDUNSUPPORT
        };
    }
    if(!driverHandle.StatusWriteBack){
        return {
            code: ErrorCode.Code.COMMANDUNSUPPORT,
            message: ErrorCode.Message.COMMANDUNSUPPORT
        };
    }
    return driverHandle.StatusWriteBack(ext, parameter);
};

/*
* 驱动加载
* */
exports.BuildInstruction = function (command, driverName, ext, parameter)
{
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }
    var driverHandle = driver[command];
    if(!driverHandle){
        return {
            code: ErrorCode.Code.COMMANDUNSUPPORT,
            message: ErrorCode.Message.COMMANDUNSUPPORT
        };
    }
    return driverHandle.Do(ext, parameter);
};
/*
* 生成单一指令
* */
exports.BuildCommand = function (command, driverName, param, ext, data)
{
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }
    if(!driver.BuildCommand){
        return {
            code: ErrorCode.Code.COMMANDUNSUPPORT,
            message: ErrorCode.Message.COMMANDUNSUPPORT
        };
    }
    return driver.BuildCommand(command, param, ext, data);
};

/*
* 驱动信息
* */
exports.DriverInfo = function (driverName)
{
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }

    if( !driver.DriverInfo() ){
        return {
            code: ErrorCode.Code.OK,
            message: ErrorCode.Message.OK,
            result: {}
        };
    }

    return {
        code: ErrorCode.Code.OK,
        message:ErrorCode.Message.OK,
        result: driver.DriverInfo()
    };
};
/*
* 指令解析
* */
exports.ParseInstruction = function(driverName, buildingid, gatewayid, meterid, respdata, origincommand, param)
{
    var driver = LoadDriver(driverName);
    if(!driver){
        return {
            code: ErrorCode.Code.DRIVERLOADFAILED,
            message: ErrorCode.Message.DRIVERLOADFAILED
        };
    }
    return driver.ParseInstruction(buildingid, gatewayid, meterid, respdata, origincommand, param);
};
/*
* 返回值重编码
* */
exports.TranslateValue = function (driverName, command, funcid, value)
{
    var driver = LoadDriver(driverName);
    if(!driver || !driver.TranslateValue){
        return value;
    }
    return driver.TranslateValue(driverName, command, funcid, value);
};

/*
* 判断指令是否超时
* */
//exports.InstructionTimeout = function(driverName, command, commandtime)
//{
//    if(!command || !commandtime){
//        return true;
//    }
//
//    var driver = LoadDriver(driverName);
//    if(!driver){
//        console.error(driverName, 'can not load module');
//        return false;
//    }
//    var nowTime = moment();
//    commandtime = moment(commandtime);
//    var commandTimeout = driver.EMC_ATTRIB_COMMANDTIMEOUT() || 200;
//    console.debug('Driver Time Diff', driverName, command, nowTime.unix() - commandtime.unix(), commandTimeout);
//    if( nowTime.unix() - commandtime.unix() >= commandTimeout ){
//        return true;
//    }
//    else{
//        return false;
//    }
//};

//Command
//Utility
exports.ToHex = function(value)
{
    var hexString = bases.toBase16(value).toUpperCase();
    if(hexString.length % 2){
        hexString = '0' + hexString;
    }
    return hexString;
};
exports.ToByteArray = function(str)
{
    return str.match(/\w{2}/g);
};
exports.ToString = function(ary='')
{
    return ary.toString().replace(/,/g, '')
};
exports.Read = function(data, length)
{
    if(!length){
        length = 1;
    }
    length *= 2;
    return data.substr(0, length);
};
exports.Next = function(data, length)
{
    if(!length){
        length = 1;
    }
    length *= 2;
    return data.substr(length);
};
exports.Padding = function(content, length, align, pad)
{
    //默认0补齐
    if(!pad){
        pad = '0';
    }
    if(!align){
        align = 'LEFT';
    }

    var strValue = content.toString();
    var fixLength = length - strValue.length;
    if(fixLength <= 0){
        return strValue;
    }

    for(var i=0;i<fixLength;i++){
        //
        if(align=='LEFT') {
            strValue = pad + strValue;
        }
        else if(align == 'RIGHT'){
            strValue = strValue + pad;
        }
    }
    return strValue;
};
exports.Serialize = function (commandSet)
{
    if(!_.isArray(commandSet)){
        commandSet = [commandSet];
    }

    var commandLength = 0;
    var serialCommand = '';
    _.each(commandSet, function(set){
        commandLength += set.length * 2;
        serialCommand += set;
    });

    return bases.toBase16(commandLength).toUpperCase() + serialCommand;
};
exports.ReverseBytes = function(info)
{
    if(info.length % 2 != 0){
        return info;
    }

    var reverseStr = '';
    while(info.length){
        reverseStr = info.substr(0, 2) + reverseStr;
        info = info.substr(2);
    }

    return reverseStr;
};

exports.ModuleName = 'Driver';