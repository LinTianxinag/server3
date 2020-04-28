const config = require('config')
const r = require('ramda')
const redis = require('redis')
const client = redis.createClient(config.redis)
const {promisify} = require('util');
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const keysAsync = promisify(client.keys).bind(client);

const setCache = (key, expire = 5 * 60 * 1000) => async value => {
  await setAsync(key, JSON.stringify(value), 'EX', expire)
  return value
}
const readCache = async (key) => {
  const res = await getAsync(key)
  return res ? safeParse(res) : null
}

const cacheOr = (key, expire = 5 ) => async provider => {
  const cachedValue = await readCache(key);
  return cachedValue ? cachedValue : provider().then(setCache(key, expire * 60))
}

const safeParse = input => {
  try {
    return JSON.parse(input)
  } catch (e) {
    return null
  }
}
const cleanCache = cacheKeys => r.forEach(async x => {
  const keys = await keysAsync(x)
  r.forEach(y => client.del(y))(keys)
})(cacheKeys)
const businessMap = {
  'node': project => [
    `/api/v3/project/${project}/department`,
    `/api/v3/project/${project}/building`,
    `/api/v3/project/${project}/subentry*`,
    `/api/v3/project/${project}/nodes`,
  ],
  'project': project => [
    `/api/v3/project`,
    `/api/v3/project/${project}`
  ]
}
const cleanBusinessCache = relationship => (...params) => {
  cleanCache(r.apply(r.propOr(r.always([]))(relationship)(businessMap))(params))
}

module.exports = {
  readCache,
  setCache,
  cacheOr,
  cleanCache,
  cleanBusinessCache
}