var _ = require('underscore');
var config = require('config');
var moment = require('moment');
var uuid = require('uuid');
var crypto = require('crypto');
var url = require('url');
var r = require('ramda');
var NetDAU485 = require('../module/driver/driver/NetDAU_Test/NetDAU485Test');
// // //add 20191009
// // const {setCache,cacheOr,readCache} = require('../../libs/cache');
// //
// // setCache(userInfo.user, 1);
// // console.log(cacheOr(userInfo.user, 1)());
var net = require('net');
var signal = require('../module/driver/driver/NetDAU_Test/common/signal');
var Message = require('../module/driver/driver/NetDAU_Test/common/message');

var include = require('include-node');
require('../libs/log')(config.name);
var dLoad = require('../libs/dload');
{
  // global.MongoDB = require('../libs/mongodb');
  // global.MySQL = dLoad('../libs/mysql');
  // global.CollectorPool = require('../libs/collectorPool');
  global.Util = dLoad('/libs/util2');
}


// // const readline = require('readline');
// // const rl = readline.createInterface({
// //     input: process.stdin,
// //     output: process.stdout
// // });
// // var inputArr = [];
// //
// //
// // rl.on('close', function() {
// //     console.log('程序结束');
// //     process.exit(0);
// // });
//
//
// var HOST = '127.0.0.1';
// var PORT = 6969;
//crc 校验start ----------------------
var md5Salt = "IJKLMNOPQRSTUVWX";

var crcTable = [
    0x0000,0x1021,0x2042,0x3063,0x4084,0x50a5,0x60c6,0x70e7,
    0x8108,0x9129,0xa14a,0xb16b,0xc18c,0xd1ad,0xe1ce,0xf1ef,
    0x1231,0x0210,0x3273,0x2252,0x52b5,0x4294,0x72f7,0x62d6,
    0x9339,0x8318,0xb37b,0xa35a,0xd3bd,0xc39c,0xf3ff,0xe3de,
    0x2462,0x3443,0x0420,0x1401,0x64e6,0x74c7,0x44a4,0x5485,
    0xa56a,0xb54b,0x8528,0x9509,0xe5ee,0xf5cf,0xc5ac,0xd58d,
    0x3653,0x2672,0x1611,0x0630,0x76d7,0x66f6,0x5695,0x46b4,
    0xb75b,0xa77a,0x9719,0x8738,0xf7df,0xe7fe,0xd79d,0xc7bc,
    0x48c4,0x58e5,0x6886,0x78a7,0x0840,0x1861,0x2802,0x3823,
    0xc9cc,0xd9ed,0xe98e,0xf9af,0x8948,0x9969,0xa90a,0xb92b,
    0x5af5,0x4ad4,0x7ab7,0x6a96,0x1a71,0x0a50,0x3a33,0x2a12,
    0xdbfd,0xcbdc,0xfbbf,0xeb9e,0x9b79,0x8b58,0xbb3b,0xab1a,
    0x6ca6,0x7c87,0x4ce4,0x5cc5,0x2c22,0x3c03,0x0c60,0x1c41,
    0xedae,0xfd8f,0xcdec,0xddcd,0xad2a,0xbd0b,0x8d68,0x9d49,
    0x7e97,0x6eb6,0x5ed5,0x4ef4,0x3e13,0x2e32,0x1e51,0x0e70,
    0xff9f,0xefbe,0xdfdd,0xcffc,0xbf1b,0xaf3a,0x9f59,0x8f78,
    0x9188,0x81a9,0xb1ca,0xa1eb,0xd10c,0xc12d,0xf14e,0xe16f,
    0x1080,0x00a1,0x30c2,0x20e3,0x5004,0x4025,0x7046,0x6067,
    0x83b9,0x9398,0xa3fb,0xb3da,0xc33d,0xd31c,0xe37f,0xf35e,
    0x02b1,0x1290,0x22f3,0x32d2,0x4235,0x5214,0x6277,0x7256,
    0xb5ea,0xa5cb,0x95a8,0x8589,0xf56e,0xe54f,0xd52c,0xc50d,
    0x34e2,0x24c3,0x14a0,0x0481,0x7466,0x6447,0x5424,0x4405,
    0xa7db,0xb7fa,0x8799,0x97b8,0xe75f,0xf77e,0xc71d,0xd73c,
    0x26d3,0x36f2,0x0691,0x16b0,0x6657,0x7676,0x4615,0x5634,
    0xd94c,0xc96d,0xf90e,0xe92f,0x99c8,0x89e9,0xb98a,0xa9ab,
    0x5844,0x4865,0x7806,0x6827,0x18c0,0x08e1,0x3882,0x28a3,
    0xcb7d,0xdb5c,0xeb3f,0xfb1e,0x8bf9,0x9bd8,0xabbb,0xbb9a,
    0x4a75,0x5a54,0x6a37,0x7a16,0x0af1,0x1ad0,0x2ab3,0x3a92,
    0xfd2e,0xed0f,0xdd6c,0xcd4d,0xbdaa,0xad8b,0x9de8,0x8dc9,
    0x7c26,0x6c07,0x5c64,0x4c45,0x3ca2,0x2c83,0x1ce0,0x0cc1,
    0xef1f,0xff3e,0xcf5d,0xdf7c,0xaf9b,0xbfba,0x8fd9,0x9ff8,
    0x6e17,0x7e36,0x4e55,0x5e74,0x2e93,0x3eb2,0x0ed1,0x1ef0
];

var keyArray = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10];
var key = new Buffer(keyArray, 'binary');
var iv = new Buffer(keyArray, 'binary');

const CRCData = function(buffer)
{
    var crc = 0;
    var by;
    for(var i=0; i< buffer.length; i++){
        by = (crc>>8) & 0xff;
        //var log = by.toString(16) + '\t';
        crc = ((crc & 0xffff) << 8) & 0xffff;
        //log += crc.toString(16) + '\t';
        crc = (crc ^ crcTable[(buffer.readInt8(i)^by)&0xff]) & 0xffff;
        //log += crc.toString(16);
        //log.debug(log)
    }
    return crc;
};
//crc  校验end
const intToHexArray = (value)=> {
    var pos = 0;
    var hexStr = value.toString(16);
    var len = hexStr.length/2;

    var hexA = new Array();
    for (var i = 0; i < len; i++) {
        var s = hexStr.substr(pos, 2);
        hexA.push(s);
        pos += 2;
    }
    return hexA;



}
const cipher = crypto.createCipheriv('aes-128-cbc', key, key);
cipher.setAutoPadding(false);
// 加密
// const genSign = (src, key, iv)=>  {
//     var sign = '';
//     const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
//     sign += cipher.update(src, 'binary', 'binary');
//     sign += cipher.final('binary');
//     return sign;
// }




// ------------------test socket

const startTag = 0x55aa55aa;
const endTag = 0x68681616;


// start lizi

// 加密
function genSign(src, key, iv) {
  var sign = '';
  const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
  sign += cipher.update(src, 'binary', 'binary');
  sign += cipher.final('binary');
  return sign;

}

// 解密
const DecodeMessage=(sign, key, iv) =>{
  var src = '';
  // const cipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  // src += cipher.update(sign, 'binary', 'binary');
  // src += cipher.final('binary');


  // var cipherBuffer = null;
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  // decipher.setAutoPadding(false);
  //var decData = new Buffer( decipher.update(cipherBuffer, 'binary', 'utf8') + decipher.final('utf8'));
  // var decData =  decipher.update(sign, 'binary', 'binary') + decipher.final('binary');
  src += decipher.update(sign, 'binary', 'binary');
  // src += decipher.final('binary');
  return src;

}

//--------- 解密
const deSign = (src, key, iv) => {
  var sign = '';
  const cipher2 = crypto.createCipheriv('aes-128-cbc', key, iv);
  sign += cipher2.update(src, 'binary', 'binary');
  sign += cipher2.final('binary');
  return src;
  // var cipherBuffer = null;
  // if(typeof(buffer) != "Buffer"){
  //     //
  //     cipherBuffer = new Buffer(buffer, 'binary');
  // }
  // else{
  //     cipherBuffer = cipher;
  // }
  // var decipher = crypto.createDecipheriv('aes-128-cbc', key, key);
  // decipher.setAutoPadding(false);
  // //var decData = new Buffer( decipher.update(cipherBuffer, 'binary', 'utf8') + decipher.final('utf8'));
  // var decData = new Buffer( decipher.update(cipherBuffer, 'binary', 'binary') + decipher.final('binary'));
  //
  // return decData;

};


const dataMake = (xmlData)=>{
  var header = new Buffer(4);
  header.writeUInt32BE(startTag, 0);
  var tail = new Buffer(4);
  tail.writeUInt32BE(endTag, 0);
  // var aesmsg = genSign(packageModule,key,key);
  // var msg = new Buffer(genSign(packageModule, key, key),'binary');
  // var msg2 = new Buffer( cipher.update(packageModule, 'binary', 'binary') + cipher.final('binary'));
  var src = cipher.update(xmlData, 'binary', 'binary');
  var src2=''+src;
  var numUnit = 8;
  if(src.length%numUnit!=0){

    console.log('began pinjie:----------');
    for(var i =0 ;i<numUnit-(src.length%numUnit);i++){
      src2+=' ';
    }
    console.log('end pinjie:----------'+src2);
  }
  // var msg = new Buffer(src2  + cipher.final('binary'),'binary');
  var msg = new Buffer(src,'binary');
  console.log('origin:-----' + msg.toString('binary'));
  var validMsg2= new Buffer(msg.length+4);//1
  // var validMsg2= new Buffer(msg.length);//1
  // var validMsg2= new Buffer(msg.length );

  msg.copy(validMsg2, 4, 0,msg.length);//2
  if(msg%16!=0){
    console.log('luanma ------------');
  }



// msg.copy(validMsg2, 0, 0,msg.length);//2

//<===============
// ase-128-cbc 加密算法要求key和iv长度都为16
// const sign = genSign(packageModule, key, key);
// console.log(sign); // 764a669609b0c9b041faeec0d572fd7a


// 解密
// const src=deSign(validMsg2.slice(4,validMsg2.length), key, key);

// console.log('decode:'+src);
//==============>
  console.log('start decode');
  console.log('：------------'+DecodeMessage(validMsg2.slice(4,validMsg2.length), key, key));//3
// console.log('：------------'+DecodeMessage(validMsg2));//3
  console.log('end decode');
  var calcCRC = CRCData(validMsg2);
  // var calcCRC = CRCData(msg);



  var msg5 = new Buffer(2);
  msg5.writeUInt16LE(calcCRC,0)

  var length = new Buffer(4);






  length.writeUInt32LE(validMsg2.length, 0);// 这里不包括msg4的数值
  var sendMsg = Buffer.concat(
    // new Array(new Buffer(header.length + packageModule.length + tail.length +'','utf-8'),header, msg, tail)
    new Array(header, length,validMsg2,msg5, tail)
    ,header.length + length.length+validMsg2.length +msg5.length + tail.length

  );
  var data = sendMsg.slice(4, 10);
  var validDataLength = data.readUInt32LE(0);
  console.log(sendMsg);
  console.log(data);
  console.log(validDataLength);
}

const building_id = '330328A100';
const gateway_id = '09';

// var req = '<root>' +
//   '  <common>' +
//   '    <building_id>330328A100</building_id>' +
//   '    <gateway_id>09</gateway_id>' +
//   '    <type>request</type>' +
//   '  </common>' +
//   '  <id_validate operation="request"/>' +
//   '</root>';


//  ---s ---

//---e ---

// 第一步， req  md5 计算
const MD5reate = (seq) =>{
  var hash = require('crypto').createHash('md5');
  var saltHash = seq.toString() + md5Salt;
  var hashSeq = hash.update(saltHash).digest('hex');
}




// var client = new net.Socket();
// client.setEncoding('binary');// client.setEncoding('GB2312');
// client.connect(8193, 'localhost', function(){


// // ase-128-cbc 加密算法要求key和iv长度都为16
// const key2 = Buffer.from('9vApxLk5G3PAsJrM', 'binary');
// const iv = Buffer.from('FnJL7EDzjqWjcaY9', 'binary');
// const sign = genSign('hello world', key2, iv);
// console.log(sign); // 764a669609b0c9b041faeec0d572fd7a
//
//
// // 解密
// const key3 = Buffer.from('9vApxLk5G3PAsJrM', 'binary');
// const iv2 = Buffer.from('FnJL7EDzjqWjcaY9', 'binary');
// const src=deSign('764a669609b0c9b041faeec0d572fd7a', key3, iv2);
// console.log(src); // hello world
    // end lizi
  var req = '<?xml version="1.0" encoding="GB2312" ?>' +
    '<root>' +
    '  <common>' +
    '    <building_id>330302D101</building_id>' +
    '    <gateway_id>01</gateway_id>' +
    '    <type>request</type>' +
    '  </common>' +
    '  <id_validate operation="request"/>' +
    '</root>';




    console.log('already connected to server');
    // var packageModule = 'hfghfo';
    // var packageModule = '<?xml version="1.0" encoding="utf-8" ?>' +
    //     '<root>' +
    //     '<common>' +
    //     '<building_id></building_id>' +
    //     '<gateway_id></gateway_id >' +
    //     '<type>result</type>' +
    //     '</common>' +
    //     '<id_validate operation="result">' +
    //     '<result></result>' +
    //     '</id_validate>' +
    //     '</root>';

  var header = new Buffer(4);
  header.writeUInt32BE(startTag, 0);
  var tail = new Buffer(4);
  tail.writeUInt32BE(endTag, 0);
  // var aesmsg = genSign(packageModule,key,key);

  // var msg = new Buffer(genSign(packageModule, key, key),'binary');
  // var msg2 = new Buffer( cipher.update(packageModule, 'binary', 'binary') + cipher.final('binary'));
  // var src = cipher.update(report, 'binary', 'binary');
  var src = cipher.update(req, 'binary', 'binary');
  var src2=''+src;
  var numUnit = 8;
  if(src.length%numUnit!=0){

    console.log('began pinjie:----------');
    for(var i =0 ;i<numUnit-(src.length%numUnit);i++){
      src2+=' ';
    }
    console.log('end pinjie:----------'+src2);
  }
  // var msg = new Buffer(src2  + cipher.final('binary'),'binary');
  var msg = new Buffer(src,'binary');
  console.log('origin:-----' + msg.toString('binary'));
  var validMsg2= new Buffer(msg.length+4);//1
  // var validMsg2= new Buffer(msg.length);//1
  // var validMsg2= new Buffer(msg.length );

  msg.copy(validMsg2, 4, 0,msg.length);//2
  if(msg%16!=0){
    console.log('luanma ------------');
  }



// msg.copy(validMsg2, 0, 0,msg.length);//2

//<===============
// ase-128-cbc 加密算法要求key和iv长度都为16
// const sign = genSign(packageModule, key, key);
// console.log(sign); // 764a669609b0c9b041faeec0d572fd7a


// 解密
// const src=deSign(validMsg2.slice(4,validMsg2.length), key, key);

// console.log('decode:'+src);
//==============>
  console.log('start decode');
  console.log('：------------'+DecodeMessage(validMsg2.slice(4,validMsg2.length), key, key));//3
// console.log('：------------'+DecodeMessage(validMsg2));//3
  console.log('end decode');
  var calcCRC = CRCData(validMsg2);
  // var calcCRC = CRCData(msg);



  var msg5 = new Buffer(2);
  msg5.writeUInt16LE(calcCRC,0)

  var length = new Buffer(4);






  length.writeUInt32LE(validMsg2.length, 0);// 这里不包括msg4的数值
  var sendMsg = Buffer.concat(
    // new Array(new Buffer(header.length + packageModule.length + tail.length +'','utf-8'),header, msg, tail)
    new Array(header, length,validMsg2,msg5, tail)
    ,header.length + length.length+validMsg2.length +msg5.length + tail.length

  );
  var data = sendMsg.slice(4, 10);
  var validDataLength = data.readUInt32LE(0);
  // console.log(sendMsg);
  // console.log(data);
  // console.log(validDataLength);

  //----- s -----
  var seq = new signal.Request();
  seq.buildingID = building_id;
  seq.gatewayID = gateway_id;


  var ackMsg = Message();
  ackMsg.Clone(msg);
  ackMsg.message = seq.Serilize();

  var buffer = signal.pack(ackMsg.Serilize())

  // this.write(buffer, 'binary');

var res = ''
console.log('origin-length:'+buffer.length);
buffer=r.map(y=>{
  var x = y.toString(16);
  if(x.length<2){
    x='0'+x;
  }
  res+=x;
  return x})(buffer)
console.log(buffer);
console.log(res);


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

// });

// const netDau = NetDAU485.Alloc(client);
// client.on('data', function(data){
//     // console.log('received data from server is :' + data);
//   var receive = new Buffer(data, "binary");
//   // var netDau = NetDAU485.Alloc(client);
//   netDau.parse(receive);
//
//
// });




// ------------------ test writeUint32BE
// var packageModule = '/root>';
// // buf.write(string,[offset],[length],[encoding]);
// //header.length + msg.length + tail.length,
// var header = new Buffer(4);
// header.writeUInt32BE(startTag, 0);
// var tail = new Buffer(4);
// tail.writeUInt32BE(endTag, 0);
// var msg = new Buffer(packageModule,'utf-8');
// var length = new Buffer(4);
// const buf = Buffer.from([0x12, 0x34]);
// length.writeUInt32BE(header.length + packageModule.length + tail.length, 0);
// var sendMsg = Buffer.concat(
//     // new Array(new Buffer(header.length + packageModule.length + tail.length +'','utf-8'),header, msg, tail)
//     new Array(header, msg, tail,buf)
//
// );
// console.info(sendMsg.readUInt32LE(0));
//
//

// ------ buffer  test
// const buf2 = Buffer.from([0x12, 0x56, 0x34, 0x78]);
//
// console.log(buf2);
//
// console.log(buf2.readUInt32BE(0).toString(16));
// // 打印: 12345678
// console.log(buf2.readUInt32LE(0).toString(16));
// // 打印: 78563412
//
// const buf = Buffer.allocUnsafe(6);
//
// buf.writeUIntBE(0x1234567890ab, 0, 6);
//
// // 输出: <Buffer 12 34 56 78 90 ab>
// console.log(buf);
// console.log(buf.readUInt32LE(0).toString(16));
//
// var buffer = Buffer.from([
//     0x12,
//     0x0,
//     0x0,
//     0x0,
//     0x62]);
// var validDataLength = buffer.readUInt32LE(0).toString(16);
// console.log(validDataLength); //1869574703
//
// var buffer2 = Buffer.from([
//     1,
//     0,
//     0,
//     0,
//     111,
//     0x66,
//     0x89
// ]);
// var validdata = Buffer.from([
//     1,
//     0,
//     0,
//     0,
//     111,
//     111,
//     111
// ]);
// var validDataLength2 = buffer2.readUInt32LE(0);
// // console.log(validDataLength2); //1869574703
// var validData = new Buffer(validDataLength2);
// var index =0;
//
// index += 4;
//
// buffer2.copy(validData, 0, index);
// index += validDataLength2;
// // console.log(buffer2.readUInt16LE(4));
// var calcCRC = CRCData(validdata);
// var crc = buffer2.readUInt16LE(index);
// console.log(calcCRC);
// console.log(crc);





// var arr = [0,1,2,3]
// arr.splice(0,0,4);
// console.log(arr);
// var data =
// {
//   "total": 157.52,
//   "5d6cd030a59c7200126be563": {
//   "water": 0,
//     "electricity": 76.43,
//     "ac": 0,
//     "gas": 0
// },
//   "5d8d7cb9c22578443831be2e": {
//   "water": 0,
//     "electricity": 56.879999999999995,
//     "ac": 0,
//     "gas": 0
// },
//   "5e1525d8e07f793894e6c0f7": {
//   "water": 0,
//     "electricity": 24.21,
//     "ac": 0,
//     "gas": 0
// }
// }

const trans = (dataBuff)=>{
  var res = ''
  console.log('origin-length:'+dataBuff.length);
  dataBuff=r.map(y=>{
    var x = y.toString(16);
    if(x.length<2){
      x='0'+x;
    }
    res+=x;
    return x})(dataBuff)
  console.log(dataBuff);
  console.log(res);
}