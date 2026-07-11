<script setup lang="ts">
import { reactive } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { emptyCustomer } from '@/data/seed'
import { t } from '@/lib/i18n'
import type { Customer, CustomerForm } from '@/lib/types'

const props = defineProps<{
  editing: Customer | null
  saving: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [form: CustomerForm]
}>()

const form = reactive<CustomerForm>(
  props.editing
    ? {
        companyName: props.editing.companyName,
        businessType: props.editing.businessType,
        contactName: props.editing.contactName,
        area: props.editing.area,
        branchInfo: props.editing.branchInfo,
        monthlyDemand: props.editing.monthlyDemand,
        currentPressVendor: props.editing.currentPressVendor,
        marketPrice: props.editing.marketPrice,
        insight: props.editing.insight,
        status: props.editing.status,
        lastVisitDate: props.editing.lastVisitDate,
      }
    : { ...emptyCustomer },
)

function onSubmit() {
  if (!form.companyName.trim()) return
  emit('submit', { ...form, monthlyDemand: Number(form.monthlyDemand) || 0 })
}

const inputClass =
  'w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'
const labelClass = 'mb-1.5 block text-xs font-medium text-muted-foreground'
</script>

<template>
  <BaseModal :title="editing ? t('form.customer.edit') : t('form.customer.add')" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <label :class="labelClass" for="companyName">{{ t('form.companyName') }}</label>
          <input id="companyName" v-model="form.companyName" :class="inputClass" required placeholder="PT. ..." />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="businessType">{{ t('form.businessType') }}</label>
          <input id="businessType" v-model="form.businessType" :class="inputClass" placeholder="Rental & Sales Forklift" />
        </div>
        <div>
          <label :class="labelClass" for="contactName">{{ t('form.contactName') }}</label>
          <input id="contactName" v-model="form.contactName" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="area">{{ t('form.area') }}</label>
          <input id="area" v-model="form.area" :class="inputClass" placeholder="Cikarang / Bekasi" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="branchInfo">{{ t('form.branchInfo') }}</label>
          <input id="branchInfo" v-model="form.branchInfo" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="monthlyDemand">{{ t('form.monthlyDemand') }}</label>
          <input id="monthlyDemand" v-model.number="form.monthlyDemand" type="number" min="0" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="status">{{ t('form.status') }}</label>
          <select id="status" v-model="form.status" :class="inputClass">
            <option value="prospect">{{ t('status.prospect') }}</option>
            <option value="active">{{ t('status.active') }}</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="currentPressVendor">{{ t('form.currentPressVendor') }}</label>
          <input id="currentPressVendor" v-model="form.currentPressVendor" :class="inputClass" />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="marketPrice">{{ t('form.marketPrice') }}</label>
          <input id="marketPrice" v-model="form.marketPrice" :class="inputClass" placeholder="Rim 8-9: 150K | ..." />
        </div>
        <div class="sm:col-span-2">
          <label :class="labelClass" for="insight">{{ t('form.insight') }}</label>
          <textarea id="insight" v-model="form.insight" rows="3" :class="inputClass" />
        </div>
        <div>
          <label :class="labelClass" for="lastVisitDate">{{ t('form.lastVisitDate') }}</label>
          <input id="lastVisitDate" v-model="form.lastVisitDate" type="date" :class="inputClass" />
        </div>
      </div>

      <div class="flex justify-end gap-2 border-t border-border pt-4">
        <button
          type="button"
          class="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          @click="emit('close')"
        >
          {{ t('btn.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="saving"
          class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          {{ saving ? t('btn.saving') : editing ? t('btn.update') : t('btn.save') }}
        </button>
      </div>
    </form>
  </BaseModal>
</template>
