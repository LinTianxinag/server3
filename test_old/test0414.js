var _ = require('underscore');
var config = require('config');
var moment = require('moment');
var url = require('url');
var r = require('ramda');
var net = require('net');

var include = require('include-node');


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
// var req = '<root>' +
//   '  <common>' +


var client = new net.Socket();
client.setEncoding('binary');// client.setEncoding('GB2312');
// client.connect(8192, 'localhost', function(){
// client.connect(8192, '47.111.155.7', function(){
client.connect(8192, 'testiot.wznhjc.cn', function(){
// client.connect(8192, 'iot.wznhjc.cn', function(){





  process.stdin.on('readable', () => {
    var chunk = process.stdin.read();
    if (chunk !== null) {
      process.stdout.write(`data: ${chunk}`);
      client.write(chunk);
    }
  });

  process.stdin.on('end', () => {
    process.stdout.write('end');

  });

});

client.on('data', function(data){
    // console.log('received data from server is :' + data);
  // var receive = new Buffer(data, "binary");
  console.log('data');
  console.log(data);


});


