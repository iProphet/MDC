import { createApp } from "vue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";

import App from "./App.vue";
import router from "./router";

import "primevue/resources/themes/nano/theme.css";
import "primeicons/primeicons.css";
import "./assets/main.css";

const app = createApp(App);

app.use(PrimeVue);
app.use(createPinia());
app.use(router);
app.mount("#app");
