# 编程导航截图、数据源生成器

1. 将 firefox 浏览器备份的书签重命名为 bookmarks.json，移动到项目根目录下

2. main.ts 中的 IGNORE 集合常量是不放入最终结果中的书签名

3. 安装依赖，运行 pnpm dev 后得到的 navigator / navigator.json 即为 截图 / 数据源

**注意：windows 下，不能有含非法字符的书签，如“|”，“/”**
