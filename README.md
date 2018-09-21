## 一个简单的前端发布工具
### 安装
```bash
npm install deployman  -g
```
### 新建配置文件 `dmconfig.js`
```js
var path = require('path')

module.exports = {
  '项目名称': {
    '环境名称1': {
      protocol: 'sftp', //支持ftp与sftp,推荐使用sftp
      username: 'root', //用户名
      password: '***',  //用户密码
      host: '192.168.1.233', //主机名
      port: 22, //端口
      localPath: path.resolve(__dirname, './dist/src-main'), //本地路径
      remotePath: '/data/wwwroot/default/centermed' //主机路径
    },
    '环境名称2': {
      protocol: 'sftp',
      username: 'root',
      password: '***',
      host: '192.168.1.233',
      port: 22,
      localPath: path.resolve(__dirname, './dist/src-main'),
      remotePath: '/data/wwwroot/default/admin'
    }
  }
```
### 发布命令
```bash
deployman 项目名称 环境名称1 #这么设计的目的在于同一个项目发布到不同环境，如果项目是node项目，你也可以把这些命令配置到package.json里面
```
