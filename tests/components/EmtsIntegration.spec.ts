import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import EmtsIntegration from '../../src/components/EmtsIntegration.vue'
import type { BankStatementRecord, EdocBank, BankOption } from '../../src/types/edoc'

const baseAccount = (over: Partial<BankStatementRecord> = {}): BankStatementRecord => ({
  id: 1,
  loan_application_id: 100,
  bank: '058',
  account_number: '1234567890',
  account_name: 'Acme Industries Ltd',
  account_type: 'Business',
  bvn: '',
  email: '[email protected]',
  bank_statement: '',
  csv_url: '',
  consent_id: '',
  edoc_status: 'pending',
  statement_generated: false,
  otp: '',
  showOtpInput: false,
  uploaded_statement_path: '',
  ...over,
})

const bankOption: BankOption = {
  value: '058',
  label: 'GTBank',
  shortName: 'GTBank',
  searchKeywords: ['GTBank'],
  edocBankId: 42,
}

const instructionBank: EdocBank = {
  bankId: 42,
  name: 'GTBank',
  bankCode: '058',
  enabled: true,
  bankInstructions: ['Open your GTB app', 'Approve the statement request'],
} as EdocBank

const otpBank: EdocBank = {
  bankId: 99,
  name: 'Standard Bank',
  bankCode: '058',
  enabled: true,
  // no bankInstructions: standard OTP flow
} as EdocBank

function makeApi() {
  const calls: { url: string; data?: unknown }[] = []
  const post = vi.fn(async (url: string, data?: unknown) => {
    calls.push({ url, data })
    if (url.includes('consent/initialize')) {
      return { data: { success: true, data: { data: { consentId: 'consent-xyz' } } } }
    }
    if (url.includes('consent/attach-account')) {
      return { data: { success: true, data: {} } }
    }
    if (url.includes('consent/transactions')) {
      return {
        data: {
          success: true,
          data: { statement: { ...baseAccount(), edoc_status: 'processing', statement_generated: false } },
        },
      }
    }
    return { data: { success: false } }
  })
  return { calls, api: { post } }
}

describe('EmtsIntegration — instruction-bank two-step flow', () => {
  it('Step 1: "Retrieve Statement" calls only init + attach (NOT transactions)', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('Retrieve Statement')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    // exactly the two preparatory calls — fetch is deferred to step 2
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(false)

    // consentId is bubbled up so the parent persists it
    const events = wrapper.emitted('update:consentId')
    expect(events?.[0]?.[0]).toBe('consent-xyz')
  })

  it('Step 2: only after consent_id is set does the "I Have Authorized" button render and fetch transactions', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ consent_id: 'consent-xyz' }),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('I Have Authorized')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(true)
    // step 2 must NOT re-run init/attach
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(false)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(false)

    // emits the updated statement to parent
    const retrieved = wrapper.emitted('statement-retrieved')
    expect(retrieved).toBeTruthy()
  })

  it('OTP-bank flow is unchanged: "Send OTP" runs init+attach (no transactions yet)', async () => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })

    const btn = wrapper.find('button[type="button"]')
    expect(btn.text()).toContain('Send OTP')

    await btn.trigger('click')
    await flushPromises()

    const calledUrls = calls.map((c) => c.url)
    expect(calledUrls.some((u) => u.includes('consent/initialize'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/attach-account'))).toBe(true)
    expect(calledUrls.some((u) => u.includes('consent/transactions'))).toBe(false)
  })
})
