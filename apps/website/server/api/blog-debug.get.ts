import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

export default defineEventHandler(async () => {
  try {
    // Try reading the content blog directory to find actual paths
    const contentDir = join(process.cwd(), 'content', 'blog')
    const files = await readdir(contentDir)
    
    // Also try querying via the nitro storage
    const storage = useStorage('content')
    const keys = await storage.getKeys('blog')
    
    return { 
      files,
      storageKeys: keys,
      cwd: process.cwd()
    }
  } catch (err: any) {
    return { error: err.message, cwd: process.cwd() }
  }
})
