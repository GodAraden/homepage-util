参考

- [https://www.onyi.net/](https://www.onyi.net/)
- [https://chenfengblog.eu.org/](https://chenfengblog.eu.org/)
- [https://blog.krahsu.top/link](https://blog.krahsu.top/link)

博客封面：

[https://thecatapi.com/](https://thecatapi.com/)

### 模块划分

1. 主页：自我介绍，最近博客
2. 个人博客
3. 编程导航
4. 实用工具
   - 网盘
   - 备忘录 / TODO List（可选）

### 需要考虑的问题 / 总体架构

技术栈：前端Vue.js + TypeScript，后端NestJS + Prisma + TypeScript

- 移动端适配方案：arco design & tailwind css，底层是媒体查询 + flex / grid
- 权限系统实现方案：
  - 前端：路由元信息 + 路由守卫（路由级）， 自定义指令（组件级）。身份信息存储在 store 中
  - 后端：自定义装饰器 校验请求用户对应的 session（接口级）
- 用户体验优化方案：各种动画、瀑布流、骨架屏
- 管理页、博客、网盘等功能页