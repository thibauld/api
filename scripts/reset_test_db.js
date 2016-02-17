var exec = require('child-process-promise').exec;

const app = require('../index');
const sequelize = app.set('models').sequelize;

exec('dropdb opencollective_test && createdb opencollective_test')
// .then(() => {
  // Drop does not remove the meta, we need to do it manually or the
  // migrations will only run once
  // return sequelize.query('DROP TABLE IF EXISTS "SequelizeMeta";', {
  //   type: sequelize.QueryTypes.SELECT
  // });
// })
.then(() => {
  return exec('SEQUELIZE_ENV=test npm run db:migrate');
})
.then((r) => {
  console.log('reset db', r.stdout);
  return exec('pg_dump --format=c opencollective_test > test.dump');
})
.then((r) => {
  console.log('dump db', r.stdout);
  process.exit();
})
.catch(err => {
  console.log('err', err);
  process.exit();
})