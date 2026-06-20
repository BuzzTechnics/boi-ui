<script setup>
import { onMounted, ref } from "vue";

defineProps({
    modelValue: {
        required: false,
    },
    type: {
        type: String,
        default: 'text',
        validator: (value) => [
            'text', 'number', 'email', 'tel', 'date', 
            'password', 'url', 'search'
        ].includes(value)
    },
    min: {
        type: [Number, String],
        required: false
    },
    max: {
        type: [Number, String],
        required: false
    },
    step: {
        type: [Number, String],
        required: false
    }
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
    <input
        ref="input"
        class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block"
        :type="type"
        :value="modelValue"
        :min="min"
        :max="max"
        :step="step"
        @input="$emit('update:modelValue', $event.target.value)"
    />
</template>
