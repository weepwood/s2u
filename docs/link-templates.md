# 内置链接模板（第一阶段）

创建页的链接模板提供 Obsidian 笔记库/路径、VS Code 本地绝对文件路径及行列、HTTP/HTTPS 网页查询参数编辑。参数逐项编码，最终目标始终通过现有 linkCodec 校验。模板只填入现有目标输入框，用户之后仍可编辑、复制、生成二维码或测试打开；不自动记录历史、启动应用、读取文件或请求外部服务。路径可能包含私人信息，分享前核对。VS Code 使用官方文档所述 file URI 与行列后缀，不支持 UNC、相对路径或歧义冒号。真实应用唤起需人工设备测试。

参考：https://code.visualstudio.com/docs/configure/command-line#_opening-vs-code-with-urls

自定义模板持久化、批量生成和更多协议参数暂未实现。
