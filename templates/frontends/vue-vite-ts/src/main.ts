import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import i18n, { initI18n } from "./i18n";
import vuetify from "./plugins/vuetify";
import "./index.css";

async function bootstrap() {
  await initI18n();
  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(i18n);
  app.use(vuetify);
  app.mount("#app");
}

bootstrap();
