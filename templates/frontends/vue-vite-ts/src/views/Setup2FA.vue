<template>
  <div class="flex min-h-[60vh] items-center justify-center px-4">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-gray-900">
          {{ t("setup2FA.title") }}
        </h1>
        <p class="mt-2 text-sm text-gray-600">
          {{ t("setup2FA.description") }}
        </p>
      </div>

      <v-btn
        v-if="step === 'initial'"
        color="primary"
        block
        size="large"
        :loading="generating"
        @click="handleGenerate"
      >
        {{ t("setup2FA.generate") }}
      </v-btn>

      <div v-if="step === 'scan'" class="space-y-6">
        <div class="flex flex-col items-center gap-4 rounded-lg border border-gray-200 bg-white p-6">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR Code" class="h-[200px] w-[200px]" />
          <div class="w-full space-y-2">
            <p class="text-xs font-medium uppercase tracking-wide text-gray-500">
              {{ t("setup2FA.backupSecret") }}
            </p>
            <code class="block w-full break-all rounded bg-gray-100 px-3 py-2 text-sm font-mono text-gray-800">
              {{ secret }}
            </code>
          </div>
        </div>

        <form @submit.prevent="handleVerify" class="space-y-4">
          <v-text-field
            v-model="code"
            :label="t('setup2FA.enterCode')"
            variant="outlined"
            density="comfortable"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            hide-details
            @input="code = code.replace(/\D/g, '')"
          />
          <v-btn
            type="submit"
            color="primary"
            block
            size="large"
            :disabled="verifying || code.length !== 6"
            :loading="verifying"
          >
            {{ t("setup2FA.verify") }}
          </v-btn>
        </form>
      </div>

      <div v-if="step === 'done' && recoveryCodes.length > 0" class="space-y-4">
        <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p class="text-sm font-medium text-amber-800">
            {{ t("setup2FA.saveRecoveryCodes") }}
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <code
            v-for="rc in recoveryCodes"
            :key="rc"
            class="rounded bg-white px-3 py-1.5 text-center text-sm font-mono text-gray-800"
          >
            {{ rc }}
          </code>
        </div>

        <v-btn variant="outlined" block @click="copyRecoveryCodes">
          {{ t("setup2FA.copyAll") }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import QRCode from "qrcode";
import { api, getErrorMessage } from "@/lib/api";
import type { Verify2FASetupResponse } from "@/types/auth";

interface SetupResponse {
  qr_code_url: string;
  secret: string;
}

const { t } = useI18n();
const step = ref<"initial" | "scan" | "done">("initial");
const qrUrl = ref("");
const qrDataUrl = ref("");
const secret = ref("");
const code = ref("");
const recoveryCodes = ref<string[]>([]);
const generating = ref(false);
const verifying = ref(false);

async function handleGenerate() {
  generating.value = true;
  try {
    const { data } = await api.post<SetupResponse>("/auth/2fa/setup");
    qrUrl.value = data.qr_code_url;
    secret.value = data.secret;
    qrDataUrl.value = await QRCode.toDataURL(data.qr_code_url);
    step.value = "scan";
  } catch (err) {
    // show error - could use snackbar
  } finally {
    generating.value = false;
  }
}

async function handleVerify() {
  if (code.value.length !== 6) return;
  verifying.value = true;
  try {
    const { data } = await api.post<Verify2FASetupResponse>("/auth/2fa/verify-setup", { code: code.value });
    recoveryCodes.value = data.recovery_codes ?? [];
    step.value = "done";
  } catch {
    // show error
  } finally {
    verifying.value = false;
  }
}

async function copyRecoveryCodes() {
  try {
    await navigator.clipboard.writeText(recoveryCodes.value.join("\n"));
  } catch {
    // show error
  }
}
</script>
