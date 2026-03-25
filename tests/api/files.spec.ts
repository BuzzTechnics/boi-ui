import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { filesApi, boiFilesApiBase } from '../../src/api/files'

describe('filesApi', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BOI_FILES_API_BASE', undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to host app /api/files/*', () => {
    expect(boiFilesApiBase()).toBe('')
    expect(filesApi.upload()).toBe('/api/files/upload')
    expect(filesApi.view('documents/a b.pdf')).toContain('/api/files/view')
    expect(filesApi.view('documents/a b.pdf')).toContain(encodeURIComponent('documents/a b.pdf'))
  })

  it('VITE_BOI_FILES_API_BASE prefixes boi-api or proxy', () => {
    vi.stubEnv('VITE_BOI_FILES_API_BASE', '/api/boi-api')
    expect(boiFilesApiBase()).toBe('/api/boi-api')
    expect(filesApi.upload()).toBe('/api/boi-api/api/files/upload')
    vi.unstubAllEnvs()
  })

  it('empty VITE_BOI_FILES_API_BASE uses shell /api/files/*', () => {
    vi.stubEnv('VITE_BOI_FILES_API_BASE', '')
    expect(boiFilesApiBase()).toBe('')
    expect(filesApi.upload()).toBe('/api/files/upload')
    expect(filesApi.view('x.pdf')).toBe('/api/files/view?path=' + encodeURIComponent('x.pdf'))
  })
})
