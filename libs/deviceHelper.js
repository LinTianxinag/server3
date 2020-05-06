const r = require('ramda')
const GUID = require('./guid')

const displayConfig = {
  '004': ['09', '10'],
  '006': ['12', '13'],
  '010': ['07', '08'],
}

const reduceByType = arr => arr.length === 1 ?
  arr :
  r.filter(({sid}) => {
    const {funcid, devicetype} = GUID.DeviceID(sid)
    const filter = displayConfig[devicetype]
    return !filter || r.contains(funcid)(displayConfig[devicetype])
  })(arr)

const typeGroup = r.groupBy(({devicetype}) => devicetype)
const deviceAddrIdMap = devices => r.map(
  r.map(r.compose(r.map(r.prop('_id')), reduceByType)))(
  r.map(typeGroup)(
    r.groupBy(({sid}) => GUID.DeviceID(sid).addrid)(devices)));

const deviceTitleMap = devices => r.map(
  r.map(r.compose(r.map(r.prop('_id')), reduceByType)))(
  r.map(typeGroup)(
    r.groupBy(({title}) => title)(devices)));

module.exports = {
  deviceAddrIdMap,
  deviceTitleMap,
}