var path = require('path')

module.exports = {
  'test': {
    testing: {
      protocol: 'ftp', //sftp
      username: '',
      password: '', // optional, prompted if none given
      host: '',
      port: 21,
      localPath: path.resolve(__dirname, '../css'),
      remotePath: '/test'
    },
    prod: {

    }
  } // sftp

}
