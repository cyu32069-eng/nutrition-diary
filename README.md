# 饮食记录 Nutrition Diary

一个中文、轻量、可离线使用的饮食记录应用。无需注册，数据保存在自己的浏览器里。

**[直接使用 → 饮食记录](https://cyu32069-eng.github.io/nutrition-diary/)**

## 功能

- 69 项常用中文食物搜索，记录重量、热量和三大营养素。
- 早餐、午餐、晚餐、加餐横滑卡片，支持修改、删除和历史日期。
- 身高、体重、年龄与公式性别输入，Mifflin–St Jeor 基础代谢估算。
- 右侧“盈余”＝基础代谢估算－已记录摄入；吃超后显示红色“赤字”。这是本应用的界面命名，仅比较基础代谢，不能代表全天实际能量缺口。
- JSON 导出备份和合并导入，首次联网缓存后可离线使用。

## 手机安装

发布后用手机浏览器打开体验网址。iPhone：Safari → 分享 → 添加到主屏幕。Android：浏览器菜单 → 安装应用／添加到主屏幕（选项依浏览器而异）。

首次打开需要联网。安装完成后可像应用一样从桌面启动。本项目提供 PWA 网页应用，尚无 App Store 或安卓商店安装包。

## 数据与隐私

身体资料和饮食记录保存在本机浏览器，不发送到服务器。没有登录、云同步或用户行为统计。网站托管平台仍会接收正常页面请求。清理网站数据、换浏览器或换设备可能丢失记录，请定期导出备份；主屏幕应用和浏览器可能使用独立存储。

食物数据来自 USDA FoodData Central，详见 [数据来源](data/SOURCES.md)。中文名称为本项目整理。计算结果用于日常记录，受食物品种、称重状态和记录完整度影响。基础代谢公式支持 19–78 岁成人估算，不计算活动消耗。

## 本地开发

安装 Node.js 22 与 pnpm 10，然后执行：

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

`dist/` 为静态网站，部署在 HTTPS 上才能使用离线缓存和安装能力。

## 发布到 GitHub Pages

1. 将本目录源码上传到公开仓库的 `main` 分支。
2. 仓库 Settings → Pages → Source 选择 **GitHub Actions**。
3. 在 Actions 运行 **Deploy Pages**；以后推送 main 自动测试、构建和部署。
4. 以部署回执中的 URL 为准，将其填入仓库 About 的 Website。本仓库体验网址为 https://cyu32069-eng.github.io/nutrition-diary/ 。

工作流依据 [GitHub Pages 官方文档](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

## 反馈

欢迎在 Issues 描述操作步骤、期望结果和实际结果。请勿附上自己的身体数据、完整饮食备份或其他个人信息。

项目当前为早期体验版。界面与核心流程已进行浏览器验证，真实设备差异欢迎反馈。
