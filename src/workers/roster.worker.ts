import { read, utils } from 'xlsx'
import type { Cell, SheetData } from '../types'
self.onmessage = async (event: MessageEvent<{ file: File }>) => {
  try {
    const file = event.data.file
    const buffer = await file.arrayBuffer()
    let data: ArrayBuffer | string = buffer
    const textFile = /\.(csv|tsv)$/i.test(file.name)
    if (textFile) {
      const bytes=new Uint8Array(buffer)
      if(bytes[0]===0xff && bytes[1]===0xfe) data=new TextDecoder('utf-16le').decode(buffer)
      else if(bytes[0]===0xfe && bytes[1]===0xff) data=new TextDecoder('utf-16be').decode(buffer)
      else {try { data = new TextDecoder('utf-8', { fatal: true }).decode(buffer) } catch { data = new TextDecoder('gb18030').decode(buffer) }}
    }
    const book = read(data, { type: textFile ? 'string' : 'array', sheetRows: 10002, cellDates: false, raw: textFile, dense: true })
    const sheets: SheetData[] = book.SheetNames.map(name => {
      const sheet = book.Sheets[name]
      const ref = sheet['!fullref'] || sheet['!ref'] || 'A1'
      const range = utils.decode_range(ref)
      if (range.e.r >= 10001 || range.e.c >= 100) throw new Error(`工作表「${name}」超过 10,000 行数据或 100 列，请精简后上传。`)
      const rows = utils.sheet_to_json<Cell[]>(sheet, { header: 1, defval: null, blankrows: true, raw: true, range: 0 })
      return { name, rows }
    })
    self.postMessage({ sheets })
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : '表格读取失败，请检查文件。' }) }
}
