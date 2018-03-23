var path = require('path')

module.exports = {
'web-cs': {
  test: {
    protocol: 'ftp',
    username: '',
    password: '', // optional, prompted if none given
    host: '',
    port: 21,
    localPath: path.resolve(__dirname, './'),
    remotePath: '/test',
	  exclude: ['.*', 'node_modules']
      // username: '',
      // password: '', // optional, prompted if none given
      // host: '',
      // port: 22,
      // localPath: path.resolve(__dirname, './'),
      // remotePath: '/',
      // exclude: ['.*', 'node_modules']
  },
  prod: {

  }
} // sftp
}