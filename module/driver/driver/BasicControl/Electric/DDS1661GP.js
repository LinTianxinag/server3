'use strict';

const fp = require('lodash/fp');
const r = require('ramda');
const {
  createCommand
} = require('../common/util');
const Driver = require('../../../driver')

const EMCSwitch = () => ({
  Send: (ext, param) => {
    const {mode, addrid} = param
    if (!mode || !addrid) {
      return {
        code: ErrorCode.Code.PARAMETERMISSED,
        message: ErrorCode.Message.PARAMETERMISSED,
      };
    }

    if (!fp.includes(mode)([Driver.Command.EMC_ON, Driver.Command.EMC_OFF])) {
      return {
        code: ErrorCode.Code.COMMANDUNSUPPORT,
        message: ErrorCode.Message.COMMANDUNSUPPORT,
      };
    }
    const switchSetOn = function (ext, {addrid}) {
      // Send: FE FE FE FE
      // Send: FEFE68298184280000681C1035333333333333334E333333333434CC3A16
      // data field 35333333333333334E333333333434CC minus 33H
      return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result: {
          reqdata: createCommand(addrid, '4E')
        }
      };
    };
    const switchSetOff = function (ext, {addrid}) {
      // Send: FE FE FE FE
      // Send: FEFE68298184280000681C1035333333333333334D333333333434CC3916
      // data minus 33h
      return {
        code: ErrorCode.Code.OK,
        message: ErrorCode.Message.OK,
        result: {
          reqdata: createCommand(addrid, '4D')
        }
      };
    };

    switch(param.mode){
      case Driver.Command.EMC_ON:
        return switchSetOn(ext, param);
      case Driver.Command.EMC_OFF:
        return switchSetOff(ext, param);
      default:
        return {
          code: ErrorCode.Code.PARAMETERMISSED,
          message: ErrorCode.Message.PARAMETERMISSED
        };
    }


  },
});

const statusParse = (value) => {
  var status = {};

  if (value & 0x1) {
    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_ON;
  }
  else if (value & 0x2) {
    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_OFF;
  }
  else if (value & 0x4) {
    status[Driver.StatusWords.switch.word] = Driver.Command.EMC_EXCPTION;
  }

  return status;
}

const TranslateValue = function(driverName, command, funcid, value) {
  log.info(`DDS1661GP TranslateValue ${driverName}, ${command} ${funcid} ${value}`)
  return value;
};

const DriverInfo = function()
{
  return {
  };
};

const ParseInstruction = function (buildingid, gatewayid, meterid, command, origincommand, param) {
  log.info(`DDS1661GP ParseInstruction: ${command} ${JSON.stringify(origincommand)} ${param}`)

  const success = /689C00\w{2}16$/.test(command);
  const cmd = r.is(String, origincommand) ? origincommand : origincommand.command
  const switchCommand = cmd === Driver.Command.EMC_SWITCH;
  if (success && switchCommand) {
    return {
      code: ErrorCode.Code.OK,
      message: ErrorCode.Message.OK,
      result: {[Driver.StatusWords.switch.word]: param.mode}
    }
  }

  return {
    code: ErrorCode.Code.OK,
    message: ErrorCode.Message.OK,
    result: {}
  };
}

module.exports = {
  [Driver.Command.EMC_SWITCH]: {
    Do: EMCSwitch().Send,
    Channels: [],
    StatusWords: [Driver.StatusWords.switch.word],
    StatusWriteBack: (ext, parameter) => {
      log.info(`DDS1661GP StatusWriteBack ${JSON.stringify(ext)}, ${JSON.stringify(parameter)}`)
      return {
        status: {
          [Driver.StatusWords.switch.word]: parameter.switch,
        },
      }},
  },
  DriverInfo,
  TranslateValue,
  ParseInstruction
};

