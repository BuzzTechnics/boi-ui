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

describe('EmtsIntegration — registered-email banks (Fidelity)', () => {
  const fidelityBank: EdocBank = {
    bankId: 7,
    name: 'Fidelity Bank',
    bankCode: '058',
    enabled: true,
    bankInstructions: ['Log in to your account', 'Send Account Statement'],
    requiresBankRegisteredEmail: true,
  } as EdocBank

  const mountFidelity = (accountOver: Partial<BankStatementRecord> = {}, companyEmail = 'portal@company.com') => {
    const { calls, api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ email: companyEmail, ...accountOver }),
        edocBanks: [fidelityBank],
        bankOptions: [bankOption],
        api,
        companyEmail,
        applicationId: 100,
      },
    })
    return { calls, wrapper }
  }

  it('renders the registered-email input and starts empty when the row only holds the product email', () => {
    const { wrapper } = mountFidelity()
    const input = wrapper.find('input[type="email"]')
    expect(input.exists()).toBe(true)
    expect((input.element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).toContain('Email address registered with Fidelity Bank')
  })

  it('pre-fills a previously saved address that differs from the product email', () => {
    const { wrapper } = mountFidelity({ email: 'customer@fidelity-user.ng' })
    const input = wrapper.find('input[type="email"]')
    expect((input.element as HTMLInputElement).value).toBe('customer@fidelity-user.ng')
  })

  it('does not render the input for banks without the flag', () => {
    const { api } = makeApi()
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount(),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api,
        applicationId: 100,
      },
    })
    expect(wrapper.find('input[type="email"]').exists()).toBe(false)
  })

  it('blocks Retrieve Statement until a valid registered email is entered', async () => {
    const { calls, wrapper } = mountFidelity()
    const btn = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Retrieve Statement'))!
    expect(btn.attributes('disabled')).toBeDefined()

    await btn.trigger('click')
    await flushPromises()
    expect(calls.length).toBe(0)

    await wrapper.find('input[type="email"]').setValue('customer@fidelity-user.ng')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('sends the entered email on the consent — never the product email — and bubbles it up', async () => {
    const { calls, wrapper } = mountFidelity()
    await wrapper.find('input[type="email"]').setValue('customer@fidelity-user.ng')

    const btn = wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Retrieve Statement'))!
    await btn.trigger('click')
    await flushPromises()

    const init = calls.find((c) => c.url.includes('consent/initialize'))
    expect((init?.data as { email?: string })?.email).toBe('customer@fidelity-user.ng')

    // parent persists it on the row so boi-api's auto-submit path reads it too
    const emailEvents = wrapper.emitted('update:email')
    expect(emailEvents?.some((e) => e[0] === 'customer@fidelity-user.ng')).toBe(true)
  })

  it('emits update:email on blur so the address is saved before any consent call', async () => {
    const { wrapper } = mountFidelity()
    const input = wrapper.find('input[type="email"]')
    await input.setValue('customer@fidelity-user.ng')
    await input.trigger('blur')

    expect(wrapper.emitted('update:email')?.[0]?.[0]).toBe('customer@fidelity-user.ng')
  })
})

/**
 * A consent eDoc has marked `Failed` is finished: every later call against it
 * returns "Invalid Consent Status" no matter what OTP is typed. Before this, the
 * id stayed on the row and the Verify button stayed armed, so the applicant read
 * the failure as a mistyped code and tried again — 203 such calls across 41
 * consents in 30 days, one of them re-sent 59 times in seven minutes.
 *
 * boi-api now flags those responses `terminal: true`. These pin what the card
 * does with it: drop the consent, go back to the step that mints a new one, and
 * say which button that is.
 */
describe('EmtsIntegration — a consent eDoc will not honour again', () => {
  const terminalRejection = () => ({
    response: {
      status: 500,
      data: {
        success: false,
        terminal: true,
        message:
          'This bank statement request has already been used or has expired, so your bank will not accept it again. Please start a new request.',
      },
    },
  })

  function makeFailingApi(rejection: unknown) {
    const post = vi.fn(async (url: string) => {
      if (url.includes('consent/transactions')) return Promise.reject(rejection)
      if (url.includes('consent/initialize')) {
        return { data: { success: true, data: { data: { consentId: 'consent-new' } } } }
      }
      return { data: { success: true, data: {} } }
    })
    return { post }
  }

  it('drops the dead consent so the next press cannot reuse it', async () => {
    const account = baseAccount({ consent_id: 'dead-consent', showOtpInput: true, otp: '123456' })
    const wrapper = mount(EmtsIntegration, {
      props: {
        account,
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api: makeFailingApi(terminalRejection()),
        applicationId: 100,
      },
    })

    await wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Verify OTP'))!.trigger('click')
    await flushPromises()

    // The parent is told to forget it, and the typed code goes with it.
    expect(wrapper.emitted('update:consentId')?.[0]?.[0]).toBe('')
    expect(account.otp).toBe('')
  })

  it('names the button that starts a fresh request, per flow', async () => {
    const otpCard = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ consent_id: 'dead-consent', showOtpInput: true, otp: '123456' }),
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api: makeFailingApi(terminalRejection()),
        applicationId: 100,
      },
    })
    await otpCard.findAll('button[type="button"]').find((b) => b.text().includes('Verify OTP'))!.trigger('click')
    await flushPromises()

    const otpMessage = String(otpCard.emitted('error')?.[0]?.[0])
    expect(otpMessage).toContain('Please start a new request')
    expect(otpMessage).toContain('Send OTP')

    const bankAppCard = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ consent_id: 'dead-consent' }),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api: makeFailingApi(terminalRejection()),
        applicationId: 100,
      },
    })
    await bankAppCard.findAll('button[type="button"]').find((b) => b.text().includes('I Have Authorized'))!.trigger('click')
    await flushPromises()

    expect(String(bankAppCard.emitted('error')?.[0]?.[0])).toContain('Retrieve Statement')
  })

  it('returns the bank-app card to step 1 once the consent is gone', async () => {
    const wrapper = mount(EmtsIntegration, {
      props: {
        account: baseAccount({ consent_id: '' }),
        edocBanks: [instructionBank],
        bankOptions: [bankOption],
        api: makeFailingApi(terminalRejection()),
        applicationId: 100,
      },
    })

    // consent_id is what gates the two steps; cleared, the card offers the
    // button that mints a new consent rather than one that re-uses a dead id.
    expect(wrapper.text()).toContain('Retrieve Statement')
    expect(wrapper.text()).not.toContain('I Have Authorized')
  })

  it('leaves the consent alone when the failure is one a retry can still clear', async () => {
    const account = baseAccount({ consent_id: 'live-consent', showOtpInput: true, otp: '123456' })
    const wrapper = mount(EmtsIntegration, {
      props: {
        account,
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api: makeFailingApi({
          response: {
            status: 500,
            data: {
              success: false,
              terminal: false,
              message: 'That code has expired. Click "Send OTP" to have your bank email you a new one.',
            },
          },
        }),
        applicationId: 100,
      },
    })

    await wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Verify OTP'))!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:consentId')).toBeUndefined()
    expect(account.otp).toBe('123456')
    expect(String(wrapper.emitted('error')?.[0]?.[0])).toContain('That code has expired')
  })

  it('acts on the flag when it arrives on a 200 body rather than a rejection', async () => {
    const account = baseAccount({ consent_id: 'dead-consent', showOtpInput: true, otp: '123456' })
    const wrapper = mount(EmtsIntegration, {
      props: {
        account,
        edocBanks: [otpBank],
        bankOptions: [bankOption],
        api: {
          post: vi.fn(async (url: string) =>
            url.includes('consent/transactions')
              ? { data: { success: false, terminal: true, message: 'This request has expired. Please start a new request.' } }
              : { data: { success: true, data: {} } }
          ),
        },
        applicationId: 100,
      },
    })

    await wrapper.findAll('button[type="button"]').find((b) => b.text().includes('Verify OTP'))!.trigger('click')
    await flushPromises()

    expect(wrapper.emitted('update:consentId')?.[0]?.[0]).toBe('')
  })
})
