var config = require('config');
// var typedef = Driver.Load('/BasicControl/common/typedef');
var Driver =require('../../driver');
var CRC = Driver.Load('/BasicControl/common/modbusCRC');
var _ = require('underscore');
var moment = require('moment');

var signal = require('./common/signal');
var Message = require('./common/message');
var dataSaving = require('./common/dataSaving');
var autoInit = require('../../../../libs/autoInit');
const building_id = '330302G101';
const gateway_id = '01';// 考虑多个采集器的情况

const startTag = 0x55aa55aa;
const endTag = 0x68681616;

const IDLE = 'idle';
const AUTH = 'auth';
const DEVICE = 'device';
const INIT = 'init';
const ONLINE = 'online';



var xmlTime = 5;//处理发送xml的间隔 s
var page = 1;
var size = 50;
var port = 8194;
var readEnum = {
    'READING':'READING',
    'READY':'READY'
}
var readState = readEnum.READY;
var createEnum = {
    'READING':'READING',
    'READY':'READY'
}
var createState = readEnum.READY;
var meters=[];
var addMeters = [];
var server;
var cursor;
var  gatewayId = 0;
var  gatewayIndex = 0;
var nowMeter='';
var gatewayNum = 0;
var first = true;
/*
* MODBUS RTU
*   传感器地址 功能码 REGISTER基地址+偏移地址 寄存器个数 数值 CRC
* */


//拼接和处理数据长度的方法
const makeLenghNum = (str, len)=>{
    if(str.length >= len){
        str=str.substr(0,len);
    }else{
        // str = ((len-str.length)*10+''+str).substr(1,len);
        var nowLen = str.length;
        for(var i =0;i<(len-nowLen);i++){
            str='0' + str;
        }
    }
    return str;
}
//自动创建gatewayId，meterId，并且还要保证一个gateway下面不要冲突，而且不要超过12位数值
/**
 * 在材料位置未知的情况下，有点不太好办
 * 如果随机读取的几条都是可以xml封装的话，就方便了，但是实现起来困难
 * 1.随机选取也不行，因为如果新的发送了，老的还没有发送，就会导致数值降低了，
 * 所以选取最近的30分钟内的数据，unique处理
 * 2.unique之后的数据再重新处理，添加编码等等
 * 3.全部编码完成之后，就发送，成功之后删除所有数据
 *
 *
 *
 * **/
const transXml = (docs,meters,cb)=>{
    //第一次 ，进行archive处理
    if(first){
        console.log('first , to archive -------');
        //不管自动初始化是否成功，数据还是需要接收的

        autoInit.Init(archivesInfo, this.deviceInfo).then(
            function (result) {
                log.warn('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                _this.status = ONLINE;
            }, function (err) {
                log.error('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                _this.status = ONLINE;
            }
        );


    }



    //处理完成
    readState = readEnum.READY;
    cb([])

}




var dataToXml = function(docs,meters){
    if(!docs||docs.length==0){
        console.log('no data');
        return;
    }
    var uniqueNew = [];
    docs.forEach(function (item, index) {
        console.log(item);
        if(!meters[item.branchId] && uniqueNew.indexOf(item.branchId) == -1){
            //找到对应gateway下面的电表数量编号，超出了就要
            if(nowMeter){

            }else{
                // r.map(y=>{
                //     if(nowMeter[y.gatewayId]){
                //         nowMeter[y.gatewayId].push(y.gatewayIndex);
                //     }else{
                //         nowMeter[y.gatewayId]=[y.gatewayIndex];
                //         gatewayNum++;
                //     }
                // })(meters);
                // meters 格式整理成gateway 格式
                for(var key in meters){
                    if(nowMeter[key]){
                        nowMeter[key].push(meters[key].gatewayIndex);
                    }else{
                        nowMeter[key]=[meters[key].gatewayIndex];
                        gatewayNum++;
                    }
                }



            }
            var newGatewayId = '';
            var newMatewayIndex = '';
            var lastGateway = gatewayNum<10?('0'+gatewayNum):(''+gatewayNum);
            if(nowMeter&&nowMeter[lastGateway].length<98){
                newGatewayId = lastGateway;
                newMatewayIndex=nowMeter[lastGateway].length+1;
            }else{
                newGatewayId = (gatewayNum+1)<10?('0'+(gatewayNum+1)):(''+(gatewayNum+1));
                newMatewayIndex=1;
            }

            console.log('add the meter');
            var pureMeterId =  item.branchId.replace(item.buildingId.trim(),'');
            // var meter = new MongoDB.Meter(
            //     {
            //         buildingId: item.buildingId,
            //         gatewayId: gatewayId,
            //         //归档的时候的id长度有要求
            //         meterArchiveId: '',
            //         //上传的时候长度也有要求
            //         meterReportId: '',
            //         branchId: item.branchId,
            //         //传感器标识
            //         branchName: item.buildingId,
            //         update: item.update,
            //         itemCode: item.itemCode,
            //         itemName: item.itemName,
            // }
            // );
            var meter = {
                buildingId: item.buildingId.trim(),
                gatewayId: newGatewayId,
                gatewayIndex: newMatewayIndex,
                //归档的时候的id长度有要求
                meterArchiveId: makeLenghNum(pureMeterId,14),//14位 branchId.replace('330300A003','')
                //上传的时候长度也有要求
                meterReportId: makeLenghNum(pureMeterId,12),//12位
                branchId: item.branchId,
                //传感器标识
                branchName: item.branchName,
                update: item.update,
                itemCode: item.itemCode,
                itemName: item.itemName,
            };
            addMeters.push(meter);
            uniqueNew.push(meter.branchId);
            //Book.insertMany(rawDocuments)
            //     .then(function(mongooseDocuments) {
            //          /* ... */
            //     })
            //     .catch(function(err) {
            //         /* Error handling */
            //     });

            // meter.save(function (err, res) {
            //
            //     if (err) {
            //         console.log("Error:" + err);
            //     }
            //     else {
            //         console.log("Res:" + res);
            //     }
            //
            // });
        }else{
            console.log('exit,begin to transfer');
        }
    })
    // 插入批量数据,如果有新的插入数据，就暂时不上传了，知道下次读取没有未记录的电表
    //TODO 如果电表多到 需要多个gatewayID怎么处理呢
    if(addMeters){
        MongoDB.Meter.insertMany(addMeters).then(function (docs) {
            setTimeout(function () {
                readState = readEnum.READY;
                // 如果有新的电表插入进来，需要重新回到req请求这里，因为归档的电表改变了
                var seq = new signal.Request();
                seq.buildingID = building_id;
                seq.gatewayID = gateway_id;
                var msg = Message();

                var ackMsg = Message();
                ackMsg.Clone(msg);
                ackMsg.message = seq.Serilize();

                var buffer = signal.pack(ackMsg.Serilize());

                this.write(buffer, 'binary');
            },3*1000);

        }).then(function (err) {
            console.error(err);
        })
    }else{
        // 没有新的没有编码的支路，才可以处理这一批的数据
        console.log('not unknown branch,begin to transfer data ------');
        transXml(docs,meters);
    }
//readState = readEnum.READY;





}
// 上传archive的时候
//              archivesAck.meter = [{$:{id:'a01',meterId:'a01',addr:'000000000abc01',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}},
//                                     {$:{id:'a02',meterId:'a02',addr:'000000000abc02',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}}];
const makeMeterArchive = (cb)=>{
    //TODO 修改buildingID
    MongoDB.Meter.find({"buildingId" : " 330300A003"}).sort({'_id':1}).exec(function (err, docs) {
        if(error){
            console.error(cb([]));
        }
        // 这里一个建筑一个meters，不能一个meters所有建筑共用
        // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
        // let resJson = {};
        // r.map(({branchId,buildingId,branchName,itemCode,itemName})=>{
        //     resJson[branchId]=({buildingId,branchName,itemCode,itemName})
        // })(docs);
        let arr = [];
        let i = 1;
        r.map(y => {
            arr.push({$:{id:((1000 + i)+'').substr(1,4),meterId:((1000 + i)+'').substr(1,4),addr:y.meterArchiveId,mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}});
            i++;
        })(docs);


        cb(arr);
    })

}



//开始读取mongo中的数据
// 处理完成之后就删除吧
const dataToXmlInt =()=> setInterval(function () {


    if(readState == readEnum.READY){

        //Good.find({}).skip(page * 5).limit(5).sort({'_id':-1}).exec(cb);
        //TODO  这里buildingId 错误，需要修改,
        MongoDB.Meter.find({"buildingId" : " 330300A003"}).exec(function (err, docs) {
            // 这里一个建筑一个meters，不能一个meters所有建筑共用
            // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
            let resJson = {};
            r.map(({branchId,buildingId,branchName,itemCode,itemName})=>{
                resJson[branchId]=({buildingId,branchName,itemCode,itemName})
            })(docs);
            // console.log(resJson);
            meters = resJson;

            readState = readEnum.READING;
            addMeters=[];
            nowMeter='';
            gatewayNum = 0;
            // 测试用
            //TODO  这里buildingId 错误，需要修改,
            // TODO 恢复下面的那行代码
            MongoDB.DataClient.find({"buildingId" : " 330300A003"}).skip((page-1)*size).limit(size).sort({'update':1}).exec(function (err,docs) {   //exec最后使用
                // MongoDB.DataClient.find({"buildingId" : " 330300A003","serverTime":{$gte: moment().subtract(1, 'hour'), $lte: moment()}}).limit(size).sort({'update':1}).exec(function (err,docs) {   //exec最后使用
                if(err){  //失败
                    console.error('find data error,mongo:---');
                }else{   //成功
                    // console.log(docs);
                    dataToXml(docs,meters);
                    page++;
                }
            })

        })


    }else{
        console.log('reading, to wait ---- ');
    }

},xmlTime*1000);

dataToXmlInt();


//--------------  上面添加了 处理和读取的部分 ------

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
        this.beatFunc=null;

        this.isSend = false;
        this.xmlData = '';
        this.isArchive = false;
    }

    Status(){
        return this.status;
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
    static setXmlData(data){
        var _this = this;
        _this.xmlData=data;
    }
    static getXmlStatus(){
        var _this = this;
        return _this.status;
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
            // 1-2：接收服务端的返回，发送加密的sequence给服务端
            case signal.SEQUENCE: {
                // if (_this.status != AUTH) {
                //     break;
                // }
                var seqMd5 = new signal.SequenceMD5Client();
                seqMd5.seq = msg.seq;
                seqMd5.seq2 = msg.seq;
                seqMd5.buildingID = msg.buildingID;
                seqMd5.gatewayID = msg.gatewayID;
                // if (!seqMd5.isEqual) {
                //     //
                //     _this.status = IDLE;
                // }

                var ackMsg = Message();
                ackMsg.Clone(msg);//  buuilding gateway 等常见数据
                ackMsg.message = seqMd5.Serilize(); // 把xml的数据变成字符串

                var buffer = signal.pack(ackMsg.Serilize());

                _this.sock.write(buffer, 'binary');
                console.log('send the md5 to the server ------------------------------');
            }
          // 1-4：接收服务端的返回，判断是否是成功的验证
          break;
        case signal.RESULT: {
          // if (_this.status != AUTH) {
          //     break;
          // }
          var seqMd5 = new signal.SequenceMD5Client();
          seqMd5.seq = msg.seq;
          seqMd5.buildingID = msg.buildingID;
          seqMd5.gatewayID = msg.gatewayID;
          // if (!seqMd5.isEqual) {
          //     //
          //     _this.status = IDLE;
          // }
          seqMd5.UnSerilizeValid(msg.message);
          if (seqMd5.validRes) {
            //
            _this.status = AUTH;
            console.log('CLIENTINFO: '+ `${_this.address}:${_this.port}`+ msg.buildingID + msg.gatewayID+ 'MD5 Check OK');
          }
          // 创建对应的deviceInfo 信息给服务器，这里似乎国家标准没有的
          var deviceInfo = new signal.DeviceInfo();
          deviceInfo.command=signal.DEVICEINFO;
          deviceInfo.buildingID = msg.buildingID;
          deviceInfo.gatewayID = msg.gatewayID;

          deviceInfo.buildName = 'test';
          deviceInfo.buildNo = 'test';
          deviceInfo.devNo = 'test';
          deviceInfo.factory = 'test';
          deviceInfo.hardware = 'test';
          deviceInfo.software = 'test';
          deviceInfo.mac = 'test';
          deviceInfo.ip = 'test';
          deviceInfo.mask = 'test';
          deviceInfo.gate = 'test';
          deviceInfo.server = 'test';
          deviceInfo.port = 'test';
          deviceInfo.host = 'test';
          deviceInfo.com = 'test';
          deviceInfo.devNum = 'test';
          deviceInfo.period = 'test';
          deviceInfo.beginTime = 'test';
          deviceInfo.address = 'test';


          var ackMsg = Message();
          ackMsg.Clone(msg);//  buuilding gateway 等常见数据
          ackMsg.message = deviceInfo.Serilize(); // 把xml的数据变成字符串

          var buffer = signal.pack(ackMsg.Serilize());

          _this.sock.write(buffer, 'binary');

          console.log('md5,pass,send the device to the server ---------------------------');
        }
          break;
            case signal.DEVICEINFOACK: {
                if (_this.status != AUTH) {
                    break;
                }

                var devInfo = new signal.DeviceInfoAck();
                var deviceRes = devInfo.UnSerilize(msg.message);
                if(deviceRes){
                    _this.status =DEVICE;//这里只要改状态，过一会server会发archive来
                }
              console.log('server get the device ,status to device,wait for server archive ---------------------------');
                // var devInfoAck = new signal.DeviceInfoAck();

                // devInfoAck.buildingID = msg.buildingID;
                // devInfoAck.gatewayID = msg.gatewayID;
                //
                // this.key = `${msg.buildingID}${msg.gatewayID}`;
                //
                // log.info('DEVICEINFO: ', msg.buildingID + msg.gatewayID, devInfo.software, devInfo.ip);
                // MongoDB.Collector.update(
                //     {
                //         _id: msg.buildingID + msg.gatewayID
                //     }, {
                //         $set: {
                //             software: devInfo.software,
                //             hardware: devInfo.hardware,
                //             ip: devInfo.ip,
                //             lastupdate: moment().unix()
                //         }
                //     }, {}, function (err) {
                //         if (err) {
                //             log.error(err, devInfo);
                //         }
                //     }
                // );
                // MongoDB.SensorAttribute.update(
                //     {
                //         _id: new RegExp(`${msg.buildingID}${msg.gatewayID}`)
                //     }, {
                //         $set: {
                //             auid: AUID
                //         }
                //     }, {multi: true}, err => {
                //         if (err) {
                //             log.error(err, devInfo);
                //         }
                //     }
                // );

                // var ackMsg = Message();
                // ackMsg.Clone(msg);
                // ackMsg.message = devInfoAck.Serilize();
                //
                // var buffer = signal.pack(ackMsg.Serilize());
                //
                // _this.sock.write(buffer, 'binary');

                //发送archive请求进行传感器初始化
                // {
                //     var archives = new signal.Archives();
                //     archives.buildingID = msg.buildingID;
                //     archives.gatewayID = msg.gatewayID;
                //
                //     var archivesMsg = Message();
                //     archivesMsg.Clone(msg);
                //     archivesMsg.message = archives.Serilize();
                //
                //     var buffer = signal.pack(archivesMsg.Serilize());
                //     _this.sock.write(buffer, 'binary');
                // }
            }
                break;
            case signal.ARCHIVES: {
                if (_this.status != DEVICE) {
                    break;
                }

                // makeMeterArchive(function (arr) {
                //     console.log(arr);
                // });

                var archives = new signal.Archives();
                var archivesInfo = archives.UnSerilizeClient(msg.message);
            //发送archive ask信息
                var archivesAck = new signal.ArchivesAck();
                archivesAck.buildingID = msg.buildingID;
                archivesAck.gatewayID = msg.gatewayID;
              archivesAck.buildingName = 'test';
              archivesAck.protocols = [{$:{id:'2',  type:"2", mType:"1",name:"TCPTest", mutiple:"1" ,type188:"00"},
                item:{$:{id:"01",mflag:"1",fnId:"01",name:"ZXYG",cmd:"11",di:"00000000",offset:"00",len:"04",dt:"10",calc:"d/100"}}}];
              archivesAck.meter = [{$:{id:'a01',meterId:'a01',addr:'000000000abc01',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}},
                                    {$:{id:'a02',meterId:'a02',addr:'000000000abc02',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}}];
              var ackMsg = Message();
              ackMsg.Clone(msg);//  buuilding gateway 等常见数据
              ackMsg.message = archivesAck.Serilize(); // 把xml的数据变成字符串

              var buffer = signal.pack(ackMsg.Serilize());

              _this.sock.write(buffer, 'binary');
              console.log('send the archive,status online, ---------------------------');
            //  启动定时器
              if(!_this.beatFunc){
                console.log('begin to start the interval ----------');
                _this.beatFunc = setInterval(myFunc2,10*1000,_this,msg);
              }

              // if(!_this.beatFunc){
              //   _this.beatFunc='1';
              //   process.stdin.setEncoding('utf8');
              //
              //   process.stdin.on('readable', () => {
              //     var chunk = process.stdin.read();
              //     if (chunk !== null) {
              //       process.stdout.write(`data: ${chunk}`);
              //       _this.client.write(sendMsg);
              //     }
              //   });
              //
              //   process.stdin.on('end', () => {
              //     process.stdout.write('end');
              //
              //   });
              // }

              //不管服务器，直接变成在线
              _this.status = ONLINE;
            //   test 发送数据
            //   setTimeout(report,1000,_this,msg);
            }
                break;
            case signal.NOTIFYACK: {
                if (_this.status != ONLINE) {
                    break;
                }

                //update lastOperationTime/HeartBeat
                var notify = new signal.NotifyAck();
                notify.UnSerilize(msg.message);
                //log.info('Notify: ', notify);
              if(!notify.time){
                console.log('error of notify,to idle status');
                _this.status != IDLE;
              }
              console.log('notifyAck  --------------------------');
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
            case signal.REPORTACK: {
                if (_this.status != ONLINE) {
                    break;
                }

                var report = new signal.Report();
                //log.info(msg.message.toString());
                report.UnSerilize(msg.message);
                //log.info('report: ', report);

                // var ackMsg = Message();
                // ackMsg.Clone(msg);
                // ackMsg.message = report.Serilize();
                //
                // var buffer = signal.pack(ackMsg.Serilize());
                // _this.sock.write(buffer, 'binary');

                // dataSaving.Saving(msg.message.toString());
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



function myFunc(sock,_this) {
    console.log(`begin to beat => `);
  var myInterval=setInterval(myFunc2,60*1000,sock);



}

// 后续这里的定时器，一开始就启动，如果状态不是ONLINE，就不断请求鉴权
// 如果是正常的，就保持正常存活的状态

function report(_this,msg,arr) {
  console.log(`begin to report`);
  if (_this.status != ONLINE) {
    return;
  }
  // 从数据库中读取数据
  //   dataToXmlInt();



  var report = new signal.ReportClient();
  report.buildingID = msg.buildingID;
  report.gatewayID = msg.gatewayID;
  report.time = moment(new Date()).format("YYYYMMDDHHmmss");
  // report.time = moment.now();
  // report.time = 20200325183258;
  report.sequence='1000';
  report.meter=[{$:{id:'a01',meterId:'a01',addr:'0000000abc01',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter1'},
    'function':{$:{id:'01', coding:'01B00',error:'192'},_:arr[0]}},
                {$:{id:'a02',meterId:'a02',addr:'0000000abc02',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter2'},
                  'function':{$:{id:'01', coding:'01B00',error:'192'},_:arr[1]}}];

  var ackMsg = Message();
  ackMsg.Clone(msg);
  ackMsg.message = report.Serilize();

  var buffer = signal.pack(ackMsg.Serilize());
  _this.sock.write(buffer, 'binary');

  console.log('report the data,-----------');

}

var  count = 0;
var totol1 = 0;
var totol2 = 0;
var arr = [0,0];
var value = (moment(new Date()).format("MMDDHHmm"))/100;
function myFunc2(_this,msg) {
  console.log(`begin to beat 2=> }`);
  if (_this.status != ONLINE) {//TODO 这里后续开始重新请求
    return;
  }
  if(count>0){
    console.log('begin to report');
    count = 0;
    var value = (moment(new Date()).format("MMDDHHmm"))/100;
    arr[0]=value;
    arr[1]=value;
    report(_this,msg,arr);
    return;
  }


  //update lastOperationTime/HeartBeat
  var notify = new signal.Notify();
  // notify.UnSerilize(msg.message);
  //log.info('Notify: ', notify);

  notify.buildingID = msg.buildingID;
  notify.gatewayID = msg.gatewayID;

  var ackMsg = Message();
  ackMsg.Clone(msg);
  ackMsg.message = notify.Serilize();

  var buffer = signal.pack(ackMsg.Serilize());
  _this.sock.write(buffer, 'binary');
  console.log('notify the server , ---------------------------');

  count ++;
  arr[0]++;
  arr[1]++;
}



exports.Match = (sock, buffer)=>{
    return NetDAU485.match(sock, buffer);
};
exports.Alloc = (sock)=>{
    return new NetDAU485(sock);
};
exports.setData = (data)=>{
    NetDAU485.setXmlData(data);
};
exports.getStatus = ()=>{
    return NetDAU485.getXmlStatus();
};




// exports.Status = ()=>{
//   return NetDAU485.Status();
// };
