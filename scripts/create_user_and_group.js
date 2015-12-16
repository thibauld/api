var async = require('../node_modules/async');
var axios = require('axios');
var URL = 'http://localhost:3060';

if (process.env.NODE_ENV !== 'development') {
  return console.error('Only run seed script in development');
}

var users = [
  {
    email: 'admin@opencollective.com',
    password: 'password',
    role: 'admin'
  },
  {
    email: 'writer@opencollective.com',
    password: 'password',
    role: 'writer'
  },
  {
    email: 'viewer@opencollective.com',
    password: 'password',
    role: 'viewer'
  }
];

// Create mock user
module.exports = function() {
  console.log('start seeding db');
  
  async.forEach(users, function(user) {
    
    console.log("Adding user ", user);
    
    axios.post(URL + '/users', {
      api_key: '0ac43519edcf4421d80342403fb5985d',
      user: user
    })
    .then(function(response) {
      console.log('user created');

      return axios.post(URL + '/authenticate', {
        api_key: '0ac43519edcf4421d80342403fb5985d',
        username: user.email,
        password: user.password
      });
    })
    .then(function(response) {
      console.log('authenticate successful');

      var accessToken = response.data.access_token;
      var data = {
        group: {
          name: 'OpenCollective Demo',
          description: 'OpenCollective Demo group',
        },
        stripeEmail: user.email,
        role: user.role
      };

      return axios.post(URL + '/groups', data, {
        headers: { Authorization: 'Bearer ' + accessToken }
      });
    })
    .then(function(response) {
      console.log('group created');
    })
    .catch(function(err) {
      console.log('err', err);
      process.exit();
    });
  });
};
