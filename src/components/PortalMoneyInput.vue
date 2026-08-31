<script setup lang="ts">
import { cn } from '../lib/utils';
import type { HTMLAttributes } from 'vue';
import { computed, ref, watch } from 'vue';

/**
 * The boi-online-portal money input (components/ui/input/MoneyInput.vue),
 * ported so ADF renders money fields exactly as the portal does: currency
 * box + amount field, with the comma-grouped amount echoed underneath.
 *
 * Kept identical to the portal source: the props API (dual
 * modelCurrency/modelAmount v-models), input sanitisation, keydown guard,
 * max clamping, currency defaulting (syncCurrencyToForm) and the
 * one-currency lock with its awaiting-async-list exception.
 *
 * Adapted for a shared library — the portal version reaches into app-only
 * machinery that has no counterpart here:
 *  - currencies come only from the `currencies` prop (the portal falls back
 *    to its useBusinessData API list); the default stays NGN-only;
 *  - no FieldComment, admin-editor roles, form auto-disable, or Inertia
 *    page-error styling (consumers render InputError below the field);
 *  - the currency chooser is a native <select> wearing the portal Select
 *    trigger's classes (the portal's searchable dropdown is portal-bound).
 */
const props = withDefaults(defineProps<{
    defaultCurrency?: string;
    defaultAmount?: string | number;
    modelCurrency?: string;
    modelAmount?: string | number;
    class?: HTMLAttributes['class'];
    currencyPlaceholder?: string;
    amountPlaceholder?: string;
    inputClass?: HTMLAttributes['class'];
    currencyName?: string;
    amountName?: string;
    currencyId?: string;
    amountId?: string;
    currencyFieldName?: string;
    amountFieldName?: string;
    disabled?: boolean;
    readonly?: boolean;
    // Either plain codes or {value,label} options — availableCurrencies normalises both.
    currencies?: (string | { value: string; label: string })[];
    showCurrency?: boolean;
    excludeCurrencies?: string[];
    disableCurrency?: boolean;
    max?: number | string;
    id: string;
    title?: string;
    decimalPlaces?: number;
    suffix?: string;
}>(), {
    showCurrency: true,
    disableCurrency: false
});

const emits = defineEmits<{
    (e: 'update:modelCurrency', payload: string): void;
    (e: 'update:modelAmount', payload: string | number): void;
}>();

// Hand-rolled passive v-models (the portal uses @vueuse's useVModel, which
// boi-ui does not depend on): the local ref keeps working when the parent
// binds nothing, and every change is emitted.
const localCurrency = ref<string>(props.modelCurrency ?? props.defaultCurrency ?? 'NGN');
watch(() => props.modelCurrency, (value) => {
    if (value !== undefined && value !== null) localCurrency.value = value;
});
const modelCurrency = computed({
    get: () => localCurrency.value,
    set: (value: string) => {
        localCurrency.value = value;
        emits('update:modelCurrency', value);
    },
});

const localAmount = ref<string | number | undefined>(props.modelAmount ?? props.defaultAmount);
watch(() => props.modelAmount, (value) => {
    localAmount.value = value;
});
const modelAmount = computed({
    get: () => localAmount.value,
    set: (value: string | number) => {
        localAmount.value = value;
        emits('update:modelAmount', value);
    },
});

const availableCurrencies = computed(() => {
    // Explicitly provided currencies win; otherwise NGN-only (most common case).
    let currencies: any[] = props.currencies && props.currencies.length > 0
        ? props.currencies
        : [{ value: 'NGN', label: 'NGN' }];

    if (props.excludeCurrencies && props.excludeCurrencies.length > 0) {
        currencies = currencies.filter((currency: any) => {
            const currencyValue = typeof currency === 'string' ? currency : currency.value;
            return !props.excludeCurrencies?.includes(currencyValue);
        });
    }

    return currencies.map((currency: any) => {
        if (typeof currency === 'string') {
            return { value: currency, label: currency };
        }
        return currency;
    });
});

/**
 * A single option means there is nothing to choose, so the select is disabled.
 *
 * Portal UAT Loan Assessment #8: a caller that passes `:currencies` is fed from
 * an async list; until it arrives the prop is empty, availableCurrencies falls
 * back to NGN-only and the field would lock itself. The fallback therefore does
 * not count as a real choice while the caller is still waiting for its list.
 */
const isAwaitingCurrencyList = computed(() => Array.isArray(props.currencies) && props.currencies.length === 0);

const hasOnlyOneCurrency = computed(() => {
    if (isAwaitingCurrencyList.value) return false;

    return availableCurrencies.value.length === 1;
});

const hasAmount = computed(() => {
    return modelAmount.value !== null && modelAmount.value !== undefined && modelAmount.value !== '';
});

const hasCurrency = computed(() => {
    return modelCurrency.value !== null && modelCurrency.value !== undefined && modelCurrency.value !== '';
});

const handleInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    const numericValue = value.replace(/[^0-9.]/g, '');
    const parts = numericValue.split('.');

    let integerPart = parts[0] || '';
    let decimalPart = parts.length > 2 ? parts.slice(1).join('') : (parts[1] || '');

    if (props.decimalPlaces !== undefined && decimalPart.length > props.decimalPlaces) {
        decimalPart = decimalPart.slice(0, props.decimalPlaces);
    }

    integerPart = integerPart.replace(/^0+/g, '') || '';

    let cleanValue = integerPart;
    if (decimalPart || numericValue.includes('.')) {
        cleanValue += '.' + decimalPart;
    }

    if (props.max !== undefined && props.max !== null) {
        const maxValue = Number(props.max);
        const numericCleanValue = Number(cleanValue);
        if (!isNaN(maxValue) && !isNaN(numericCleanValue) && numericCleanValue > maxValue) {
            cleanValue = String(maxValue);
        }
    }

    // Always sync both the reactive model and the DOM input so they never diverge.
    modelAmount.value = cleanValue;
    if (target.value !== cleanValue) {
        target.value = cleanValue;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    const key = event.key;
    const target = event.target as HTMLInputElement;
    const currentValue = target.value;

    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];

    if (allowedKeys.includes(key) || (event.ctrlKey || event.metaKey)) {
        return;
    }

    if (key === '.' && currentValue.includes('.')) {
        event.preventDefault();
        return;
    }

    if (!/^[0-9.]$/.test(key)) {
        event.preventDefault();
    }
};

const formattedAmount = computed(() => {
    if (!hasAmount.value) return '';

    const numValue = Number(modelAmount.value);
    if (isNaN(numValue)) return '';

    const parts = numValue.toString().split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    const formatted = parts.join('.');

    if (props.showCurrency && modelCurrency.value) {
        return `${modelCurrency.value} ${formatted}`;
    }

    return formatted;
});

/**
 * Push the currency the field is *showing* back to the form.
 *
 * With a single available currency the select is disabled, so without this the
 * applicant sees a greyed-out "NGN" they cannot touch and the form submits no
 * currency at all — which is how the portal's required_if currency rules once
 * rejected applications for a field nobody could fill.
 */
const syncCurrencyToForm = () => {
    if (hasCurrency.value) return;

    const options = availableCurrencies.value;
    if (options.length === 0) return;

    const preferred = props.defaultCurrency || 'NGN';
    const chosen = options.find((option: any) => option.value === preferred) ?? options[0];

    if (chosen?.value) {
        modelCurrency.value = chosen.value;
    }
};

// Async currency lists are usually empty on mount, so re-sync when they land.
watch(availableCurrencies, syncCurrencyToForm, { immediate: true });
</script>

<template>
    <div :class="cn('w-full', props.class)" :title="props.title">
        <div class="flex gap-0">
            <div v-if="props.showCurrency" class="relative flex-shrink-0">
                <select
                    v-model="modelCurrency"
                    data-slot="select"
                    :name="props.currencyName || props.currencyId || props.currencyFieldName"
                    :id="props.currencyId || props.currencyName || props.currencyFieldName || `${props.id}-currency`"
                    :disabled="props.disabled || hasOnlyOneCurrency || props.disableCurrency"
                    class="h-full rounded-l-md rounded-r-none border border-r-0 border-gray-200 bg-white px-3 font-sans text-base font-normal text-gray-900 shadow-sm outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-700"
                >
                    <option v-if="props.currencyPlaceholder && !modelCurrency" value="" disabled hidden>{{ props.currencyPlaceholder }}</option>
                    <option v-for="option in availableCurrencies" :key="option.value" :value="option.value">{{ option.label }}</option>
                </select>
            </div>

            <div class="relative flex-grow">
                <input
                    :id="props.id"
                    v-model="modelAmount"
                    data-slot="input"
                    type="text"
                    inputmode="decimal"
                    :name="props.amountName || props.amountId || props.amountFieldName"
                    :placeholder="props.amountPlaceholder"
                    :disabled="props.disabled"
                    :readonly="props.readonly"
                    :title="props.title"
                    :max="props.max"
                    @input="handleInput"
                    @keydown="handleKeydown"
                    :class="
                        cn(
                            'mb-0 flex h-9 w-full min-w-0 py-5 text-base transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-700',
                            'shadow-sm font-sans font-normal text-base leading-none tracking-normal',
                            'placeholder:font-normal placeholder:text-gray-400 placeholder:italic',
                            hasAmount ? 'text-gray-900 not-italic' : 'text-gray-400 italic',
                            props.showCurrency ? 'rounded-r-md rounded-l-none pl-2 pr-4' : 'rounded-md px-4',
                            'bg-white border border-gray-200',
                            props.inputClass,
                        )
                    "
                />
                <div v-if="formattedAmount || props.suffix" class="mt-1 text-xs text-gray-600 font-medium">
                    <span v-if="formattedAmount">{{ formattedAmount }}</span><span v-if="formattedAmount && props.suffix">{{ props.suffix }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
input[data-slot="input"],
input[data-slot="input"]:hover,
input[data-slot="input"]:focus,
input[data-slot="input"]:active {
  background-color: #ffffff !important;
}
select[data-slot="select"]:not(:disabled),
select[data-slot="select"]:not(:disabled):hover,
select[data-slot="select"]:not(:disabled):focus,
select[data-slot="select"]:not(:disabled):active {
  background-color: #ffffff !important;
}
</style>
