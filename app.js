// var createError = require('http-errors');
// var express = require('express');
// var path = require('path');
// var cookieParser = require('cookie-parser');
// var logger = require('morgan');
//
// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');
//
// var app = express();
//
// // view engine setup
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'pug');
//
// app.use(logger('dev'));
// app.use(express.json());
// app.use(express.urlencoded({ extended: false }));
// app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
//
// app.use('/', indexRouter);
// app.use('/users', usersRouter);
//
// // catch 404 and forward to error handler
// app.use(function(req, res, next) {
//   next(createError(404));
// });
//
// // error handler
// app.use(function(err, req, res, next) {
//   // set locals, only providing error in development
//   res.locals.message = err.message;
//   res.locals.error = req.app.get('env') === 'development' ? err : {};
//
//   // render the error page
//   res.status(err.status || 500);
//   res.render('error');
// });
//
// module.exports = app;


//-----------下面的是开始的部分
var net = require("net");
var fs = require("fs");
var iconv = require("iconv-lite");
var r = require("ramda");
var moment = require('moment');
var xml = require('xmldoc');
var autoInit = require('./libs/autoInit');
var config = require('config');
var signal = require('./module/driver/driver/NetDAU_Test/common/signal');
var Message = require('./module/driver/driver/NetDAU_Test/common/message');
var dataSaving = require('./module/driver/driver/NetDAU_Test/common/dataSaving');
require('./libs/log')(config.name);
var xmlTime = 3*60;//处理发送xml的间隔 s
var page = 1;
var size = 200;
var port = 8192;
var FIRST = {
    '330302D151':true,
    '330300A003':true,
    '330302G101':true,
};
var wzyxyBuildId = '330302D151';// 温州医学院
var wzjsdlBuildId = '330300A003';// 温州建设大楼，上传上来的老的builddingid，后面会分配新的
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
var nowMeter={};
var gatewayNum = 0;
const building_id = '330302G101';
const gateway_id = '01';
const prjNum = 2;
var prjIndex = 0;
const codeType = {
    '01A00':'照明插座',
    '01B00':'空调用电',
    '01C00':'动力用电',
    '01D00':'特殊用电',
    '02000':'官网用水',
}
//温州医学院
const wzyxyBuildName = {
    // '同心楼':'1',
    // '茶山图书馆':'2',
    // '学院路图书馆':'3',
    // '同济楼':'4',
    // '信工楼':'5',
    // '求知楼':'6',
    // '求是楼':'7',
    // '学院路东阶梯教室':'8',
    // '同德楼':'9',
    // '求真楼':'10',
    // '学院路眼视光科教楼	':'11',
    // '同仁楼	':'12',
    // '学院路东教学楼	':'13',
    // '学院路游泳馆及技能中心	':'14',
    // '茶山学生活动中心	':'15',
    // '旭光厅	':'16',
    // '体育馆	':'17',
    // '茶山一食堂	':'18',
    // '茶山二食堂	':'19',
    // '茶山三食堂	':'20',
    // '学院路食堂	':'21',
    // '茶山1号宿舍	':'22',
    // '茶山2号宿舍	':'23',
    // '茶山3号宿舍	':'24',
    // '茶山4号宿舍	':'	25',
    // '茶山5号宿舍	':'	26',
    // '研究生楼	':'	27',
    // '茶山7号宿舍	':'	28',
    // '茶山8号宿舍	':'	29',
    // '茶山9号宿舍	':'	30',
    // '茶山10号宿舍	':'	31',
    // '茶山11号宿舍	':'	32',
    // '茶山12号宿舍	':'	33',
    // '茶山13号宿舍	':'	34',
    // '茶山14号宿舍	':'	35',
    // '茶山15号宿舍	':'	36',
    // '茶山16号宿舍	':'	37',
    // '茶山17号宿舍	':'	38',
    // '茶山18号宿舍	':'	39',
    // '茶山19号宿舍	':'	40',
    // '茶山20号宿舍	':'	41',
    // '茶山21号宿舍	':'	42',
    // '学院路学生公寓	':'	43',
    // '学院路东学生楼	':'	44',
    // '学院路中学生楼	':'	45',
    // '学院路西学生楼	':'	46',
    // '学院路学生浴室	':'	47',
    // '中试基地	':'	48',
    // '综合楼及附二医急诊	':'	49',
    // '专家楼	':'	50',
    // '学院路学生活动中心	':'	51',
    // '育英学术馆	':'	52',
    '1': '同心楼',
    '2': '茶山图书馆',
    '3': '学院路图书馆',
    '4': '同济楼',
    '5': '信工楼',
    '6': '求知楼',
    '7': '求是楼',
    '8': '学院路东阶梯教室',
    '9': '同德楼',
    '01': '同心楼',
    '02': '茶山图书馆',
    '03': '学院路图书馆',
    '04': '同济楼',
    '05': '信工楼',
    '06': '求知楼',
    '07': '求是楼',
    '08': '学院路东阶梯教室',
    '09': '同德楼',
    '10': '求真楼',
    '11': '学院路眼视光科教楼',
    '12': '同仁楼',
    '13': '学院路东教学楼',
    '14': '学院路游泳馆及技能中心',
    '15': '茶山学生活动中心',
    '16': '旭光厅',
    '17': '体育馆',
    '18': '茶山一食堂',
    '19': '茶山二食堂',
    '20': '茶山三食堂',
    '21': '学院路食堂',
    '22': '茶山1号宿舍',
    '23': '茶山2号宿舍',
    '24': '茶山3号宿舍',
    '25': '茶山4号宿舍',
    '26': '茶山5号宿舍',
    '27': '研究生楼',
    '28': '茶山7号宿舍',
    '29': '茶山8号宿舍',
    '30': '茶山9号宿舍',
    '31': '茶山10号宿舍',
    '32': '茶山11号宿舍',
    '33': '茶山12号宿舍',
    '34': '茶山13号宿舍',
    '35': '茶山14号宿舍',
    '36': '茶山15号宿舍',
    '37': '茶山16号宿舍',
    '38': '茶山17号宿舍',
    '39': '茶山18号宿舍',
    '40': '茶山19号宿舍',
    '41': '茶山20号宿舍',
    '42': '茶山21号宿舍',
    '43': '学院路学生公寓',
    '44': '学院路东学生楼',
    '45': '学院路中学生楼',
    '46': '学院路西学生楼',
    '47': '学院路学生浴室',
    '48': '中试基地',
    '49': '综合楼及附二医急诊',
    '50': '专家楼',
    '51': '学院路学生活动中心',
    '52': '育英学术馆'

}
const buildingName = {
    '330302G101':'温州建设大楼',// 本地编的新的
    '330300A003':'温州建设大楼',// 原始传过来的
    '330302D151':'温州医学院',
}
const buildingIdConverter = {
    '330300A003':'330302G101',
    '330302D151':'330302D151',
}


var client;
// const {MongoDB} = require('./libs/mongo')
{
    global.MongoDB = require('./libs/mongodb2');
    global.MySQL = require('./libs/mysql');
    global.DeviceType = require('./libs/devicetype');


    global.ErrorCode = require('./libs/errorCode');
    global.GUID = require('./libs/guid');
    global.Util = require('./libs/util');
    global.Typedef = require('./libs/typedef');
    global.DeviceType = require('./libs/devicetype');
    global.CollectorPool = require('./libs/collectorPool');

    global.AUID = '';
    global.Widget = {};
}

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
const transXml = (docs,meters,inputBuildingId,cb)=>{
    // 会发送，说明docs的电表一定都已经在meters里面了，所以用meters来初始化更加全面一些
    //第一次 ，进行archive处理
    if(FIRST[inputBuildingId]){
        FIRST[inputBuildingId]=false;
        console.log('first , to archive -------');

        //根据buildingId gateWayId来进行初始化
        // 根据gateway 来分类
        var nowMeter = {};
        for(var key in meters){
            if(nowMeter[meters[key].gatewayId]){
                nowMeter[meters[key].gatewayId].push(key);
            }else{
                nowMeter[meters[key].gatewayId]=[key];
            }
        }
        if(!nowMeter){
            console.error('nowMeter is empty:-----');
            return;
        }

        for(var key in nowMeter){
            var No1MeterInfoForGate = meters[nowMeter[key][0]];// 这个网关下面的一个电表，用来获取信息
            if(!No1MeterInfoForGate){
                console.error('no info from the meter under the gateway:----');
                return;
            }
            var building_id = buildingIdConverter[No1MeterInfoForGate.buildingId];
            var gateway_id = No1MeterInfoForGate.gatewayId;
            if(!building_id || ! gateway_id){
             console.error('buildId or gatewayId is empty: ---');
             return;
            }
            console.log('init archive for '+ key);

            var archivesInfo = new signal.ArchivesInfoClient();
            archivesInfo.buildingID = building_id;
            archivesInfo.gatewayID = gateway_id;
            archivesInfo.buildingName = buildingName[building_id];


            let deviceTypeCode = null;
            const DEVICETYPECODE_LENGTH = 3;
            // if(protocol.attr.mType){
            if("1"){
                deviceTypeCode = `0001`;
                deviceTypeCode = deviceTypeCode.substr(deviceTypeCode.length - DEVICETYPECODE_LENGTH);
            }
            archivesInfo.protocols ={'2':
                    {
                        id: '2',
                        type: 0,
                        name:"TCPTest",
                        deviceTypeCode: deviceTypeCode,
                        ext: '0',
                        mType:"1",
                        details: [{id:"01",mflag:"1",fnId:"01",name:"ZXYG",cmd:"11",di:"00000000",offset:"00",len:"04",dt:"10",calc:"d/100"}]
                    }};


            archivesInfo.meters = [
                //     {
                //     mtype: '02',
                //     comport: "1",
                //     addrid:'000000000001',
                //     meterid: '001',
                //     memo: 'testMeter',
                //     sampleId: '01',
                //     code: '01B00'
                // },{
                //     mtype: '02',
                //     comport: "1",
                //     addrid:'000000000002',
                //     meterid: '002',
                //     memo: 'testMeter',
                //     sampleId: '01',
                //     code: '01B00'
                // }
            ];
            var i = 1;
            var No1MeterInfoForGate = meters[nowMeter[key][0]];
            var metersArr = nowMeter[key];
            r.map(y=>{
                archivesInfo.meters.push(
                    {
                        mtype: '02',
                        comport: "1",
                        addrid:meters[y].meterReportId,
                        meterid: meters[y].meterManagerId,
                        memo: meters[y].branchName,
                        sampleId: '01',
                        code: '01B00'
                    }
                )
            })(metersArr);

            // for(var key in meters){
            //     archivesInfo.meters.push(
            //         {
            //             mtype: '02',
            //             comport: "1",
            //             addrid:meters[key].meterReportId,
            //             meterid: meters[key].meterManagerId,
            //             memo: meters[key].branchName,
            //             sampleId: '01',
            //             code: '01B00'
            //         }
            //     )
            // }

            var deviceInfo = new signal.DeviceInfo();
            deviceInfo.command=signal.DEVICEINFO;
            deviceInfo.buildingID = building_id;
            deviceInfo.gatewayID = gateway_id;

            deviceInfo.buildName = buildingName[building_id];
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


            autoInit.Init(archivesInfo, deviceInfo).then(
                function (result) {
                    // log.warn('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                    // _this.status = ONLINE;
                }, function (err) {
                    // log.error('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                    // _this.status = ONLINE;
                }
            );

        }






    }else{
        //    不是第一次，进行数据的发送
        // 组织成 {branchId: {}} 格式的数据
        let resJson = {};
        r.map(({branchId,buildingId,branchName,itemCode,itemName,gatewayId,value})=>{
            resJson[branchId]=({buildingId,branchName,itemCode,itemName,gatewayId,value})
        })(docs);

        if(!resJson){
            console.error('resJson is empty :--');
            return;
        }

        var upMeter = {};
        // 这里存储的也是按照gateway分类的电表，只是这个电表还必须在docs中，多了一个筛选
        for(var key in resJson){
            if(upMeter[meters[key].gatewayId]){
                upMeter[meters[key].gatewayId].push(key);
            }else{
                upMeter[meters[key].gatewayId]=[key];
            }
        }



        if(!upMeter){
            console.error('upMeter is empty:-----');
            return;
        }
        for(var key in upMeter) {
            var No1MeterInfoForGate = meters[upMeter[key][0]];// 这个网关下面的一个电表，用来获取信息
            if (!No1MeterInfoForGate) {
                console.error('no info from the meter under the gateway:----');
                return;
            }
            var building_id = buildingIdConverter[No1MeterInfoForGate.buildingId];
            var gateway_id = No1MeterInfoForGate.gatewayId;
            if (!building_id || !gateway_id) {
                console.error('buildId or gatewayId is empty: ---');
                return;
            }


            // var value = (moment(new Date()).format("MMDDHHmm"))/100;
            // var arr = [];
            // arr[0]=value;
            // arr[1]=value;
            let report = {time:moment(new Date()).format("YYYYMMDDHHmmss"),meters:[]};
            r.map(x=>{
                // let data = "W=372076.80,last_w=372075.90";
                var y = resJson[x];
                let js = {};
                // console.log(
                if(inputBuildingId == wzyxyBuildId){
                    js.W=y.value;
                }else{

                    r.map(y=>{
                        var ar = y.split('=');
                        js[ar[0]]=ar[1];
                    })(y.value.split(','))
                }

                // );
                // console.log(js);
                report.meters.push(
                    {id:meters[x].meterManagerId,meterId:meters[x].meterManagerId,addr:meters[x].meterReportId,com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:y.branchName,pt:'1',sampleId:'01',name:'meter',
                        'funcs':[{id:'01', coding:'01B00',error:'192',val:js.W}]});

            })(upMeter[key]);



            dataSaving.SavingClient(report,building_id,gateway_id);

        }

        setTimeout(function () {
            //删除过期的数据，避免mongo数据量太大
            MongoDB.DataClient.deleteMany({"buildingId" : inputBuildingId,"serverTime":{$lte:  moment().subtract(1, 'day')}},function (err) {
                if(err){  //失败
                    console.error('delete old data error,mongo:---');
                }else{   //成功
                    // console.log(docs);
                    console.log('delete old data ok,mongo:---');
                    readState = readEnum.READY;
                }
            })

        },10*1000)

        // dataSaving.Saving(msg.message.toString());


    }



    //处理完成
    readState = readEnum.READY;
    cb([])

}




var dataToXml = function(docs,meters,docs1,inputBuildingId){
    if(!docs||docs.length==0){
        console.log('no data');
        readState = readEnum.READY;
        return;
    }
    var uniqueNew = [];
    var meterId = docs1.length+1;
    docs.forEach(function (item, index) {
        // console.log(item);
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
                    if(nowMeter[meters[key].gatewayId]){
                        nowMeter[meters[key].gatewayId].push(key);
                    }else{
                        nowMeter[meters[key].gatewayId]=[key];
                        gatewayNum++;
                    }
                }



            }
            gatewayNum=(gatewayNum==0)?1:gatewayNum;
            var newGatewayId = '';
            var newMatewayIndex = '';
            var lastGateway = gatewayNum<10?('0'+gatewayNum):(''+gatewayNum);
            if(!nowMeter[lastGateway]){ // 这里是不存在的情况
                newGatewayId = (gatewayNum)<10?('0'+(gatewayNum)):(''+(gatewayNum));
                newMatewayIndex=1;
                nowMeter[newGatewayId]=[item.branchId];
            }else if(nowMeter[lastGateway].length<98){//  这里是存在，然后还有余量
                newGatewayId = lastGateway;
                newMatewayIndex=nowMeter[lastGateway].length+1;
                nowMeter[lastGateway].push(item.branchId);// 添加新电表的branchid到nowmeter数组里面


            }else{// 然后是有并且是满了
                gatewayNum++; // 往后增加一个gateway的id的数值
                lastGateway = gatewayNum<10?('0'+gatewayNum):(''+gatewayNum);

                newGatewayId = lastGateway;
                newMatewayIndex=1;
                nowMeter[lastGateway]=[item.branchId];
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
                meterManagerId:((1000 + (meterId++))+'').substr(1,4),
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
             uniqueNew.push(meter.branchId); //防止读取数据中有重复的，导致多个插入的现象
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
            // console.log('exit,begin to transfer');
        }
    })
    // 插入批量数据,如果有新的插入数据，就暂时不上传了，知道下次读取没有未记录的电表
    if(addMeters && addMeters.length>0){
        FIRST[inputBuildingId]=true;//变成第一次，重新进行archive的请求
        MongoDB.Meter.insertMany(addMeters).then(function (docs) {
            readState = readEnum.READY;
        //
        }).then(function (err) {
            console.error(err);
        })
    }else{
        // 没有新的没有编码的支路，才可以处理这一批的数据
        console.log('not unknown branch,begin to transfer data ------');
        transXml(docs,meters,inputBuildingId,function (arr) {

        });
    }
//readState = readEnum.READY;





}

// 这里的数据用来处理温州医学院的类型数据
// 算了，还是保持一致，用自己的编号来吧，
// -- 待用，  需要再开启吧
var dataToXml2 = function(docs,meters,docs1){
    if(!docs||docs.length==0){
        console.log('no data');
        readState = readEnum.READY;
        return;
    }
    var uniqueNew = [];
    var meterId = docs1.length+1;
    docs.forEach(function (item, index) {
        // console.log(item);
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
                    if(nowMeter[meters[key].gatewayId]){
                        nowMeter[meters[key].gatewayId].push(key);
                    }else{
                        nowMeter[meters[key].gatewayId]=[key];
                        gatewayNum++;
                    }
                }



            }
            gatewayNum=(gatewayNum==0)?1:gatewayNum;
            var newGatewayId = '';
            var newMatewayIndex = '';
            var lastGateway = gatewayNum<10?('0'+gatewayNum):(''+gatewayNum);
            if(!nowMeter[lastGateway]){ // 这里是不存在的情况
                newGatewayId = (gatewayNum)<10?('0'+(gatewayNum)):(''+(gatewayNum));
                newMatewayIndex=1;
                nowMeter[newGatewayId]=[item.branchId];
            }else if(nowMeter[lastGateway].length<98){//  这里是存在，然后还有余量
                newGatewayId = lastGateway;
                newMatewayIndex=nowMeter[lastGateway].length+1;
                nowMeter[lastGateway].push(item.branchId);// 添加新电表的branchid到nowmeter数组里面


            }else{// 然后是有并且是满了
                gatewayNum++; // 往后增加一个gateway的id的数值
                lastGateway = gatewayNum<10?('0'+gatewayNum):(''+gatewayNum);

                newGatewayId = lastGateway;
                newMatewayIndex=1;
                nowMeter[lastGateway]=[item.branchId];
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
                meterManagerId:((1000 + (meterId++))+'').substr(1,4),
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
            uniqueNew.push(meter.branchId); //防止读取数据中有重复的，导致多个插入的现象
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
    if(addMeters && addMeters.length>0){
        MongoDB.Meter.insertMany(addMeters).then(function (docs) {
            readState = readEnum.READY;
            //
        }).then(function (err) {
            console.error(err);
        })
    }else{
        // 没有新的没有编码的支路，才可以处理这一批的数据
        console.log('not unknown branch,begin to transfer data ------');
        transXml(docs,meters,function (arr) {

        });
    }
//readState = readEnum.READY;





}



//开始读取mongo中的数据,定时器,
// 处理完成之后就删除吧
const dataToXmlInt =()=> setInterval(function () {




    if(readState == readEnum.READY){
        //一次只处理一个建筑的数据
        if(prjIndex >= prjNum){
            prjIndex = 1;
        }else{
            prjIndex ++;
        }
        //TODO 下面要删除
        // prjIndex=0;
        switch (prjIndex){
            case 1:

                //Good.find({}).skip(page * 5).limit(5).sort({'_id':-1}).exec(cb);
                MongoDB.Meter.find({"buildingId" : wzjsdlBuildId}).exec(function (err, docs1) {
                    // 这里一个建筑一个meters，不能一个meters所有建筑共用
                    // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
                    let resJson = {};
                    r.map(({branchId,buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId,gatewayId})=>{
                        resJson[branchId]=({buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId,gatewayId})
                    })(docs1);
                    // console.log(resJson);
                    meters = resJson;

                    readState = readEnum.READING;
                    addMeters=[];
                    nowMeter={};
                    gatewayNum = 0;
                    // 测试用
                    //
                    // MongoDB.DataClient.find({"buildingId" : "330300A003"}).skip((page-1)*size).limit(size).sort({'update':1}).exec(function (err,docs) {   //exec最后使用
                    MongoDB.DataClient.find({"buildingId" : wzjsdlBuildId,"serverTime":{$gte: moment().subtract(1, 'hour'), $lte: moment()}}).limit(size).sort({'update':-1}).exec(function (err,docs) {   //exec最后使用
                        if(err){  //失败
                            console.error('find data error,mongo:---');
                        }else{   //成功
                            // console.log(docs);
                            //查询多个数值，sort是倒序，uniq后保留单个数值
                            //
                            dataToXml((r.uniqBy(r.prop('branchId'))(docs)),meters,docs1,wzjsdlBuildId);
                            page++;
                        }
                    })

                })
                break;
            case 2:
                //     读取温州医学院的数据

                MongoDB.Meter.find({"buildingId" : wzyxyBuildId}).exec(function (err, docs1) {
                    // 这里一个建筑一个meters，不能一个meters所有建筑共用
                    // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
                    let resJson = {};
                    r.map(({branchId,gatewayId,buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId})=>{
                        resJson[branchId]=({gatewayId,buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId})
                    })(docs1);
                    // console.log(resJson);
                    meters = resJson;

                    readState = readEnum.READING;
                    addMeters=[];
                    nowMeter={};
                    gatewayNum = 0;
                    // 测试用
                    //
                    // MongoDB.DataClient.find({"buildingId" : "330300A003"}).skip((page-1)*size).limit(size).sort({'update':1}).exec(function (err,docs) {   //exec最后使用
                    //这里把水的数据暂时去掉，后续需要的话再加起来
                    MongoDB.DataClient.find({"buildingId" : wzyxyBuildId,"itemCode" : {$ne:'02000'},"serverTime":{$gte: moment().subtract(1, 'hour'), $lte: moment()}}).limit(size).sort({'update':-1}).exec(function (err,docs) {   //exec最后使用
                        if(err){  //失败
                            console.error('find data error,mongo:---');
                        }else{   //成功
                            // console.log(docs);
                            //查询多个数值，sort是倒序，uniq后保留单个数值
                            //
                            dataToXml((r.uniqBy(r.prop('branchId'))(docs)),meters,docs1,wzyxyBuildId);
                            page++;

                        //    TODO 下面的状态需要删除
                        //     readState = readEnum.READY;

                        }
                    })

                })
                break;
            default:
                console.error('no project to deal -----');
                break;

        }





    }else{
        console.log('reading, to wait ---- ');
    }

},xmlTime*1000);
//处理数据
// 区分来自各个地方不同的数据。
const dealData = (v)=>{
    if(!v){
        return;
    }
    let dataArr = v.split('\r\n');
    //多个地方都会传送数据过来，这里做个判断
    if(dataArr.length > 0 && dataArr[0].indexOf('330300A003')!= -1){
        console.log(' the 330300A003 project ');
        //TODO  这里要恢复，不然无法处理接收到的数据
        // return;
    }else{
        console.log('not the 330300A003 project ');
        dealXmlData(v);
        return ;


    }


    let itemJson = {};
    let itemArrs=[];
    r.map(y=>{
        let itemArr = y.split(';');
        if(itemArr.length==9){
            itemJson = {
                dayLine: itemArr[0],
                buildingId: itemArr[1].trim(),
                newBuildingId: '330302G101',//新编制的建筑id
                branchId: itemArr[2].trim(),
                //传感器标识
                branchName: itemArr[3].trim(),
                update: itemArr[4],
                lastupdate: itemArr[5],
                itemCode: itemArr[6].trim(),
                itemName: itemArr[7].trim(),
                value:itemArr[8]
            };
            itemArrs.push(itemJson);
            // console.log(itemJson);

        }else{
            console.error('item length != 9,data error');
        }

    })(dataArr);


    r.map(y=>{
        MongoDB.DataClient.findOne({
            dayLine:y.dayLine
        }).exec(
            function (err, item) {
                if(err){
                    return reject(err);
                }
                //如果不存在项目, 则不同步表信息
                if(!item){
                    var dataClient = new MongoDB.DataClient(y);

                    dataClient.save(function (err, res) {

                        if (err) {
                            console.log("Error:" + err);
                        }
                        else {
                            console.log("Res:" + res);
                        }

                    });
                }

            }
        );

    })(itemArrs);


    // MongoDB.DataClient.insertMany(itemArrs,function (err, docs) {
    //     if(err) console.log(err);
    //     console.log('保存成功：' + docs);
    // })


}
//处理xml类型的数据
const buildingIdArr = ['330302D151'];// 只有这里的建筑号才可以识别，防止乱数据搅乱平台已有数据
const dealXmlData = (v)=>{
    if(!v){
        return;
    }
    var buildingID ,gatewayID,command;
    //
    var xmlDoc = new xml.XmlDocument(v);

    //common
    {
        var commonNode = xmlDoc.childNamed('common');
        if(commonNode != undefined){
            buildingID = commonNode.childNamed('building_id').val;
            gatewayID = commonNode.childNamed('gateway_id').val;
            command = commonNode.childNamed('type').val;
        }
    }

    if(buildingIdArr.indexOf(buildingID)==-1 || command!='type'){
        console.error('not the right xml data:'+buildingID+'|'+command);
    }

    var metersNode = xmlDoc.childNamed('data').childrenNamed('meter');
    let itemJson = {};
    let itemArrs=[];
    if(metersNode && metersNode.length > 0){

        r.map(y=>{

                itemJson = {
                    dayLine: '',
                    buildingId: buildingID,
                    newBuildingId: '',//新编制的建筑id
                    branchId: y.attr?y.attr.id:'',
                    //传感器标识
                    branchName: (wzyxyBuildName[gatewayID]?wzyxyBuildName[gatewayID]:gatewayID)+'-'+codeType[y.childNamed('function').attr.coding],
                    update: '',
                    lastupdate: '',
                    gatewayId:gatewayID,
                    itemCode: y.childNamed('function').attr.coding,
                    itemName: codeType[y.childNamed('function').attr.coding],
                    value:y.childNamed('function').val
                };
                itemArrs.push(itemJson);
                // console.log(itemJson);


        })(metersNode);

    }

    r.map(y=>{
        MongoDB.DataClient.findOne({
            branchId:y.branchId,
            buildingId:y.buildingID,
            gatewayId:y.gatewayId,
        }).exec(
            function (err, item) {
                if(err){
                    return reject(err);
                }
                //如果不存在项目, 则不同步表信息
                if(!item){
                    var dataClient = new MongoDB.DataClient(y);

                    dataClient.save(function (err, res) {

                        if (err) {
                            console.log("Error:" + err);
                        }
                        else {
                            console.log("Res:" + res);
                        }

                    });
                }

            }
        );

    })(itemArrs);


    // MongoDB.DataClient.insertMany(itemArrs,function (err, docs) {
    //     if(err) console.log(err);
    //     console.log('保存成功：' + docs);
    // })


}

const createServer = ()=>{
    // 创建一个net.Server用来监听,当连接进来的时候，就会调用我们的函数
    server = net.createServer(function(client_sock) {
        console.log("client comming", client_sock.remoteAddress, client_sock.remotePort);
        // 设置你接受的格式,
        client_sock.setEncoding("utf8");
        // 客户端断开连接的时候处理,用户断线离开了
        client_sock.on("close", function() {
            console.log("close socket");
        });

        client_sock.on("data", function(data) {
            console.log('data: -------------- ');
            console.log(data);
            dealData(data);
            client_sock.write("ok");

            // client_sock.end(); // 正常关闭
        });


        client_sock.on("error", function(err) {
            console.log("error", err);
        });
    });

// 当我开始监听的时候就会调用这个回掉函数
    server.on("listening", function() {
        console.log("start listening...");
    });


// 监听发生错误的时候调用
    server.on("error", function() {
        console.log("listen error");
    });

    server.on("close", function() {
        console.log("server stop listener");
    });
    server.listen({
        port: port,
    });

}

MySQL.Load().then(
    ()=> {
        DeviceType.Run();
        MySQL.CollectorMonitor.sync();
        MongoDB(function(err) {
            if (err) {
                //
                log.debug(err);
            }
            else {



                // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
                dataToXmlInt();
                createServer();

                // const building_id = '330328A100';
                // const gateway_id = '09';
                //
                // const lastTime = '';
            }
        })
    })



// Promise.all([mongo()]).then ((mongoose) => {
//
//
//     const building_id = '330328A100';
//     const gateway_id = '09';
//
// // var interval = setInterval(check,5*1000);
// // function check() {
// //   console.log('check the socket --------');
// //   console.log(client);
// // }
//     const lastTime = '';
// //处理数据
//     const dealData = (v)=>{
//         if(!v){
//             return;
//         }
//         let dataArr = v.split('\r\n');
//         let itemJson = {};
//         let itemArrs=[];
//         r.map(y=>{
//             let itemArr = y.split(';');
//             if(itemArr.length==9){
//                 itemJson = {
//                     buildingId: itemArr[1],
//                     branchId: itemArr[2],
//                     //传感器标识
//                     branchName: itemArr[3],
//                     update: itemArr[4],
//                     lastupdate: itemArr[5],
//                     itemCode: itemArr[6],
//                     itemName: itemArr[7],
//                     value:itemArr[8]
//                 };
//                 itemArrs.push(itemJson);
//                 console.log(itemJson);
//
//             }else{
//                 console.error('item length != 9,data error');
//             }
//
//         })(dataArr);
//
//         mongo.DataClient.insertMany(itemArrs,function (err, docs) {
//             if(err) console.log(err);
//             console.log('保存成功：' + docs);
//         })
//
//
//     }
//
// // 创建一个net.Server用来监听,当连接进来的时候，就会调用我们的函数
// // client_sock,就是我们的与客户端通讯建立连接配对的socket
// // client_sock 就是与客户端通讯的net.Socket
//     var server = net.createServer(function(client_sock) {
//         console.log("client comming", client_sock.remoteAddress, client_sock.remotePort);
//         // 设置你接受的格式,
//         client_sock.setEncoding("utf8");
//         // client_sock.setEncoding("binary");
//         // client_sock.setEncoding("hex"); // 转成二进制的文本编码
//         // 客户端断开连接的时候处理,用户断线离开了
//         client_sock.on("close", function() {
//             console.log("close socket");
//         });
//
//         // 接收到客户端的数据，调用这个函数
//         // data 默认是Buffer对象，如果你强制设置为utf8,那么底层会先转换成utf8的字符串，传给你
//         // hex 底层会把这个Buffer对象转成二进制字符串传给你
//         // 如果你没有设置任何编码 <Buffer 48 65 6c 6c 6f 57 6f 72 6c 64 21>
//         // utf8 --> HelloWorld!!!   hex--> "48656c6c6f576f726c6421"
//         client_sock.on("data", function(data) {
//             console.log(data);
//             dealData(data);
//             client_sock.write("ok");
//
//             // client_sock.end(); // 正常关闭
//         });
//
//
//         client_sock.on("error", function(err) {
//             console.log("error", err);
//         });
//     });
//
// // 当我开始监听的时候就会调用这个回掉函数
//     server.on("listening", function() {
//         console.log("start listening...");
//     });
//
//
// // 监听发生错误的时候调用
//     server.on("error", function() {
//         console.log("listen error");
//     });
//
//     server.on("close", function() {
//         console.log("server stop listener");
//     });
//     /*
//     server.on("connection", function(client_sock) {
//         console.log("client comming 22222");
//     });
//     */
// // 编写代码，指示这个server监听到哪个端口上面。
// // 127.0.0.1: 6080
// // node就会来监听我们的server,等待连接接入
//     server.listen({
//         port: 8194,
//         // host: "127.0.0.1",
//         // host: "127.0.0.1",
//         // exclusive: true,
//     });
//
// // 停止node对server的监听事件处理，那么node就没有其他的事件要处理，所以就退出了。
// // server.unref(); // 取消node,对server的事件的监听；
// // server.close(); // 主动的掉这个server.close才会触发这个net.Server的close事件
//
//
//
// })




