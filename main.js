#!/usr/bin/env node
var program = require('commander')
var fsExtra = require('fs-extra')
var path = require('path')
var FtpDeploy = require('ftp-deploy')
var client = require('scp2')
try{
	var config = require(path.resolve(__dirname,'../../dmconfig.js'))
}catch(e){
	console.log("请在当前目录建立dmconfig.js配置文件")
	return
}

program
  .version('0.0.1')
  .description('一个支持ftp与sftp服务的发布工具 ')
  .usage('<project> <env>')
program
  .arguments(' <project> <env> ')
  .description('指定项目发布对应的环境')
  .action(function (project, env, command) {
    var ftpDeploy = new FtpDeploy()
    var protocol = config[project][env].protocol
    var Config = config[project][env]
    console.log('正在上传')
    if (Config && protocol === 'sftp') {
      try {
        client.scp(Config.localPath, Config.username + ':' + Config.password + '@' + Config.host + ':' + Config.remotePath, function (err) {
          err && console.log(err)
          err || console.log('上传成功')
        })
      } catch (e) {
        console.log(e)
      }
    } else if (Config && protocol === 'ftp') {
      try {
        Config.localRoot = Config.localPath
        Config.remoteRoot = Config.remotePath
        ftpDeploy.deploy(Config, function (err) {
          if (err) console.log(err)
          else console.log('上传成功')
        })
      } catch (e) {
        console.log(e)
      }
    }
  }
  )
program.parse(process.argv)
if (!program.args.length) program.help()
