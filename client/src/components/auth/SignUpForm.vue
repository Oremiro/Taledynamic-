<template>
  <n-form ref="formRef" :rules="rules" :model="formData">
    <n-form-item first label="Email" path="email.value">
      <n-auto-complete
        v-slot="{ handleInput, handleBlur, handleFocus, value }"
        v-model:value="formData.email.value"
        :options="options"
        :blur-after-select="true"
      >
        <n-input
          placeholder=""
          :value="value"
          :loading="isEmailValidationPending"
          :maxlength="100"
          @input="handleInput"
          @focus="handleFocus"
          @blur="handleBlur"
        >
          <template v-if="!formData.email.isValid && !isEmailUsed" #prefix>
            <question-tooltip>
              Email может содержать только буквы латинского алфавита, цифры, точку, подчеркивание и минус. Почтовый
              домен должен быть корректным.
            </question-tooltip>
          </template>
        </n-input>
      </n-auto-complete>
    </n-form-item>
    <n-form-item first label="Пароль" path="password.value">
      <n-input
        v-model:value="formData.password.value"
        type="password"
        show-password-on="click"
        placeholder=""
        :maxlength="100"
        :loading="isPasswordValidationPending"
        @input="handlePasswordInput"
      >
        <template v-if="!formData.password.isValid" #prefix>
          <question-tooltip>
            Пароль должен содержать минимум 8 символов, заглавную букву, строчную букву, цифру и специальный символ.
          </question-tooltip>
        </template>
      </n-input>
    </n-form-item>
    <n-form-item ref="confirmedPasswordRef" first label="Повторите пароль" path="confirmedPassword.value">
      <n-input
        v-model:value="formData.confirmedPassword.value"
        type="password"
        show-password-on="click"
        placeholder=""
        :maxlength="100"
        :disabled="!formData.password.isValid"
        :loading="isConfirmedPwdValidationPending"
      />
    </n-form-item>

    <n-form-item>
      <delayed-button
        ref="submitButtonRef"
        attr-type="submit"
        type="primary"
        ghost
        :loading="submitLoading"
        :disabled="
          submitLoading ||
          !formData.email.isValid ||
          !formData.password.isValid ||
          !formData.confirmedPassword.isValid ||
          isEmailValidationPending ||
          isPasswordValidationPending ||
          isConfirmedPwdValidationPending
        "
        @click="submitForm"
      >
        Зарегистрироваться
      </delayed-button>
    </n-form-item>
  </n-form>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useMessage, NForm, FormRules, NFormItem } from "naive-ui";
import { useRouter } from "vue-router";
import { useStore } from "@/store";
import { debounce, emailRegex, passwordRegex, externalOptions } from "@/helpers";
import { UserApi } from "@/helpers/api/user";
import { SignUpFormData } from "@/models";
import QuestionTooltip from "@/components/QuestionTooltip.vue";
import DelayedButton from "@/components/DelayedButton.vue";
import axios from "axios";

const formData = reactive<SignUpFormData>({
  email: {
    value: "",
    isValid: false
  },
  password: {
    value: "",
    isValid: false
  },
  confirmedPassword: {
    value: "",
    isValid: false
  }
});
const isEmailUsed = ref<boolean>(false);
const isEmailValidationPending = ref<boolean>(false);
const isPasswordValidationPending = ref<boolean>(false);
const isConfirmedPwdValidationPending = ref<boolean>(false);
const rules: FormRules = {
  email: {
    value: [
      {
        required: true,
        asyncValidator: debounce(
          async (rule, value) => {
            if (!emailRegex.test(value)) {
              formData.email.isValid = false;
              isEmailValidationPending.value = false;
              throw new Error("Введите корректный email");
            }
            try {
              const { data } = await UserApi.isEmailUsed({ email: value });
              isEmailValidationPending.value = false;
              if (data.isEmailUsed) {
                formData.email.isValid = false;
                throw new Error("Данный email занят другим пользователем");
              } else {
                formData.email.isValid = true;
              }
            } catch (error) {
              isEmailValidationPending.value = false;
              if (axios.isAxiosError(error)) {
                throw new Error(error.response?.statusText);
              } else {
                throw error;
              }
            }
          },
          1000,
          {
            isAwaited: true,
            immediateFunc: () => {
              isEmailValidationPending.value = true;
            }
          }
        ),
        trigger: "input"
      }
    ]
  },
  password: {
    value: [
      {
        required: true,
        asyncValidator: debounce(
          (rule, value) => {
            isPasswordValidationPending.value = false;
            if (!passwordRegex.test(value)) {
              formData.password.isValid = false;
              throw new Error("Введите корректный сложный пароль");
            } else {
              formData.password.isValid = true;
            }
          },
          700,
          {
            immediateFunc: () => {
              isPasswordValidationPending.value = true;
            }
          }
        ),
        trigger: "input"
      }
    ]
  },
  confirmedPassword: {
    value: [
      {
        required: true,
        asyncValidator: debounce(
          (rule, value) => {
            isConfirmedPwdValidationPending.value = false;
            if (value !== formData.password.value) {
              formData.confirmedPassword.isValid = false;
              throw new Error("Пароли не совпадают");
            } else {
              formData.confirmedPassword.isValid = true;
            }
          },
          700,
          {
            immediateFunc: () => {
              isConfirmedPwdValidationPending.value = true;
            }
          }
        ),
        trigger: ["input", "password-input"]
      }
    ]
  }
};
const formRef = ref<InstanceType<typeof NForm>>();
const confirmedPasswordRef = ref<InstanceType<typeof NFormItem>>();
const submitButtonRef = ref<InstanceType<typeof DelayedButton>>();
const message = useMessage();
const submitLoading = ref<boolean>(false);
const store = useStore();
const router = useRouter();
const options = computed(() => externalOptions(formData.email.value));

function handlePasswordInput(): void {
  if (formData.confirmedPassword.value != "") {
    confirmedPasswordRef.value?.validate({ trigger: "password-input" }).catch(() => true);
  }
}
function submitForm(): void {
  submitLoading.value = true;
  formRef.value?.validate(async (errors): Promise<void> => {
    if (!errors) {
      try {
        await store.dispatch("user/register", formData);
        message.success("Вы успешно зарегистрировались");
        router.push({ name: "AuthSignIn" });
      } catch (error) {
        if (error instanceof Error) {
          message.error(error.message);
        }
      } finally {
        submitLoading.value = false;
        submitButtonRef.value?.holdDisabled();
      }
    } else {
      message.error("Данные не являются корректными");
      submitLoading.value = false;
      submitButtonRef.value?.holdDisabled();
    }
  });
}
</script>
