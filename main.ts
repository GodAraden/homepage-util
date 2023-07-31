import { access, mkdir, writeFile } from 'node:fs/promises'
import { Buffer } from 'node:buffer'
import puppeteer, { Page } from 'puppeteer'
import { children } from './bookmarks.json'

interface BookmarkItem {
  title: string
  uri?: string
  children?: BookmarkItem[]
}

const IGNORE = new Set(['', 'lab', '个人网站', '杂项', '学校网站', '博文收藏', '简历投递链接'])
const VIEWPORT = { width: 1280, height: 720 }
const WAITTIME = 500

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
    console.log(`${uri} 截图失败, 捕获到${e}`)
  }
}

async function traverse(page: Page, navigations: BookmarkItem[], path: string[]) {
  for (const navi of navigations) {
    path.push(navi.title)
    const dirPath = path.join('/')

    if (navi.uri) {
      // 有 URL 则截图
      try {
        await access(`${dirPath}.png`)
      } catch (e) {
        await snap(page, navi.uri, `${dirPath}.png`)
      }
    } else {
      // 无 URL 创建文件夹，递归
      try {
        await access(dirPath)
      } catch (e) {
        await mkdir(dirPath, { recursive: true })
        console.log(`创建文件夹：${dirPath}\n`)
      } finally {
        await traverse(page, navi.children, path)
      }
    }

    path.pop()
  }
}

const main = async (navigations: BookmarkItem[]) => {
  try {
    // 写入文件
    const { signal } = new AbortController()
    const data = new Uint8Array(Buffer.from(JSON.stringify(navigations)))
    await writeFile('navigator.json', data, { signal })
    console.log('提取 navigator.json 成功！')

    // 创建浏览器，打开窗口
    const browser = await puppeteer.launch({ headless: 'new' })

    const page = await browser.newPage()
    page.setDefaultTimeout(100000)
    await page.setViewport(VIEWPORT)

    // 开始截图
    await traverse(page, navigations, ['navigator'])

    await page.close()
    await browser.close()
  } catch (err) {
    console.error(err)
  }
}

const toolbar = children.find(child => child.title === 'toolbar')
const navigations = purifying(toolbar).children

main(navigations)
