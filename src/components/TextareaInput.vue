<script setup>
import { onMounted, ref, computed } from "vue";

const props = defineProps({
    modelValue: {
        required: false,
    },
    maxlength: {
        type: Number,
        default: 500
    },
    showCount: {
        type: Boolean,
        default: true
    }
});

const charCount = computed(() => {
    return (props.modelValue || '').length;
});

defineEmits(["update:modelValue"]);

const textarea = ref(null);

onMounted(() => {
    if (textarea.value.hasAttribute("autofocus")) {
        textarea.value.focus();
    }
});

defineExpose({ focus: () => textarea.value.focus() });
</script>

<template>
    <div>
        <textarea
            ref="textarea"
            class="py-2 px-3 border-gray-300 focus:border-primary focus:ring-primary rounded-md shadow-sm w-full block resize-none"
            :value="modelValue"
            :maxlength="maxlength"
            @input="$emit('update:modelValue', $event.target.value)"
        />
        <div v-if="showCount" class="mt-1 text-sm text-gray-500 text-right">
            {{ charCount }}/{{ maxlength }} characters
        </div>
    </div>
</template> 