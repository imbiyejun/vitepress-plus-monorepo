# VitePress Plus Monorepo

# 测试 RC 版本发布

pnpm release:rc:next --dry --skipGit --skipPrompts
pnpm release:rc:patch --dry --skipGit --skipPrompts
pnpm release:rc:minor --dry --skipGit --skipPrompts
pnpm release:rc:major --dry --skipGit --skipPrompts

# 测试正式版本发布

pnpm release:prod:patch --dry --skipGit --skipPrompts
pnpm release:prod:minor --dry --skipGit --skipPrompts
pnpm release:prod:major --dry --skipGit --skipPrompts

参数说明：
--dry - 干运行模式，npm publish 不会真正发布
--skipGit - 跳过 git 操作（fetch/pull/commit/push/tag）
--skipPrompts - 跳过确认提示，自动执行
注意： 每次测试后需要还原 package.json 的版本号变更：

版本标识 含义 特点
alpha 内部测试版 功能不完善，bug 多，仅内部 / 少量用户测试
beta 公开测试版 功能基本完成，面向用户征集反馈
rc 发布候选版 功能冻结，仅修 bug，接近正式版
无标识 正式版（GA/Release） 稳定可用，面向所有用户发布

DEPLOY_HOST=your_server_ip
DEPLOY_PORT=22
DEPLOY_USERNAME=your_username
DEPLOY_PASSWORD=your_password
DEPLOY_REMOTE_PATH=/var/www/html
