import Vue from 'vue';
import App from '@/components/App';

import '@/styles';

// Init
Object.defineProperty(Vue.prototype, '$bus', {get() { return this.$root.bus; }});

new Vue({
    data: {bus: new Vue({})},
    render: (h) => h(App)
}).$mount('#app');
