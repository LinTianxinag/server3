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
var autoInit = require('./libs/autoInit');
var config = require('config');
var signal = require('./module/driver/driver/NetDAU_Test/common/signal');
var Message = require('./module/driver/driver/NetDAU_Test/common/message');
var dataSaving = require('./module/driver/driver/NetDAU_Test/common/dataSaving');
require('./libs/log')(config.name);
var xmlTime = 20;//处理发送xml的间隔 s
var page = 1;
var size = 100;
var port = 8194;
var first = true;
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
const building_id = '330302G101';
const gateway_id = '01';
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
const transXml = (docs,meters,cb)=>{
    //第一次 ，进行archive处理
    if(first){
        first=false;
        console.log('first , to archive -------');
        //不管自动初始化是否成功，数据还是需要接收的
        // var archivesAck = new signal.ArchivesAck();
        // archivesAck.buildingID = building_id;
        // archivesAck.gatewayID = gateway_id;
        // archivesAck.buildingName = 'test';
        // archivesAck.protocols = [{$:{id:'2',  type:"2", mType:"1",name:"TCPTest", mutiple:"1" ,type188:"00"},
        //     item:{$:{id:"01",mflag:"1",fnId:"01",name:"ZXYG",cmd:"11",di:"00000000",offset:"00",len:"04",dt:"10",calc:"d/100"}}}];
        // archivesAck.meter = [{$:{id:'001',meterId:'001',addr:'00000000000001',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}},
        //     {$:{id:'002',meterId:'002',addr:'00000000000002',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}}];
        var archivesInfo = new signal.ArchivesInfoClient();
        archivesInfo.buildingID = building_id;
        archivesInfo.gatewayID = gateway_id;
        archivesInfo.buildingName = 'test';
        // archivesInfo.protocols = [{$:{id:'2',  type:"2", mType:"1",name:"TCPTest", mutiple:"1" ,type188:"00"},
        //     item:{$:{id:"01",mflag:"1",fnId:"01",name:"ZXYG",cmd:"11",di:"00000000",offset:"00",len:"04",dt:"10",calc:"d/100"}}}];
        // archivesAck.meter = [{$:{id:'a01',meterId:'a01',addr:'000000000abc01',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}},
        //     {$:{id:'a02',meterId:'a02',addr:'000000000abc02',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}}];

        // archivesInfo.protocols = [{id:'2',  type:"2", mType:"1",name:"TCPTest", mutiple:"1" ,type188:"00"}
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
            /*item:{$:{id:"01",mflag:"1",fnId:"01",name:"ZXYG",cmd:"11",di:"00000000",offset:"00",len:"04",dt:"10",calc:"d/100"}}*/
        // archivesAck.meter = [{$:{id:'a01',meterId:'a01',addr:'000000000abc01',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}},
        //     {$:{id:'a02',meterId:'a02',addr:'000000000abc02',mType:'02',com:"1",comType:"02",tUnit:'1',comType:"02",code:'01B00',ct:'1',memo:'testMeter',pt:'1',sampleId:'01'}}];
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
        for(var key in meters){
            archivesInfo.meters.push(
                {
                    mtype: '02',
                    comport: "1",
                    addrid:meters[key].meterReportId,
                    meterid: meters[key].meterManagerId,
                    memo: meters[key].branchName,
                    sampleId: '01',
                    code: '01B00'
                }
            )
        }
        // r.map(y=>{archivesInfo.meters.push(
        //     {
        //             mtype: '02',
        //             comport: "1",
        //             addrid:y.meterReportId,
        //             meterid: y.meterManagerId,
        //             memo: y.branchName,
        //             sampleId: '01',
        //             code: '01B00'
        //     }
        // )})(meters);

        var deviceInfo = new signal.DeviceInfo();
        deviceInfo.command=signal.DEVICEINFO;
        deviceInfo.buildingID = building_id;
        deviceInfo.gatewayID = gateway_id;

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


        autoInit.Init(archivesInfo, deviceInfo).then(
            function (result) {
                // log.warn('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                // _this.status = ONLINE;
            }, function (err) {
                // log.error('DEVICEINFO', _this.sock.remoteAddress + ':' + _this.sock.remotePort, msg.buildingID + msg.gatewayID, 'ONLINE');
                // _this.status = ONLINE;
            }
        );


    }else{
    //    不是第一次，进行数据的发送

         // var report = new signal.ReportClient();
         //  report.buildingID = msg.buildingID;
         //  report.gatewayID = msg.gatewayID;
         //  report.time = moment(new Date()).format("YYYYMMDDHHmmss");
         //  // report.time = moment.now();
         //  // report.time = 20200325183258;
         //  report.sequence='1000';
         //  report.meter=[{$:{id:'a01',meterId:'a01',addr:'0000000abc01',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter1'},
         //    'function':{$:{id:'01', coding:'01B00',error:'192'},_:arr[0]}},
         //                {$:{id:'a02',meterId:'a02',addr:'0000000abc02',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter2'},
         //                  'function':{$:{id:'01', coding:'01B00',error:'192'},_:arr[1]}}];

        var value = (moment(new Date()).format("MMDDHHmm"))/100;
        var arr = [];
        arr[0]=value;
        arr[1]=value;
        let report = {time:moment(new Date()).format("YYYYMMDDHHmmss"),meters:[
            // {id:'001',meterId:'001',addr:'000000000001',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter',
            //     'funcs':[{id:'01', coding:'01B00',error:'192',val:arr[0]}]},
            //     {id:'002',meterId:'002',addr:'000000000002',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter',
            //         'funcs':[{id:'01', coding:'01B00',error:'192',val:arr[0]}]}
                    ]};
        // docs.forEach(function (v,i) {
        //     report.meters.push(
        //         {id:'a01',meterId:'a01',addr:'0000000abc01',com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:'testMeter',pt:'1',sampleId:'01',name:'meter',
        //             'funcs':[{id:'01', coding:'01B00',error:'192',val:arr[0]}]},
        //
        //     );
        // })
        r.map(y=>{
            // let data = "W=372076.80,last_w=372075.90";
            let js = {};
            // console.log(
            //     r.map(y=>{
            //         var ar = y.split('=');
            //         js[ar[0]]=ar[1];
            //     })(y.value.split(','))
            // );
            // console.log(js);
            report.meters.push(
                {id:meters[y.branchId].meterManagerId,meterId:meters[y.branchId].meterManagerId,addr:meters[y.branchId].meterReportId,com:'1',mType:'02',tUnit:'1',code:'01B00',tp:'202',memo:y.branchName,pt:'1',sampleId:'01',name:'meter',
                'funcs':[{id:'01', coding:'01B00',error:'192',val:js.W}]});

        })(docs);



        dataSaving.SavingClient(report,building_id,gateway_id);
        setTimeout(function () {
            readState = readEnum.READY;
        },10*1000)

        // dataSaving.Saving(msg.message.toString());


    }



    //处理完成
    readState = readEnum.READY;
    cb([])

}




var dataToXml = function(docs,meters,docs1){
    if(!docs||docs.length==0){
        console.log('no data');
        return;
    }
    var uniqueNew = [];
    var meterId = docs1.length+1;
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

        //Good.find({}).skip(page * 5).limit(5).sort({'_id':-1}).exec(cb);
        MongoDB.Meter.find({"buildingId" : "330300A003"}).exec(function (err, docs1) {
            // 这里一个建筑一个meters，不能一个meters所有建筑共用
            // meters = r.map(({branchId,buildingId,branchName,itemCode,itemName})=>({[branchId]:{buildingId,branchName,itemCode,itemName}}))(docs);
            let resJson = {};
            r.map(({branchId,buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId})=>{
                resJson[branchId]=({buildingId,branchName,itemCode,itemName,meterManagerId,meterReportId})
            })(docs1);
            // console.log(resJson);
            meters = resJson;

            readState = readEnum.READING;
            addMeters=[];
            nowMeter='';
            gatewayNum = 0;
            // 测试用
            //TODO  这里buildingId 错误，需要修改,
            //
            // MongoDB.DataClient.find({"buildingId" : " 330300A003"}).skip((page-1)*size).limit(size).sort({'update':1}).exec(function (err,docs) {   //exec最后使用
                MongoDB.DataClient.find({"buildingId" : " 330300A003","serverTime":{$gte: moment().subtract(1, 'hour'), $lte: moment()}}).limit(size).sort({'update':-1}).exec(function (err,docs) {   //exec最后使用
                if(err){  //失败
                    console.error('find data error,mongo:---');
                }else{   //成功
                    // console.log(docs);
                    //查询多个数值，sort是倒序，uniq后保留单个数值
                    // TODO  这里要恢复
                    // dataToXml((r.uniqBy(r.prop('branchId'))(docs)),meters,docs1);
                    page++;
                }
            })

        })


    }else{
        console.log('reading, to wait ---- ');
    }

},xmlTime*1000);
//处理数据
const dealData = (v)=>{
    if(!v){
        return;
    }
    let dataArr = v.split('\r\n');
    let itemJson = {};
    let itemArrs=[];
    r.map(y=>{
        let itemArr = y.split(';');
        if(itemArr.length==9){
            itemJson = {
                dayLine: itemArr[0],
                buildingId: itemArr[1].trim(),
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
            console.log(itemJson);

        }else{
            console.error('item length != 9,data error');
        }

    })(dataArr);

    MongoDB.DataClient.findOne({
        dayLine:itemJson.dayLine
    }).exec(
        function (err, item) {
            if(err){
                return reject(err);
            }
            //如果不存在项目, 则不同步表信息
            if(!item){
                var dataClient = new MongoDB.DataClient(itemJson);

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



