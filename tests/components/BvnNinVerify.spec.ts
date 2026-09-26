import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BvnNinVerify from '../../src/components/BvnNinVerify.vue'

/**
 * SPAF issue-log #11: BVN and NIN are 11-digit numbers, but the fields accepted
 * letters — type="tel"/inputmode="numeric" only hint the keyboard. The component now
 * strips non-digits on input and caps at 11.
 */
describe('BvnNinVerify — numeric-only input (issue-log #11)', () => {
  const typeInto = async (selector: string, raw: string) => {
    const wrapper = mount(BvnNinVerify, { props: { validateUrl: '/validate' } })
    const input = wrapper.find(selector)
    ;(input.element as HTMLInputElement).value = raw
    await input.trigger('input')
    await wrapper.vm.$nextTick()
    const emitted = wrapper.emitted('update:modelValue')?.at(-1)?.[0] as {
      bvn: string
      nin: string
    }
    return { emitted, value: (input.element as HTMLInputElement).value }
  }

  it('strips letters from the BVN, keeping only digits', async () => {
    const { emitted, value } = await typeInto('#bvn_nin_bvn', '12ab34cd56')
    expect(emitted.bvn).toBe('123456')
    expect(value).toBe('123456')
  })

  it('strips letters from the NIN, keeping only digits', async () => {
    const { emitted, value } = await typeInto('#bvn_nin_nin', 'aa11bb22cc')
    expect(emitted.nin).toBe('1122')
    expect(value).toBe('1122')
  })

  it('caps the BVN at 11 digits', async () => {
    const { emitted } = await typeInto('#bvn_nin_bvn', '1234567890123456')
    expect(emitted.bvn).toBe('12345678901')
  })

  it('leaves an already-numeric value untouched', async () => {
    const { emitted, value } = await typeInto('#bvn_nin_bvn', '22233344455')
    expect(emitted.bvn).toBe('22233344455')
    expect(value).toBe('22233344455')
  })
})
