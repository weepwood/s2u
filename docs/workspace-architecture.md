# 工作台业务模块

Change.vue 只负责布局、异步面板加载、根状态、依赖装配与生命周期入口。原有 useHistory、useCommonLinks、useCloudSync、workspaceScope 仍是唯一数据和持久化入口。

- useWorkspaceSync：Gist 同步串行协调、连接、冲突、工作区选择、备份和恢复、自动同步生命周期。
- useShareRedirect：分享 Hash、协议校验、自动/手动跳转、取消定时任务与监听。
- useBookmarkActions：收藏存储操作、导入导出、原始地址/分享地址复制。
- useHistoryActions：历史删除、清空及导入确认。
- useWorkspaceNavigation：主导航方向、键盘、帮助和命令面板状态。

模块通过显式依赖接收同一组 store/ref，不改变旧存储键、数据格式、安全策略、权限、样式或网络请求。将原来的函数体迁移为主，修正在线重试判断中的正则转义错误。后续可继续把同步模块内的备份职责拆为独立模块。测试重点为现有公开跳转、键盘、收藏、工作区、同步冲突、恢复与发布子路径回归。
