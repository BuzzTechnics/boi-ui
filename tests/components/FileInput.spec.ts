import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FileInput from '../../src/components/FileInput.vue'

describe('FileInput', () => {
  it('renders placeholder when no value', () => {
    const wrapper = mount(FileInput, { props: { placeholder: 'Choose file' } })
    expect(wrapper.text()).toContain('Choose file')
  })

  it('uses default upload URL when uploadUrl not provided', () => {
    const wrapper = mount(FileInput, { props: { uploadUrl: undefined } })
    expect(wrapper.find('input[type="file"]').exists()).toBe(true)
  })

  it('shows view link when modelValue set and uploadToServer true', () => {
    const wrapper = mount(FileInput, {
      props: { modelValue: 'documents/x.pdf', uploadToServer: true },
    })
    const link = wrapper.find('a[href*="files/view"]')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toContain(encodeURIComponent('documents/x.pdf'))
  })

  it('accepts afterUpload and uploadUrl props', () => {
    const wrapper = mount(FileInput, {
      props: { afterUpload: vi.fn(), uploadUrl: '/custom/upload' },
    })
    expect(wrapper.props('uploadUrl')).toBe('/custom/upload')
    expect(wrapper.props('afterUpload')).toBeDefined()
  })
})
