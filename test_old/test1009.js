var _ = require('underscore');
var config = require('config');
var moment = require('moment');
var uuid = require('uuid');
var crypto = require('crypto');
var url = require('url');
var fs = require("fs");
var iconv = require("iconv-lite");
var NetDAU485 = require('../module/driver/driver/NetDAU_Test/NetDAU485Test');
var net = require('net');
var signal = require('../module/driver/driver/NetDAU_Test/common/signal');
var Message = require('../module/driver/driver/NetDAU_Test/common/message');


require('../libs/log')(config.name);
var dLoad = require('../libs/dload');
{
  global.Util = dLoad('/libs/util2');
}
const filePath = 'E:\\项目\\能源\\数据迁移\\工控机程序\\collecteddata_20200427.data';

var client;

const building_id = '330328A100';
const gateway_id = '09';


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




    //处理完成
    readState = readEnum.READY;
    cb([])

}




var dataToXml = function(docs,meters,_this){
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
        transXml(docs,meters,_this);
    }
//readState = readEnum.READY;





}

//开始读取mongo中的数据
// 处理完成之后就删除吧
const dataToXmlInt =(_this)=> setInterval(function () {


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
                    dataToXml(docs,meters,_this);
                    page++;
                }
            })

        })


    }else{
        console.log('reading, to wait ---- ');
    }

},xmlTime*1000,_this);



var stop = true;
if(stop){
  console.log('stop---');
  return;
}

client= new net.Socket();
client.setEncoding('binary');// client.setEncoding('GB2312');  默认就是binary
client.connect(8193, 'localhost', function(){
// client.connect(8191, 'testiot.wznhjc.cn', function(){
// 启动数据读取，识别，发送
    dataToXmlInt(this);

  //----- s -----
  // var seq = new signal.Request();
  // seq.buildingID = building_id;
  // seq.gatewayID = gateway_id;
  // var msg = Message();
  //
  // var ackMsg = Message();
  // ackMsg.Clone(msg);
  // ackMsg.message = seq.Serilize();
  //
  // var buffer = signal.pack(ackMsg.Serilize());
  //
  // this.write(buffer, 'binary');

  // ----- e -----


  //  console input to repeat test  ---------- s ----------

  // process.stdin.setEncoding('utf8');
  //
  // process.stdin.on('readable', () => {
  //   var chunk = process.stdin.read();
  //   if (chunk !== null) {
  //     process.stdout.write(`data: ${chunk}`);
  //     client.write(sendMsg);
  //   }
  // });
  //
  // process.stdin.on('end', () => {
  //   process.stdout.write('end');
  //
  // });

    // ------------------------ e -------------------

});

const netDau = NetDAU485.Alloc(client);
client.on('data', function(data){
    // console.log('received data from server is :' + data);
  var receive = new Buffer(data, "binary");
  // var netDau = NetDAU485.Alloc(client);
  netDau.parse(receive);


});


