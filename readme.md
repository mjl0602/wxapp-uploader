# wxapp-uploader

wxapp-uploader可以通过命令行上传微信小程序代码，并自动生成项目备注

## 命令

```bash
# 查看帮助
$ wxup
$ wxup -h
$ wxup --help

# 初始化项目
$ wxup init

# 检查并上传
$ wxup upload

# 运行项目上传检查
$ wxup upload --dry
```

upload命令其他参数：
```bash
'-k, --key <path>': '指定key的路径'
'-p, --path <path>': '指定项目产物的路径'
```
## 安装

```bash
git clone https://github.com/mjl0602/wxapp-uploader.git
cd wxapp-uploader
npm install -g
wxup
```