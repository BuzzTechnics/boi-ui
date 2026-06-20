<script setup>
import { onMounted, ref } from "vue";

defineProps({
    modelValue: {
        required: false,
    },
    options: {
        type: Array,
        required: true,
        default: () => [],
    },
    placeholder: {
        type: String,
        default: "",
    },
});

defineEmits(["update:modelValue"]);

const input = ref(null);

onMounted(() => {
    if (input.value.hasAttribute("autofocus")) {
        input.value.focus();
    }
});

defineExpose({ focus: () => input.value.focus() });
</script>

<template>
    <select
        ref="input"
        class="border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block"
        :value="modelValue"
        @change="
            $emit(
                'update:modelValue',
                $event.target.value === 'true'
                    ? true
                    : $event.target.value === 'false'
                    ? false
                    : $event.target.value
            )
        "
    >
        <option value="" disabled hidden>{{ placeholder }}</option>
        <option
            v-for="option in options"
            :key="option.value"
            :value="option.value"
        >
            {{ option.label }}
        </option>
    </select>
</template>
