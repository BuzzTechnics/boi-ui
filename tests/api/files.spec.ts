import { describe, it, expect } from 'vitest'
import { filesApi } from '../../src/api/files'

describe('filesApi', () => {
  it('upload returns path', () => {
    expect(filesApi.upload()).toBe('/api/files/upload')
  })

  it('view returns URL with encoded path', () => {
    expect(filesApi.view('documents/a b.pdf')).toContain('path=')
    expect(filesApi.view('documents/a b.pdf')).toContain(encodeURIComponent('documents/a b.pdf'))
  })
})
