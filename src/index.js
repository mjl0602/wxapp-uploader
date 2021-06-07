#!/usr/bin/env node

const exec = require('child_process').exec;
const fs = require('fs');
const ci = require('miniprogram-ci')
const {
  program
} = require('commander');
const {
  join
} = require('path');


/// 指令：上传项目
const upload = program.command('upload <version>');
upload
  .action(async (version, __) => {
    let args = program.opts();
    // 检查已有配置是否存在
    let configPath = join(process.cwd(), '/wx-upload-config.json')

    if (!fs.existsSync(configPath)) {
      console.log('wx-upload-config.json不存在，请运行命令: wxup init')
    }
    console.error('\n检查上传条件...\n');
    // 读取当前文件夹配置文件
    let content = JSON.parse(fs.readFileSync(configPath, {
      encoding: 'utf-8'
    }));
    // 拿到git信息，生成备注
    let commitInfo = await lastCommit();
    // 获取项目产物路径，拿到各个路径，appID
    let projectPath = join(process.cwd(), content.config.project.path);
    let keyPath = join(process.cwd(), args.key || content.config.key.path)
    let distPath = join(process.cwd(), args.path || content.config.dist.path);
    let appid = _v(keyPath.match(/(?<=\.)\S+(?=\.key)/g));

    var hasError = false;

    // 检查key存在
    if (!fs.existsSync(keyPath)) {
      console.log('==============[需要Key]===============')
      console.log('错误: upload-key当前不存在，无法进行上传')
      console.log('Key Path: ' + keyPath)
      console.log('注意: 请不要重命名upload-key，本工具会从文件名截取appid')
      console.log('微信后台: https://mp.weixin.qq.com/')
      console.log('详细说明: https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html')
      console.log('===================================')
      hasError = true;
    }
    // 运行checker，检查上传条件
    for (const checker of content.check) {
      let files = checker.files;
      let rules = checker.rules;
      for (const rawPath of files) {
        const filePath = join(process.cwd(), rawPath);
        var jsContent = require(filePath);
        for (const ruleText of rules) {
          var ruleInfoList = ruleText.replace(/\s/g, '').split('==');
          if (ruleInfoList.length != 2) {
            hasError = true;
            console.error('错误的规则表达式:', ruleInfoList);
            continue;
          }
          var ruleKey = ruleInfoList[0];
          var ruleValue = ruleInfoList[1];
          let value = jsContent[ruleKey];
          if (typeof value === "function") {
            value = value();
          }
          if (value == ruleValue) {
            console.log(`${ruleKey}的值是${ruleValue}, 检查通过`);
          } else {
            hasError = true;
            console.error(`[!错误] ${ruleKey} 的值错误，应当是 ${ruleValue}，现在是 ${value}`);
          }
        }
      }
    }
    // 生成Desc
    let descText = content.config.dist.desc;
    descText = descText.replace('${TIME}', `${commitInfo.buildTime}`)
    descText = descText.replace('${VERSION}', version)
    descText = descText.replace('${AUTHOR}', `${commitInfo.author}`)
    descText = descText.replace('${BRANCH}', `${commitInfo.branch}`)
    descText = descText.replace('${COMMIT}', `${commitInfo.commit}`)

    console.log('\nAppId：');
    console.log(appid);
    console.log('\n生成备注：');
    console.log(descText);
    // 出错就中断上传
    if (hasError) {
      console.error('\n检查未通过，请查找问题\n');
      return;
    } else {
      if (args.dry) {
        console.log('\n检查结束，没有发现问题\n')
        return;
      }
      console.log('上传中....')
    }
    // 上传
    const project = new ci.Project({
      appid: appid,
      type: 'miniProgram',
      projectPath: distPath,
      privateKeyPath: keyPath,
      ignores: ['node_modules/**/*'],
    })
    const uploadResult = await ci.upload({
      robot: content.robot || 0,
      project: project,
      version: version,
      desc: descText,
      setting: content.setting || defaultConfig.setting,
    })
    console.log(uploadResult);
  });
program.addCommand(upload)


// 默认的config文件
const defaultConfig = {
  'author': 'wxapp-uploader',
  'robot': 0,
  'setting': {
    'es6': true,
    'es7': false,
    'minify': true,
    'codeProtect': false,
    'minifyJS': true,
    'minifyWXML': true,
    'minifyWXSS': true,
    'autoPrefixWXSS': true,
  },
  'config': {
    'project': {
      'path': './',
    },
    'dist': {
      'path': './dist',
      'desc': '[${VERSION}]${AUTHOR} (${BRANCH}/${COMMIT}) -${TIME}',
    },
    'key': {
      'path': './key/#TODO:#.key',
    },
  },
  'check': [{
    'files': ['./src/apis/config'],
    'rules': ['timappid == 0', 'getImgPath == 0'],
  }],

}

/// 指令：初始化项目
const init = program.command('init');
init
  .action((_, __) => {
    let configPath = join(process.cwd(), '/wx-upload-config.json')
    // 检查已有配置是否存在
    console.log(configPath);
    if (!fs.existsSync(configPath)) {
      // 创建配置文件
      fs.writeFileSync(
        configPath,
        JSON.stringify(defaultConfig, void 0, 2), {
          encoding: 'utf-8'
        }
      )
      console.log('配置文件创建成功');
    } else {
      console.log('配置文件已存在');
    }
    // 检查key是否存在
    let content = JSON.parse(fs.readFileSync(configPath, {
      encoding: 'utf-8'
    }));
    let keyPath = join(process.cwd(), content.config.key.path);
    if (!fs.existsSync(keyPath)) {
      console.log('\n注意: 在上传前，你需要先指定upload-key')
      console.log('微信后台: https://mp.weixin.qq.com/')
      console.log('详细说明: https://developers.weixin.qq.com/miniprogram/dev/devtools/ci.html')
      return;
    } else {
      console.log('upload-key已存在，可以进行上传');
    }
  });
program.addCommand(init)

// 设置版本
program.version('0.0.1');
program
  .option('-k, --key <path>', '指定key的路径')
  .option('-p, --path <path>', '指定项目产物的路径')
  .option('-d, --dry', '测试能否上传')

program.parse(process.argv);

//////////////////////// 工具函数 ////////////////////////

/**
 * 获取最后一个commit详情
 * @returns 获取到的commit详情
 */
async function lastCommit() {
  return new Promise((r, e) => {
    exec('git log -1', function (_, stdout, _) {
      exec('git branch -v', function (_, br_stdout, _) {
        try {
          // 获取命令执行的输出
          r({
            commit: _v(stdout.match(/(?<=commit).+/g)),
            merge: _v(stdout.match(/(?<=Merge:).+/g)),
            author: _v(stdout.match(/(?<=Author:).+/g)),
            date: _v(stdout.match(/(?<=Date:).+/g, /\s\s\s/)),
            branch: _v(br_stdout.match(/(?<=\*\s)\S+(?=\s)/g)),
            buildTime: _d(new Date()),
          })
        } catch (error) {
          e(error);
        }
      });
    })
  })
}

// 取数组第一个值再移除空格
function _v(arr, remove) {
  return ((arr || [])[0] || '').replace(remove || /\s/, '');
}

// 简单格式化时间
function _d(date) {
  var d = new Date(date);
  return `${d.getFullYear()}.${_p2(d.getMonth()+1)}.${_p2(d.getDate())} ` + `${_p2(d.getHours())}:${_p2(d.getMinutes())}`
}

function _p2(num) {
  return `00000${num}`.slice(-2)
}