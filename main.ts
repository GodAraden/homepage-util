import { access, mkdir, readdir, rm, writeFile } from 'node:fs/promises'
import puppeteer, { Page } from 'puppeteer'
import { children } from './bookmarks.json'

interface BookmarkItem {
  title: string
  uri?: string
  children?: BookmarkItem[]
}

const IGNORE = new Set(['', 'lab', '个人网站', '杂项', '学校网站', '博文收藏', '简历投递链接', '流程中'])
const VIEWPORT = { width: 1280, height: 720 }
const WAITTIME = 5000

// 从浏览器导出书签中提取要截图的那部分
function purifying(origin: BookmarkItem) {
  if (IGNORE.has(origin.title)) return

  const copied: BookmarkItem = {
    title: origin.title
  }

  if (origin.uri) {
    copied.uri = origin.uri
  }

  if (origin.children) {
    copied.children = []
    for (const child of origin.children) {
      const res = purifying(child)
      if (res) copied.children.push(res)
    }
  }
  return copied
}

// 根据给定的 uri 截图，放入 path 下
async function snap(page: Page, uri: string, path: string) {
  const startTime = +new Date()

  try {
    await page.goto(uri)
    await new Promise(resolve => {
      // 等 500ms，一些 CSR 项目都能加载完毕，等 3s，3d 啥的都加载完了
      setTimeout(resolve, WAITTIME)
    })
    await page.screenshot({ path })

    const finishTime = +new Date()

    console.log(`${path} 截图成功, 耗时 ${finishTime - startTime}ms`)
  } catch (e) {
    console.log(`${path} ${uri} 截图失败, 捕获到${e}`)
  }
}

// 递归遍历导航对象，根据对象类型选择截图或者递归遍历子数组
async function traverse(page: Page, navi: BookmarkItem, path: string[]) {
  path.push(navi.title)
  const dirPath = path.join('/')

  if (navi.uri) {
    // 有 URL 则截图
    try {
      await access(`${dirPath}.png`)
    } catch (e) {
      await snap(page, navi.uri, `${dirPath}.png`)
    }
  } else if (navi.children) {
    // 无 URL 创建文件夹，递归
    try {
      await access(dirPath)
    } catch (e) {
      await mkdir(dirPath, { recursive: true })
      console.log(`创建文件夹：${dirPath}\n`)
    } finally {
      for (const child of navi.children) {
        await traverse(page, child, path)
      }
    }
  }

  path.pop()
}

// 得到当前导航对象下所有截图的路径集合，用于删除不需要的截图
function fileSet(navi: BookmarkItem, path: string[] = [], res = new Set<string>()) {
  path.push(navi.title)

  if (navi.children) {
    for (const child of navi.children) {
      fileSet(child, path, res)
    }
  } else if (navi.uri) {
    res.add(`${path.join('/')}.png`)
  }

  path.pop()
  return res
}

// 递归遍历生成的截图文件夹，删除导航对象中没有的截图文件
async function remove(navi: BookmarkItem, path: string[], existed: Set<string>) {
  path.push(navi.title)

  const files = await readdir(path.join('/'))

  for (const file of files) {
    if (file.endsWith('.png')) {
      const fullPath = `${path.join('/')}/${file}`
      if (!existed.has(fullPath)) {
        try {
          await rm(fullPath)
          console.log(`${fullPath} 删除成功`)
        } catch (err) {
          console.log(`${fullPath} 删除失败，请手动删除`)
        }
      }
    } else {
      await remove(
        navi.children.find(child => child.title === file),
        path,
        existed
      )
    }
  }

  path.pop()
}

// 程序本体
const main = async (navigations: BookmarkItem) => {
  try {
    // 写入文件
    const { signal } = new AbortController()
    await writeFile('navigator.ts', `export const navigator = ${JSON.stringify(navigations)}`, { signal })
    console.log('提取 navigator.ts 成功！')

    // 创建浏览器，打开窗口
    const browser = await puppeteer.launch({ headless: 'new' })

    const page = await browser.newPage()
    page.setDefaultTimeout(100000)
    await page.setViewport(VIEWPORT)

    // 开始截图
    await traverse(page, navigations, [])

    // 移除导航对象中不包含的截图
    await remove(navigations, [], fileSet(navigations))

    await page.close()
    await browser.close()
  } catch (err) {
    console.error(err)
  }
}

const navigations = purifying(children.find(child => child.title === 'toolbar'))
navigations.title = 'navigator'

main(navigations)
