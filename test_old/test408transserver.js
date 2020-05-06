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

const building_id = '330302D110';
const gateway_id = '01';

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
    '    <building_id>330302D110</building_id>' +
    '    <gateway_id>01</gateway_id>' +
    '    <type>request</type>' +
    '  </common>' +
    '  <id_validate operation="request"/>' +
    '</root>';
var md5Create = 'af279ab76f9998ca9f615b3c19f0c4dd';
var md5Req = '<?xml version="1.0" encoding="utf-8" ?>' +
  '<root>' +
  '<common><building_id>330302D110</building_id><gateway_id>01</gateway_id>' +
  '<type>md5</type>' +
  '</common>' +
  '<id_validate operation="md5"><md5>'+md5Create+'</md5>' +
  '</id_validate>' +
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
creteBuffer(req);

  function creteBuffer(req) {
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

      // console.log('began pinjie:----------');
      for(var i =0 ;i<numUnit-(src.length%numUnit);i++){
        src2+=' ';
      }
      // console.log('end pinjie:----------'+src2);
    }
    // var msg = new Buffer(src2  + cipher.final('binary'),'binary');
    var msg = new Buffer(src,'binary');
    // console.log('origin:-----' + msg.toString('binary'));
    var validMsg2= new Buffer(msg.length+4);//1
    // var validMsg2= new Buffer(msg.length);//1
    // var validMsg2= new Buffer(msg.length );

    msg.copy(validMsg2, 4, 0,msg.length);//2
    if(msg%16!=0){
      // console.log('luanma ------------');
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
//     console.log('start decode');
    // console.log('：------------'+DecodeMessage(validMsg2.slice(4,validMsg2.length), key, key));//3
    DecodeMessage(validMsg2.slice(4,validMsg2.length), key, key);//3
// console.log('：------------'+DecodeMessage(validMsg2));//3
//     console.log('end decode');
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
    var res = ''
    console.log('origin-length:'+buffer.length);
    buffer=r.map(y=>{
      var x = y.toString(16);
      if(x.length<2){
        x='0'+x;
      }
      res+=x;
      return x})(buffer)
    console.log('the data to req--------- ');
    console.log(buffer);
    console.log(res);
  }

  // this.write(buffer, 'binary');



// 这里处理接收的数据的内容------------
var origin = '' +
  '55 AA 55 AA F4 00 00 00 00 01 00 00 BC FD 43 78 A5 DF B4 25 C4 5E 3F 90 69 FA 0A E3 28 75 22 73 14 9D 7B 89 7A 76 9B E1 75 3D FD 6C CA E9 F2 21 B9 DA 9B 15 95 A8 0B 31 A0 DC AA DE B9 13 96 C4 1F A9 40 50 BE 0B AA 6D BB 17 DD 96 AF 8E 39 88 16 A2 2D C1 68 D4 1E 59 4C 3E B8 A1 1D BE 19 FE 4F 60 7D E5 63 2F B6 26 4A 6E 12 0E 38 DE E2 E1 F2 4B 62 00 9A 48 F5 B1 90 B3 C2 3C 8F 7E C1 FC 77 8B 1A A5 5D 85 47 F9 07 3A 74 B7 E7 B1 A3 6A 2A 70 F4 8E C2 6B 55 B2 57 96 D4 A2 D0 FA B5 2D DA 14 7C 4E D8 19 2C FE 5A 97 CD 47 F8 FA CF 0C D4 FD 26 67 C2 D6 EF 51 A1 4A D8 5A 21 BD 74 83 B0 B3 FD 34 A5 44 0F FB 3B 01 79 B0 BB F0 E4 1E 4D A1 56 32 9D 71 3C 35 F0 2B E0 E4 E0 98 DD ED D2 4A 11 6F DA 9B ED A8 0D 20 98 2E A0 6F 22 68 36 22 10 B6 0E 5B E6 67 A1 24 A4 F6 4B 78 68 68 16 16'
  +
  '';
var md5answer= '' +
  '55 AA 55 AA F4 00 00 00 00 01 00 00 BC FD 43 78 A5 DF B4 25 C4 5E 3F 90 69 FA 0A E3 28 75 22 73 14 9D 7B 89 7A 76 9B E1 75 3D FD 6C CA E9 F2 21 B9 DA 9B 15 95 A8 0B 31 A0 DC AA DE B9 13 96 C4 1F A9 40 50 BE 0B AA 6D BB 17 DD 96 AF 8E 39 88 16 A2 2D C1 68 D4 1E 59 4C 3E B8 A1 1D BE 19 FE 4F 60 7D E5 63 2F B6 26 4A 6E 12 0E 38 DE E2 E1 F2 4B 62 00 9A 48 F5 B1 90 B3 C2 3C 8F 7E C1 FC 77 8B 1A A5 5D 85 47 F9 07 3A 74 B7 E7 B1 A3 6A 2A 70 F4 8E C2 6B 55 B2 57 96 D4 A2 D0 FA B5 2D DA 14 7C 4E D8 19 2C FE 5A 97 CD 47 F8 FA CF 0C D4 FD 26 67 C2 D6 EF 51 A1 4A D8 5A 32 23 5B 90 AA 09 E9 CB 0C C9 B3 8C E6 01 AE F0 3A CA AE 96 8F 87 72 F4 98 D4 5E 81 C7 EE DB F0 52 2B D6 FF A8 E0 85 4D 1D 92 84 89 8C 2C 40 D6 EE C2 26 8A 3E 8D 59 B2 C1 3E F4 9B FB B1 25 50 0A DF 68 68 16 '
  +
  '';
var deviceAnswer= '' +
  '55 AA 55 AA E4 00 00 00 00 01 00 00 BC FD 43 78 A5 DF B4 25 C4 5E 3F 90 69 FA 0A E3 28 75 22 73 14 9D 7B 89 7A 76 9B E1 75 3D FD 6C CA E9 F2 21 B9 DA 9B 15 95 A8 0B 31 A0 DC AA DE B9 13 96 C4 1F A9 40 50 BE 0B AA 6D BB 17 DD 96 AF 8E 39 88 16 A2 2D C1 68 D4 1E 59 4C 3E B8 A1 1D BE 19 FE 4F 60 7D E5 63 2F B6 26 4A 6E 12 0E 3A 5B E1 C5 AD 1D F8 F2 5A F6 86 B3 E5 3F 0D 3E DD 72 79 B2 31 8B 48 C1 B1 28 75 53 E9 7A A9 B8 9B 4D 90 9C F9 40 4B 52 96 8A B9 E4 9B DA 9B 58 34 A2 57 34 00 7B BE 4C 7E A5 8B 5A 3B 8D 3F BF BA 80 78 70 54 7F 3C 21 45 34 F9 40 6A CF 3F 1E 88 8A 37 F2 7D B0 3A 7B 04 2A D7 FE FA 04 9D DB DF 0D 7A 59 EB E2 E1 AD CD 15 55 32 27 F6 81 2C 16 FA 6F A6 B9 A0 2A AF 7D 97 11 8B 71 30 38 A7 8C 8E 68 68 16 16'
  +
  '';
var deviceAnswer2= '' +
  '55 AA 55 AA B4 00 00 00 00 01 00 00 BC FD 43 78 A5 DF B4 25 C4 5E 3F 90 69 FA 0A E3 28 75 22 73 14 9D 7B 89 7A 76 9B E1 75 3D FD 6C CA E9 F2 21 B9 DA 9B 15 95 A8 0B 31 A0 DC AA DE B9 13 96 C4 1F A9 40 50 BE 0B AA 6D BB 17 DD 96 AF 8E 39 88 16 A2 2D C1 68 D4 1E 59 4C 3E B8 A1 1D BE 19 FE 4F 60 7D E5 63 2F B6 26 4A 6E 12 0E A0 A7 9F 1B DF B5 59 0D CA 1E ED FE 11 3C 63 E6 67 D8 22 7A D2 05 09 EE 7F 13 8E 53 50 40 A6 0B F6 EA AA BF 19 16 92 C1 E0 0E 8E 98 74 2A 16 38 D3 A5 18 B9 3C AE DD FD 16 FC 1C A3 07 E3 D8 25 0E E1 6A CA F4 10 CE 65 8D B8 BD FB 2E 7E DD 26 EC A8 68 68 16 16 '
  +
  '';
var trimLeft = /^\0.$/,
  trimRight = /\0./;
// var deal = origin.replace(' ',',').replace(' ',',');

// var deal2= origin.split(/\s+/);
// // console.log(deal2);
// deal2=r.map(y=>parseInt(y,16))(deal2);
// // console.log(deal2);
//
// var redBuffer = new Buffer(deal2)
// console.log(redBuffer);
// // parse(redBuffer);


console.log('begin to req for auth-----');
parse(hexArrtoBuffer(origin));
// parse(hexArrtoBuffer(md5answer));
// parse(hexArrtoBuffer(deviceAnswer));
// parse(hexArrtoBuffer(deviceAnswer2));

function hexArrtoBuffer(origin) {
  var deal2= origin.split(/\s+/);
// console.log(deal2);
  deal2=r.map(y=>parseInt(y,16))(deal2);
// console.log(deal2);

  return redBuffer = new Buffer(deal2)
}

function parse(buffer) {
  var _this = this;
  var range = match(buffer);
  if (!range) {
    return 0;
  }
  var data = buffer.slice(range.start, range.end);
  var msg = Message();
  var length = msg.UnSerilize(data);
  // get the md5
  console.log(length);
  if(msg.seq){
    console.log('get the md5 is: ' + msg.seq);
    // var hash = require('crypto').createHash('md5');
    // var saltHash = msg.seq.toString() + md5Salt;
    // var hashSeq = hash.update(saltHash).digest('hex');
    // md5Create= hashSeq;
    // console.log('create the md5 data:---------- ' + hashSeq);
  }
  if (length == 0) {
    //
    return 0;
  }
  //process msg
  // var param = this.process(msg);
  // param.start = range.start - 4;
  // param.end = range.end + 4;
  // return param;
}




function    match(buffer) {
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

  }
};



