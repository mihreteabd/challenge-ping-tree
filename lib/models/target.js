var db = require('../redis')

const getTargetById = id => `target:${id}`
const hashkey = 'targets'
const hashKeyTargetCopy = 'targetsCopy'

module.exports = {
  post: post,
  putById: putById,
  get: get,
  getById: getById,
  route: route
}

function post (target, callback) {
  const multi = db.multi()
  multi.hmset(hashkey, [getTargetById(target.id), JSON.stringify(target)])
  multi.hmset(hashKeyTargetCopy, [getTargetById(target.id), JSON.stringify(customizeTarget(target))])
  multi.exec(callback)
}

function putById (id, target, callback) {
  getById(id, function (err, res) {
    const multi = db.multi()
    if (err) callback(err, res)
    if (res[0] === null) callback(res)
    multi.hmset(hashkey, [getTargetById(id), JSON.stringify(target)])
    multi.hmset(hashKeyTargetCopy, [getTargetById(id), JSON.stringify(customizeTarget(target))])
    multi.exec(callback)
  })
}

function get (callback) {
  db.HVALS(hashkey, function (err, value) {
    callback(err, value)
  })
}

function getById (id, callback) {
  db.HMGET(hashkey, getTargetById(id), callback)
}

function route (options, callback) {
  const { query } = options

  db.HVALS(hashKeyTargetCopy, function (err, value) {
    if (err) return callback(err)
    const newValues = value.map(t => JSON.parse(t))
    const filterdValue = newValues.filter(t => {
      const criteriaResultArray = Object.keys(query).map(criteria => {
        if (t.accept[criteria]) {
          if (t.accept[criteria].$in) {
            return (t.accept[criteria].$in || []).includes(query[criteria])
          }
        }
        return false
      })
      const allCriteriaMeets = criteriaResultArray.filter(x => x).length > 0
      return allCriteriaMeets && (parseInt(t.requestCount) < parseInt(t.maxAcceptsPerDay) || t.todayFirstRequestedTime !== getCurrentDate())
    })
    var highValue = filterdValue.reduce(function (withHighValue, target) {
      return (withHighValue.value || 0) > target.value ? withHighValue : target
    }, {})
    if (Object.keys(highValue).length === 0) {
      callback(null, { decision: 'reject' })
    } else {
      db.hmset(hashKeyTargetCopy, [getTargetById(highValue.id), JSON.stringify(updateRequestCount(highValue))])
      callback(null, highValue.url)
    }
  })
}

function updateRequestCount (target) {
  if (target.todayFirstRequestedTime === getCurrentDate()) {
    target.requestCount = parseInt(target.requestCount) + 1
    return target
  }
  target.todayFirstRequestedTime = getCurrentDate()
  target.requestCount = 1
  return target
}

function customizeTarget (target) {
  target.requestCount = 0
  target.todayFirstRequestedTime = null
  return target
}

function getCurrentDate () {
  const current = new Date(Date.now())
  const dateT = current.getDate()
  const month = current.getMonth()
  const year = current.getFullYear()
  return `${year}-${month}-${dateT}`
}
