var db = require('../redis')

const getTargetById = id => `target:${id}`

const post = (target, callback) => {
  const multi = db.multi()
  multi.set(getTargetById(target.id), JSON.stringify(target))

  Object.keys(target.accept).forEach(criteria => {
    target.accept[criteria].$in.forEach(value => {
      // geoState:ca = url
      multi.sadd(`${criteria}:${value}`, target.url)
    })
  })
  multi.exec(callback)
}

module.exports = {
  post: post
}
