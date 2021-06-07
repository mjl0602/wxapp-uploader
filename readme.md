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
$ wxup upload 1.0.0+2

# 运行项目上传检查
$ wxup upload 1.0.0+1 --dry
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

## 高级特性

本工具具有以下高级特性，用于上传时的代码检查

### 定义check，检查代码中变量

在`wx-upload-config.json`中，可以定义`check`规则。

本功能主要用于避免dev环境下的代码被部署到线上。

```js
// 增加check条件数组
"check": [
  {
    // 需要检查的文件数组
    "files": [
      "./src/apis/configA"
      "./src/apis/configB"
    ],
    // 检查下列变量是否为指定值
    // 请注意对应参数需要export后才可以被检查
    "rules": [
      "baseUrl == foo.net",
      "baseImgUrl == foo-img.net"
    ]
  },
  // 可以定义多组check规则
  {
    "files": [
      "./src/apis/configC"
    ],
    "rules": [
      "fileUploadUrl.length == 0",
      "getImgPath.length == 0"
    ]
  },
]
```

### 使用script属性添加自定义检查脚本

如果`check`属性无法满足需求，请使用`script`属性添加自定义检查脚本

在`wx-upload-config.json`中，添加自定义`script`路径：

```js
"script": [
  "./check/mycheck.js"
],
```

在`mycheck.js`中，必须暴露名为`check`的方法。  
`check`方法接收的参数为`wx-upload-config.json`的内容.

> 返回值规则：  
    1. `check`方法返回值为0时（类型可以为int或者Promise\<int>），继续后续动作。  
    2. 返回值为其他内容时，会显示脚本检查未通过，然后依然继续运行剩余脚本检查，在最后进行上传动作前，停止上传动作并提示问题。

example:
```js
// ./check/mycheck.js
export async function check(config){
  console.log("检查未通过");
  return -1;
}
```