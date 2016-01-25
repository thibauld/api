var models = require('../app/models');
var testdata = require('../test/mocks/data');

models.sequelize.Promise.longStackTraces();

var mobileApp = {
  "name": "mobileapp",
  "api_key": "0ac43519edcf4421d80342403fb5985d",
  "_access": 1
};

var adminApp = {
  "name": "adminapp",
  "api_key": "82cf2d4cbdf82a71748d6ee1739f1fd2",
  "_access": 1
};

var neil = {
  "first_name": "Neil",
  "last_name": "Kandalgaonkar",
  "username": "neilk",
  "email": "neilk@neilk.net",
  "password": "password"
};

var joe = {
  "first_name": "Joe",
  "last_name": "Fromboni",
  "username": "joe",
  "email": "joe@sample.com",
  "password": "password2"
};

var group = {
  "name": "TheOrg",
  "description": "An arts organization",
  "budget": 10000.00,
  "membership_type": "yearlyfee",
  "membershipfee": 10
};



// clear db. force:true will cause all tables to be dropped and recreated
function clearDb() {
  return models.sequelize.sync({force: true});
}


clearDb().then(function() {
  return models.Application.create(mobileApp);
}).then(function() {
  return models.User.create(neil);
}).then(function() {
  return models.User.create(joe);
}).then(function() {
  return models.Group.create(group);
}).catch(function(err) {
  console.log("error!", err);
  process.exit(1);
}).done(function() {
  process.exit(0);
});


