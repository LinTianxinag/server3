var xml = require('xmldoc');
var xml2js = require('xml2js');
var moment = require('moment');
var _ = require('underscore');
var util = require('../../../../../libs/util');
/////////////////////////////////////////////////////
//Device Command
exports.DEVICEINFO = 'device';
exports.DEVICEINFOACK = 'device_ack';
exports.NOTIFY = 'notify';
exports.NOTIFYACK = 'time';
exports.CONTINUOUS = 'continuous';
exports.REPORTACK = 'report_ack';
exports.REPORT = 'report';
exports.CONTROLACK = 'control_ack';
exports.QUERY = 'query';
exports.REPLY = 'reply';
exports.ARCHIVES = 'archives';
exports.ARCHIVESACK = 'archives_ack';

exports.REQUEST = 'request';
exports.SEQUENCE = 'sequence';
exports.SEQUENCEMD5 = 'md5';
exports.RESULT = 'result';


var headerTag = 0x55aa55aa;
var tailTag = 0x68681616;
var md5Salt = "IJKLMNOPQRSTUVWX";

/////////////////////////////////////////////////////
//Package
exports.pack = function(msg)
{
    var header = new Buffer(4);
    header.writeUInt32BE(headerTag, 0);
    var tail = new Buffer(4);
    tail.writeUInt32BE(tailTag, 0);

    return Buffer.concat(
        new Array(header, msg, tail)
        , header.length + msg.length + tail.length
        );
};

/////////////////////////////////////////////////////
//Archives 获取采集器信息
function ArchivesInfo()
{
    this.buildingID = '';
    this.gatewayID = '';
    this.buildingName = '';

    this.protocols = {};
    this.meters = [];

    this.freq = 1800;

    this.Parse = function (msg) {
        var _this = this;

        var root = new xml.XmlDocument(msg);
        //common
        {
            // var buf = new Buffer(xmlDoc.childNamed('instruction').childNamed('build_info').childNamed('build_name').val, 'binary');
            // console.log( iconv.decode(buf, 'GB2312') );
            var commonNode = root.childNamed('common');
            if( commonNode != undefined ){
                _this.buildingID = commonNode.childNamed('building_id').val;
                _this.gatewayID = commonNode.childNamed('gateway_id').val;
            }
        }
        //instruction
        {
            var instructionNode = root.childNamed('instruction');
            //build info
            {
                var buildingInfoNode = instructionNode.childNamed('build_info');
                if(buildingInfoNode != undefined)
                _this.buildingName = Util.DecodeGB2312(buildingInfoNode.childNamed('build_name').val);
            }
            //net info
            {
                var netInfoNode = instructionNode.childNamed('net_info');
                _this.freq = parseInt( netInfoNode.childNamed('period').val ) * 60;
            }
            //protocol info
            {
                var protocolInfo = instructionNode.childNamed('protocol_info');
                protocolInfo.eachChild(
                    function (protocol, index, array) {
                        var id = protocol.attr.id;
                        var nowProtocol = [];
                        protocol.eachChild(
                            function (item, index, array) {
                                var funcID = parseInt(item.attr.fnId);
                                item.attr.name = Util.DecodeGB2312(item.attr.name);
                                nowProtocol.push(item.attr);
                            }
                        );
                        _this.protocols[id] = {
                            id: id,
                            type: protocol.attr.type,
                            ext: protocol.attr.type188,
                            details: nowProtocol
                        };
                    }
                );
            }
            //meter info
            {
                var meterInfo = instructionNode.childNamed('meter_info');
                meterInfo.eachChild(
                    function (meter, index, array) {
                        _this.meters.push({
                            mtype: meter.attr.mType,
                            comport: meter.attr.com,
                            addrid: meter.attr.addr.substr(2),
                            meterid: meter.attr.meterId,
                            memo: Util.DecodeGB2312(meter.attr.memo),
                            sampleId: meter.attr.sampleId,
                            code: meter.attr.code
                        });
                    }
                );
            }
        }
    };

    this.BindProtocol = function (bindProtocol) {
        var _this = this;
        _.each(_this.protocols, function (protocol, key) {
            if(protocol.type == bindProtocol.type && protocol.ext == bindProtocol.ext){
                // protocol.protocol = bindProtocol;
                _this.protocols[key].protocol = bindProtocol;
            }
        });
    }
}
//增加新的client选项
exports.ArchivesInfoClient = function()
{
    this.buildingID = '';
    this.gatewayID = '';
    this.buildingName = '';

    this.protocols = {};
    this.meters = [];

    this.freq = 1800;

    this.Parse = function (msg) {
        var _this = this;

        var root = new xml.XmlDocument(msg);
        //common
        {
            // var buf = new Buffer(xmlDoc.childNamed('instruction').childNamed('build_info').childNamed('build_name').val, 'binary');
            // console.log( iconv.decode(buf, 'GB2312') );
            var commonNode = root.childNamed('common');
            if( commonNode != undefined ){
                _this.buildingID = commonNode.childNamed('building_id').val;
                _this.gatewayID = commonNode.childNamed('gateway_id').val;
            }
        }
        //instruction
        {
            var instructionNode = root.childNamed('instruction');
            //build info
            {
                var buildingInfoNode = instructionNode.childNamed('build_info');
                if(buildingInfoNode != undefined)
                _this.buildingName = Util.DecodeGB2312(buildingInfoNode.childNamed('build_name').val);
            }
            //net info
            {
                var netInfoNode = instructionNode.childNamed('net_info');
                _this.freq = parseInt( netInfoNode.childNamed('period').val ) * 60;
            }
            //protocol info
            {
                var protocolInfo = instructionNode.childNamed('protocol_info');
                protocolInfo.eachChild(
                    function (protocol, index, array) {
                        var id = protocol.attr.id;
                        var nowProtocol = [];
                        protocol.eachChild(
                            function (item, index, array) {
                                var funcID = parseInt(item.attr.fnId);
                                item.attr.name = Util.DecodeGB2312(item.attr.name);
                                nowProtocol.push(item.attr);
                            }
                        );
                        _this.protocols[id] = {
                            id: id,
                            type: protocol.attr.type,
                            ext: protocol.attr.type188,
                            details: nowProtocol
                        };
                    }
                );
            }
            //meter info
            {
                var meterInfo = instructionNode.childNamed('meter_info');
                meterInfo.eachChild(
                    function (meter, index, array) {
                        _this.meters.push({
                            mtype: meter.attr.mType,
                            comport: meter.attr.com,
                            addrid: meter.attr.addr.substr(2),
                            meterid: meter.attr.meterId,
                            memo: Util.DecodeGB2312(meter.attr.memo),
                            sampleId: meter.attr.sampleId,
                            code: meter.attr.code
                        });
                    }
                );
            }
        }
    };

    this.BindProtocol = function (bindProtocol) {
        var _this = this;
        _.each(_this.protocols, function (protocol, key) {
            if(protocol.type == bindProtocol.type && protocol.ext == bindProtocol.ext){
                // protocol.protocol = bindProtocol;
                _this.protocols[key].protocol = bindProtocol;
            }
        });
    }
}

exports.Archives = function ()
{
    var packageModule = '<?xml version="1.0" encoding="UTF-8" ?>' +
        '<root>' +
        '<common><building_id></building_id><gateway_id></gateway_id>' +
        '<type></type>' +
        '</common>' +
        '<instruction operation="archives"></instruction>' +
        '</root>';

    this.buildingID = '';
    this.gatewayID = '';

    this.buildingName = '';
    // this.protocols = {};
    this.protocols = [];
    this.meter = [];
    this.freq = 30;


    var command = exports.ARCHIVES;

    this.Serilize = function () {
        var xmlDoc = new xml.XmlDocument(packageModule);

        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
            commonNode.childNamed('type').val = command.toString();
        }

        return xmlDoc.toString();
    };

    this.UnSerilize = function(data)
    {
        var archivesInfo = new ArchivesInfo();
        archivesInfo.Parse(data);
        return archivesInfo;
    };
  this.UnSerilizeClient = function(data)
  {
    //
    var xmlDoc = new xml.XmlDocument(data);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      if(commonNode != undefined){
        this.buildingID = commonNode.childNamed('building_id').val;
        this.gatewayID = commonNode.childNamed('gateway_id').val;
        this.command = commonNode.childNamed('type').val;
      }
    }

  }
};
// 客户端发送设备资料
exports.ArchivesAck = function ()
{
  // var packageModule = '<?xml version="1.0" encoding="UTF-8" ?>' +
  //   '<root>' +
  //   '<common><building_id></building_id><gateway_id></gateway_id>' +
  //   '<type></type>' +
  //   '</common>' +
  //   '<instruction operation="archives_ack">' +
  //       '<build_info>' +
  //           '<build_name>' +
  //           '</build_name>' +
  //       '</build_info>' +
  //       '<net_info>' +
  //           '<period>' +
  //           '</period>' +
  //       '</net_info>' +
  //       '<protocol_info>' +
  //       '</protocol_info>' +
  //       '<meter_info>' +
  //       '</meter_info>' +
  //   '</instruction>' +
  //   '</root>';
  //
  // this.buildingID = '';
  // this.gatewayID = '';
  // this.buildingName = '';
  // this.protocols = {};
  // this.meters = [];
  // this.freq = 30;
  //
  // var command = exports.ARCHIVESACK;
  //
  // this.Serilize = function () {
  //   var xmlDoc = new xml.XmlDocument(packageModule);
  //   //commom
  //   {
  //     var commonNode = xmlDoc.childNamed('common');
  //     commonNode.childNamed('building_id').val = this.buildingID.toString();
  //     commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
  //     commonNode.childNamed('type').val = command.toString();
  //   }
  //   //instruction
  //   {
  //     var instructionNode = root.childNamed('instruction');
  //     //build info
  //     {
  //       var buildingInfoNode = instructionNode.childNamed('build_info');
  //       if(buildingInfoNode != undefined)
  //         buildingInfoNode.childNamed('build_name').val = Util.DecodeGB2312(this.buildingName);
  //     }
  //     //net info
  //     {
  //       var netInfoNode = instructionNode.childNamed('net_info');
  //       netInfoNode.childNamed('period').val = this.freq;
  //     }
  //     //protocol info
  //     {
  //       // var protocolInfo = instructionNode.childNamed('protocol_info');
  //       // protocolInfo.eachChild(
  //       //   function (protocol, index, array) {
  //       //     var id = protocol.attr.id;
  //       //     var nowProtocol = [];
  //       //     protocol.eachChild(
  //       //       function (item, index, array) {
  //       //         var funcID = parseInt(item.attr.fnId);
  //       //         item.attr.name = Util.DecodeGB2312(item.attr.name);
  //       //         nowProtocol.push(item.attr);
  //       //       }
  //       //     );
  //       //     _this.protocols[id] = {
  //       //       id: id,
  //       //       type: protocol.attr.type,
  //       //       ext: protocol.attr.type188,
  //       //       details: nowProtocol
  //       //     };
  //       //   }
  //       // );
  //     }
  //     //meter info
  //     {
  //       var meterInfo = instructionNode.childNamed('meter_info');
  //       meterInfo.eachChild(
  //         function (meter, index, array) {
  //           _this.meters.push({
  //             mtype: meter.attr.mType,
  //             comport: meter.attr.com,
  //             addrid: meter.attr.addr.substr(2),
  //             meterid: meter.attr.meterId,
  //             memo: Util.DecodeGB2312(meter.attr.memo),
  //             sampleId: meter.attr.sampleId,
  //             code: meter.attr.code
  //           });
  //         }
  //       );
  //     }
  //   }

    var packJson ={
      common:{building_id:'',gateway_id:'',gateway_id:''},
      instruction:{$:{attr:1},build_info:{build_name:''}, net_info:{period:''}, protocol_info:{protocol:[]},meter_info:{meter:[]}}
    };
  var jsonBuilder = new xml2js.Builder({
    rootName:'root',
    xmldec:{
      version:'1.0',
      'encoding': 'UTF-8'}}); // jons -> xml
    this.buildingID = '';
    this.gatewayID = '';
    this.buildingName = '';
    // this.protocols = {};
    this.protocols = [];
    this.meter = [];
    this.freq = 30;

    var command = exports.ARCHIVESACK;

    this.Serilize = function () {


      // var xmlDoc = new xml.XmlDocument(packageModule);

      packJson.common.building_id=this.buildingID.toString();
      packJson.common.gateway_id=this.gatewayID.toString();
      packJson.common.type=command.toString();
      //instruction
      {
        // var instructionNode = root.childNamed('instruction');
        //build info
        {
            // packJson.instruction.build_info.build_name=Util.DecodeGB2312(this.buildingName);
            packJson.instruction.build_info.build_name=Util.DecodeGB2312(this.buildingName);
        }
        //net info
        {
          packJson.instruction.net_info.period=this.freq+'';
        }
        //protocol info
        {
          packJson.instruction.protocol_info.protocol=this.protocols;
          // var protocolInfo = instructionNode.childNamed('protocol_info');
          // protocolInfo.eachChild(
          //   function (protocol, index, array) {
          //     var id = protocol.attr.id;
          //     var nowProtocol = [];
          //     protocol.eachChild(
          //       function (item, index, array) {
          //         var funcID = parseInt(item.attr.fnId);
          //         item.attr.name = Util.DecodeGB2312(item.attr.name);
          //         nowProtocol.push(item.attr);
          //       }
          //     );
          //     _this.protocols[id] = {
          //       id: id,
          //       type: protocol.attr.type,
          //       ext: protocol.attr.type188,
          //       details: nowProtocol
          //     };
          //   }
          // );
        }
        //meter info
        {
            packJson.instruction.meter_info.meter=this.meter;


          // var meterInfo = instructionNode.childNamed('meter_info');
          // meterInfo.eachChild(
          //   function (meter, index, array) {
          //     _this.meters.push({
          //       mtype: meter.attr.mType,
          //       comport: meter.attr.com,
          //       addrid: meter.attr.addr.substr(2),
          //       meterid: meter.attr.meterId,
          //       memo: Util.DecodeGB2312(meter.attr.memo),
          //       sampleId: meter.attr.sampleId,
          //       code: meter.attr.code
          //     });
          //   }
          // );

        }
      }
      var json2xml = jsonBuilder.buildObject(packJson);

    return json2xml.toString();
  };

  this.UnSerilize = function(data)
  {
    var archivesInfo = new ArchivesInfo();
    archivesInfo.Parse(data);
    return archivesInfo;
  };
  this.UnSerilizeClient = function(data)
  {
    //
    var xmlDoc = new xml.XmlDocument(data);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      if(commonNode != undefined){
        this.buildingID = commonNode.childNamed('building_id').val;
        this.gatewayID = commonNode.childNamed('gateway_id').val;
        this.command = commonNode.childNamed('type').val;
      }
    }

  }
};

/////////////////////////////////////////////////////
//DeviceInfo
exports.DeviceInfo = function()
{
    var packageModule = '<?xml version="1.0" encoding="UTF-8" ?><root><common><building_id></building_id><gateway_id></gateway_id><type></type></common><device operation="device"><build_name></build_name><build_no></build_no><dev_no></dev_no><factory></factory><hardware></hardware><software></software><mac></mac><ip></ip><mask></mask><gate></gate><server></server><port></port><host></host><com></com><dev_num></dev_num><period></period><begin_time></begin_time><address></address></device></root>';

    this.buildingID = '';
    this.gatewayID = '';
    this.command = '';

    this.buildName = '';
    this.buildNo = '';
    this.devNo = '';
    this.factory = '';
    this.hardware = '';
    this.software = '';
    this.mac = '';
    this.ip = '';
    this.mask = '';
    this.gate = '';
    this.server = '';
    this.port = '';
    this.host = '';
    this.com = '';
    this.devNum = '';
    this.period = '';
    this.beginTime = '';
    this.address = '';

    this.Serilize = function()
    {
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
            commonNode.childNamed('type').val = this.command.toString();
        }
        //info
        {
            var opNode = xmlDoc.childNamed('device');
            opNode.attr.operation = this.command;
            opNode.childNamed('build_name').val = this.buildName.toString();
            opNode.childNamed('build_no').val = this.buildNo.toString();
            opNode.childNamed('dev_no').val = this.devNo.toString();
            opNode.childNamed('factory').val = this.factory.toString();
            opNode.childNamed('hardware').val = this.hardware.toString();
            opNode.childNamed('software').val = this.software.toString();
            opNode.childNamed('mac').val = this.mac.toString();
            opNode.childNamed('ip').val = this.ip.toString();
            opNode.childNamed('mask').val = this.mask.toString();
            opNode.childNamed('gate').val = this.gate.toString();
            opNode.childNamed('server').val = this.server.toString();
            opNode.childNamed('port').val = this.port.toString();
            opNode.childNamed('host').val = this.host.toString();
            opNode.childNamed('com').val = this.com.toString();
            opNode.childNamed('dev_num').val = this.devNum.toString();
            opNode.childNamed('period').val = this.period.toString();
            opNode.childNamed('begin_time').val = this.beginTime.toString();
            opNode.childNamed('address').val = this.address.toString();
        }

        return xmlDoc.toString();
    }
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            if(commonNode != undefined){
                this.buildingID = commonNode.childNamed('building_id').val;
                this.gatewayID = commonNode.childNamed('gateway_id').val;
                this.command = commonNode.childNamed('type').val;
            }
        }

        //info
        {
            var opNode = xmlDoc.childNamed('device');
            if(opNode != undefined){
                this.buildName = opNode.childNamed('build_name').val;
                this.buildNo = opNode.childNamed('build_no').val;
                this.devNo = opNode.childNamed('dev_no').val;
                this.factory= opNode.childNamed('factory').val;
                this.hardware = opNode.childNamed('hardware').val;
                this.software = opNode.childNamed('software').val;
                this.mac = opNode.childNamed('mac').val;
                this.ip = opNode.childNamed('ip').val;
                this.mask = opNode.childNamed('mask').val;
                this.gate = opNode.childNamed('gate').val;
                this.server = opNode.childNamed('server').val;
                this.port = opNode.childNamed('port').val;
                this.host = opNode.childNamed('host').val;
                this.com = opNode.childNamed('com').val;
                this.devNum = opNode.childNamed('dev_num').val;
                this.period = opNode.childNamed('period').val;
                this.beginTime = opNode.childNamed('begin_time').val;
                this.address = opNode.childNamed('address').val;
            }
        }
    }
};

exports.DeviceInfoAck = function()
{
    var packageModule = '<?xml version="1.0" encoding="UTF-8" ?><root><common><building_id></building_id><gateway_id></gateway_id><type></type></common><device operation=" device_ack "><device_ack>pass</device_ack></device></root>';

    this.buildingID = '';
    this.gatewayID = '';
    this.deviceRes = false;
    var command = exports.DEVICEINFOACK;

    this.Serilize = function()
    {
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
            commonNode.childNamed('type').val = command.toString();
        }

        return xmlDoc.toString();
    }
    this.UnSerilize = function(data)
    {
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            if( commonNode != undefined ){
                this.buildingID = commonNode.childNamed('building_id').val;
                this.gatewayID = commonNode.childNamed('gateway_id').val;
                command = commonNode.childNamed('type').val;
            }
        }
    //    device
      {
        var deviceNode = xmlDoc.childNamed('device');
        if( deviceNode != undefined ){
          this.deviceRes = (deviceNode.childNamed('device_ack').val == 'pass');
        }
        return this.deviceRes;
      }



    }
};

/////////////////////////////////////////////////////
//Notify
exports.Notify = function()
{
    var packageModule = '<?xml version="1.0" encoding="UTF-8" ?><root><common><building_id></building_id><gateway_id></gateway_id><type></type></common><heart_beat operation="notify"><notify></notify></heart_beat></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.NOTIFY;
    this.masterUpload = true;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
            commonNode.childNamed('type').val = exports.NOTIFY;
        }

        return xmlDoc.toString();
    };
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            if( commonNode != undefined ){
                this.buildingID = commonNode.childNamed('building_id').val;
                this.gatewayID = commonNode.childNamed('gateway_id').val;
                command = commonNode.childNamed('type').val;
            }

            //info
            {
                var opNode = xmlDoc.childNamed('heart_beat');
                if(opNode != undefined){
                    var notifyNode = opNode.childNamed('notify');
                    if(notifyNode != undefined){
                        this.masterUpload = (notifyNode.val == 'master');
                    }
                }
            }
        }
    }
};

exports.NotifyAck = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8"?><root><common><building_id></building_id><gateway_id></gateway_id><type></type></common><heart_beat operation="time"><time></time></heart_beat></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.NOTIFYACK;
    this.time = undefined;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
            commonNode.childNamed('type').val = exports.NOTIFYACK;
        }
        //info
        {
            var opNode = xmlDoc.childNamed('heart_beat');
            if(opNode != undefined){
                var notifyNode = opNode.childNamed('time');
                if(notifyNode != undefined){
                    notifyNode.val = moment().format('YYYYMMDDHHmmss');
                }
            }
        }

        return xmlDoc.toString();
    }
  //增加解析部分，给client使用
  this.UnSerilize = function(data)
  {
    //
    var xmlDoc = new xml.XmlDocument(data);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      if( commonNode != undefined ){
        this.buildingID = commonNode.childNamed('building_id').val;
        this.gatewayID = commonNode.childNamed('gateway_id').val;
        this.command = commonNode.childNamed('type').val;
      }

      //info xmlDoc.childNamed('heart_beat').childNamed('time').val
      {
        var opNode = xmlDoc.childNamed('heart_beat');
        if(opNode != undefined){
          var notifyNode = opNode.childNamed('time');
          if(notifyNode != undefined){
            this.time = notifyNode.val ;
          }
        }
      }
    }
  }

};

/////////////////////////////////////////////////////
//Sequence
exports.Sequence = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8" ?><root><common><building_id></building_id><gateway_id></gateway_id><type>sequence</type></common><id_validate operation="sequence"><sequence></sequence></id_validate></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.SEQUENCE;
    this.seq = (Math.floor(Math.random()*90000000+10000000)).toString();
    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
        }
        //info
        {
            var opNode = xmlDoc.childNamed('id_validate');
            if(opNode != undefined){
                var seqNode = opNode.childNamed('sequence');
                if(seqNode != undefined){
                    seqNode.val = this.seq;
                }
            }
        }

        return xmlDoc.toString();
    }
};

/////////////////////////////////////////////////////
//SequenceMD5
exports.SequenceMD5 = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8" ?><root><common><building_id></building_id><gateway_id></gateway_id ><type>result</type></common><id_validate operation="result"><result></result></id_validate></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.SEQUENCEMD5;
    this.seq = undefined;
    this.isEqual = false;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
        }
        //info
        {
            var opNode = xmlDoc.childNamed('id_validate');
            if(opNode != undefined){
                var resNode = opNode.childNamed('result');
                if(resNode != undefined){
                    if(this.isEqual){
                        //
                        resNode.val = 'pass';
                    }
                    else{
                        resNode.val = 'fail';
                    }
                }
            }
        }

        return xmlDoc.toString();
    }
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            this.buildingID = commonNode.childNamed('building_id').val;
            this.gatewayID = commonNode.childNamed('gateway_id').val;
            if( commonNode.childNamed('type').val != exports.SEQUENCEMD5){
                return false;
            }
        }
        //info
        {
            var opNode = xmlDoc.childNamed('id_validate');
            if(opNode != undefined){
                var md5Node = opNode.childNamed('md5');
                if(md5Node != undefined){
                    var hash = require('crypto').createHash('md5');
                    var saltHash = this.seq.toString() + md5Salt;
                    var hashSeq = hash.update(saltHash).digest('hex');
                    this.isEqual = hashSeq == md5Node.val;
                }
            }
        }
    }
};

/////////////////////////////////////////////////////
//Continuous
exports.Continuous = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8"?><root><common><building_id></building_id><gateway_id></gateway_id><type>report_ack</type></common><report_config operation="report_ack"><report_ack>pass</report_ack></report_config></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.REPORTACK;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
        }

        return xmlDoc.toString();
    }
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            this.buildingID = commonNode.childNamed('building_id').val;
            this.gatewayID = commonNode.childNamed('gateway_id').val;
        }
    }
};

/////////////////////////////////////////////////////
//Report
exports.Report = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8"?><root><common><building_id></building_id><gateway_id></gateway_id><type>report_ack</type></common><report_config operation="report_ack"><report_ack>pass</report_ack></report_config></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
        }

        return xmlDoc.toString();
    }
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            this.buildingID = commonNode.childNamed('building_id').val;
            this.gatewayID = commonNode.childNamed('gateway_id').val;
        }
    }
};
// 客户端使用的client报文 20200324
exports.ReportClient = function()
{
  var packJson ={
    common:{building_id:'',gateway_id:'',gateway_id:''},
    data :{$:{operation:'report'},sequence:'',parser:'yes',time:'',meter:[]}
    // instruction:{$:{attr:1},build_info:{build_name:''}, net_info:{period:''}, protocol_info:{},meter_info:{meters:[]}}
  };
  var jsonBuilder = new xml2js.Builder({
    rootName:'root',
    xmldec:{
      version:'1.0',
      'encoding': 'UTF-8'}}); // jons -> xml
  this.buildingID = '';
  this.gatewayID = '';
  this.meter = [];
  this.sequence = '';
  this.time = '';

  var command = exports.REPORT;

  this.Serilize = function () {


    // var xmlDoc = new xml.XmlDocument(packageModule);

    packJson.common.building_id=this.buildingID.toString();
    packJson.common.gateway_id=this.gatewayID.toString();
    packJson.common.type=command.toString();
      // var instructionNode = root.childNamed('instruction');
      //build info
      {
        // packJson.instruction.build_info.build_name=Util.DecodeGB2312(this.buildingName);
        packJson.data.sequence = this.sequence;
        packJson.data.time = this.time;
        packJson.data.meter = this.meter;
      }
    var json2xml = jsonBuilder.buildObject(packJson);

    return json2xml.toString();

    }







};

/////////////////////////////////////////////////////
//Control Ack
exports.ControlAck = function()
{
    this.buildingID = undefined;
    this.gatewayID = undefined;
    this.command = exports.CONTROLACK;

    this.infos = [];

    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            this.buildingID = commonNode.childNamed('building_id').val;
            this.gatewayID = commonNode.childNamed('gateway_id').val;
        }
        //instruction
        {
            var instructionNode = xmlDoc.childNamed('instruction');
            var controlInfo = instructionNode.childNamed('control_info');
            var _this = this;
            controlInfo.eachChild(function(child, index, array){
                //
                _this.infos.push({
                    meterid: child.attr.meterId,
                    err: child.attr.err,
                    index: child.attr.idx,
                    data: child.attr.data
                });
            });
        }
    }
};

/////////////////////////////////////////////////////
//Query
exports.Query = function()
{
    var packageModule = '<?xml version="1.0" encoding="utf-8"?><root><common><building_id></building_id><gateway_id></gateway_id><type>query</type></common><net_query operation="query"><query>query</query></net_query></root>';

    this.buildingID = undefined;
    this.gatewayID = undefined;

    this.Serilize = function()
    {
        //
        var xmlDoc = new xml.XmlDocument(packageModule);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            commonNode.childNamed('building_id').val = this.buildingID.toString();
            commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
        }

        return xmlDoc.toString();
    };
    this.UnSerilize = function(data)
    {
        //
        var xmlDoc = new xml.XmlDocument(data);

        //common
        {
            var commonNode = xmlDoc.childNamed('common');
            this.buildingID = commonNode.childNamed('building_id').val;
            this.gatewayID = commonNode.childNamed('gateway_id').val;
        }
    };
};


//var str = '<?xml version="1.0" encoding="UTF-8" ?><root><common><building_id>330100A001</building_id><gateway_id>01</gateway_id><type>control_ack</type></common><instruction operation="control_ack"><control_info><control_ack idx="1" meterId="2" err="F0"size="6" data="xxxxxxxxxxxx"/><control_ack idx="2" meterId="2" err="F1"size="6" data="xxxxxxxxxxxx"/></control_info></instruction></root>';
//var ControlAck = new exports.ControlAck();
//ControlAck.UnSerilize(str);
//console.log(ControlAck.infos);



//  1-3：客户端的一些文件发送的格式 ，组装发送的报文
//SequenceMD5
exports.SequenceMD5Client = function()
{
  var packageModule = '<?xml version="1.0" encoding="utf-8" ?><root><common><building_id></building_id><gateway_id></gateway_id><type>md5</type></common><id_validate operation="md5"><md5></md5></id_validate></root>';

  this.buildingID = undefined;
  this.gatewayID = undefined;
  this.command = exports.SEQUENCE;
  this.seq = undefined;
  this.validRes= false;
  this.Serilize = function()
  {
    //
    var xmlDoc = new xml.XmlDocument(packageModule);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      commonNode.childNamed('building_id').val = this.buildingID.toString();
      commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
    }
    //info
    {
      var opNode = xmlDoc.childNamed('id_validate');
      if(opNode != undefined){
        var seqNode = opNode.childNamed('md5');
        if(seqNode != undefined){

          var hash = require('crypto').createHash('md5');
          var saltHash = this.seq.toString() + md5Salt;
          var hashSeq = hash.update(saltHash).digest('hex');
          seqNode.val = hashSeq;
        }
      }
    }

    return xmlDoc.toLocaleString();
  }

  this.UnSerilizeValid = function(data)
  {
    //
    var xmlDoc = new xml.XmlDocument(data);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      this.buildingID = commonNode.childNamed('building_id').val;
      this.gatewayID = commonNode.childNamed('gateway_id').val;
      if( commonNode.childNamed('type').val != exports.RESULT){
        return false;
      }
    }
    //info
    {
      var opNode = xmlDoc.childNamed('id_validate');
      if(opNode != undefined){
        var result = opNode.childNamed('result');
        if(result.val != 'pass'){
          this.validRes=false;
          return false;

        }
        this.validRes=true;
        return true;


      }
    }
  }
};



//Request
exports.Request = function()
{
  var packageModule = '<?xml version="1.0" encoding="utf-8" ?>' +
    '<root>' +
    '<common>' +
      '<building_id></building_id>' +
      '<gateway_id></gateway_id>' +
      '<type>request</type>' +
    '</common>' +
    '<id_validate operation="request"/>' +
    '</root>';

  this.buildingID = undefined;
  this.gatewayID = undefined;
  this.command = exports.REQUEST;
  this.Serilize = function()
  {
    //
    var xmlDoc = new xml.XmlDocument(packageModule);

    //common
    {
      var commonNode = xmlDoc.childNamed('common');
      commonNode.childNamed('building_id').val = this.buildingID.toString();
      commonNode.childNamed('gateway_id').val = this.gatewayID.toString();
    }


    return xmlDoc.toString();
  }
};