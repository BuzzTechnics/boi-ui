<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useLocation } from '../composables/useLocation'

interface Props {
  modelValue: {
    [key: string]: string | number | null | undefined
  }
  disabled?: boolean
  /** EDOC-like base URL. Pass `/api/boi-api` to use the server proxy, or `https://boi-api...` for direct. */
  apiBaseUrl?: string
  stateId?: string
  lgaId?: string
  townId?: string
  stateField?: string
  lgaField?: string
  townField?: string
  stateError?: string
  lgaError?: string
  townError?: string
  showTownCity?: boolean
  stateLabel?: string
  lgaLabel?: string
  townLabel?: string
  statePlaceholder?: string
  lgaPlaceholder?: string
  townPlaceholder?: string
  gridCols?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  apiBaseUrl: undefined,
  stateId: 'state_id',
  lgaId: 'lga_id',
  townId: 'town_id',
  stateField: 'state_id',
  lgaField: 'lga_id',
  townField: 'town_id',
  showTownCity: true,
  stateLabel: 'State',
  lgaLabel: 'LGA',
  townLabel: 'Town/City',
  statePlaceholder: 'Select state',
  lgaPlaceholder: 'Select LGA',
  townPlaceholder: 'Select city',
  gridCols: 'grid grid-cols-1 gap-4 md:grid-cols-3',
})

const emit = defineEmits<{
  'update:modelValue': [value: { [key: string]: string | number | null | undefined }]
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const {
  stateOptions,
  lgaOptions,
  cityOptions,
  loadStates,
  loadLgas,
  loadCities,
  clearLgas,
  clearCities,
} = useLocation(props.apiBaseUrl)

const gridClass = computed(() => {
  const base = props.gridCols.includes('grid') ? props.gridCols : `grid ${props.gridCols}`
  const mobileFirst = base
    .replace(/(^|\s)grid-cols-2(\s|$)/g, '$1md:grid-cols-2$2')
    .replace(/(^|\s)grid-cols-3(\s|$)/g, '$1md:grid-cols-3$2')
  return mobileFirst.includes('grid-cols-1') ? mobileFirst : `grid-cols-1 ${mobileFirst}`
})

const stateModelValue = computed(() => {
  const raw = props.modelValue?.[props.stateField]
  return typeof raw === 'number' ? String(raw) : raw ?? ''
})

const lgaModelValue = computed(() => {
  const raw = props.modelValue?.[props.lgaField]
  return typeof raw === 'number' ? String(raw) : raw ?? ''
})

const townModelValue = computed(() => {
  const raw = props.modelValue?.[props.townField]
  return typeof raw === 'number' ? String(raw) : raw ?? ''
})

const updateState = (value: string | number | null) => {
  formData.value = {
    ...formData.value,
    [props.stateField]: value,
    [props.lgaField]: null,
    [props.townField]: null,
  }
}

const updateLga = (value: string | number | null) => {
  formData.value = {
    ...formData.value,
    [props.lgaField]: value,
    [props.townField]: null,
  }
}

const updateTown = (value: string | number | null) => {
  formData.value = {
    ...formData.value,
    [props.townField]: value,
  }
}

const onStateChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  updateState(target.value ? target.value : null)
}

const onLgaChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  updateLga(target.value ? target.value : null)
}

const onTownChange = (e: Event) => {
  const target = e.target as HTMLSelectElement
  updateTown(target.value ? target.value : null)
}

// bootstrap: load states and, if pre-selected, load dependent tables
onMounted(async () => {
  await loadStates()

  const currentState = formData.value?.[props.stateField]
  if (currentState) {
    await loadLgas(Number(currentState))

    const currentLga = formData.value?.[props.lgaField]
    if (currentLga && props.showTownCity) {
      await loadCities(Number(currentLga))
    }
  }
})

// state -> lgas and reset lower fields
watch(
  () => formData.value?.[props.stateField],
  async (newState) => {
    if (newState) {
      await loadLgas(Number(newState))
      formData.value = {
        ...formData.value,
        [props.lgaField]: null,
        [props.townField]: null,
      }
    } else {
      clearLgas()
      clearCities()
      formData.value = {
        ...formData.value,
        [props.lgaField]: null,
        [props.townField]: null,
      }
    }
  },
)

// lga -> cities and reset lower field
watch(
  () => formData.value?.[props.lgaField],
  async (newLga) => {
    if (newLga) {
      if (props.showTownCity) {
        await loadCities(Number(newLga))
      }
      formData.value = {
        ...formData.value,
        [props.townField]: null,
      }
    } else {
      if (props.showTownCity) clearCities()
      formData.value = {
        ...formData.value,
        [props.townField]: null,
      }
    }
  },
)
</script>

<template>
  <div :class="gridClass">
    <div class="w-full min-w-0">
      <label :for="stateId" class="block text-xs font-semibold text-gray-700 mb-1.5 md:mb-2">
        {{ stateLabel }}
      </label>
      <select
        :id="stateId"
        :value="stateModelValue"
        :disabled="disabled"
        @change="onStateChange"
        class="py-2.5 px-3 md:py-2 md:px-3 !text-sm md:!text-base border border-gray-300 focus:border-primary focus:ring-primary rounded-lg md:rounded-md shadow-sm w-full block relative z-10 bg-white"
      >
        <option value="">{{ statePlaceholder }}</option>
        <option
          v-for="opt in stateOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <p v-if="stateError" class="mt-2 text-red-600 text-xs">
        {{ stateError }}
      </p>
    </div>

    <div class="w-full min-w-0">
      <label :for="lgaId" class="block text-xs font-semibold text-gray-700 mb-1.5 md:mb-2">
        {{ lgaLabel }}
      </label>
      <select
        :id="lgaId"
        :value="lgaModelValue"
        :disabled="disabled"
        @change="onLgaChange"
        class="py-2.5 px-3 md:py-2 md:px-3 !text-sm md:!text-base border border-gray-300 focus:border-primary focus:ring-primary rounded-lg md:rounded-md shadow-sm w-full block relative z-10 bg-white"
      >
        <option value="">{{ lgaPlaceholder }}</option>
        <option
          v-for="opt in lgaOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <p v-if="lgaError" class="mt-2 text-red-600 text-xs">
        {{ lgaError }}
      </p>
    </div>

    <div v-if="showTownCity" class="w-full min-w-0">
      <label :for="townId" class="block text-xs font-semibold text-gray-700 mb-1.5 md:mb-2">
        {{ townLabel }}
      </label>
      <select
        :id="townId"
        :value="townModelValue"
        :disabled="disabled"
        @change="onTownChange"
        class="py-2.5 px-3 md:py-2 md:px-3 !text-sm md:!text-base border border-gray-300 focus:border-primary focus:ring-primary rounded-lg md:rounded-md shadow-sm w-full block relative z-10 bg-white"
      >
        <option value="">{{ townPlaceholder }}</option>
        <option
          v-for="opt in cityOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>
      <p v-if="townError" class="mt-2 text-red-600 text-xs">
        {{ townError }}
      </p>
    </div>
  </div>
</template>

