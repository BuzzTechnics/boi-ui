import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import NumberInput from '../../src/components/NumberInput.vue'

describe('NumberInput', () => {
  it('strips non-digits and emits a numeric string', async () => {
    const wrapper = mount(NumberInput, { props: { modelValue: '' } })
    const input = wrapper.find('input')
    ;(input.element as HTMLInputElement).value = '12a3b'
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('123')
  })

  it('shows the grouped preview automatically once the value reaches 1,000', () => {
    const small = mount(NumberInput, { props: { modelValue: '999' } })
    expect(small.find('p').exists()).toBe(false)

    const big = mount(NumberInput, { props: { modelValue: '1500000' } })
    expect(big.find('p').exists()).toBe(true)
    expect(big.find('p').text()).toContain(',')
  })

  it('always shows the grouped preview when formatMode is "always"', () => {
    const wrapper = mount(NumberInput, { props: { modelValue: '25', formatMode: 'always' } })
    expect(wrapper.find('p').exists()).toBe(true)
    expect(wrapper.find('p').text()).toContain('25')
  })

  it('hides the preview for a disabled field (value already read-only)', () => {
    const wrapper = mount(NumberInput, { props: { modelValue: '1500000', disabled: true } })
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('allows decimals when decimals > 0', async () => {
    const wrapper = mount(NumberInput, { props: { modelValue: '', decimals: 2 } })
    const input = wrapper.find('input')
    ;(input.element as HTMLInputElement).value = '12.5x9'
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBe('12.59')
  })
})
