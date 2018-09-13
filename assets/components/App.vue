<template>
    <main>
        <header-bar :playing="playing" :lives="lives" :time="time" :right="rights.length" :total="ids.length" :current="current"/>
        <world-map :ids="ids" :rights="rights" :wrongs="wrongs"/>

        <modal v-if="modals.welcome.show" class="small">
            <welcome/>
        </modal>

        <modal v-if="modals.result.show">
            <result :user="nickname" :result="modals.result.result" :right="rights.length" :total="ids.length" :time="time"/>
        </modal>
    </main>
</template>
<script>
    import HeaderBar from '@/components/HeaderBar';
    import WorldMap from '@/components/WorldMap';
    import Modal from '@/components/Modal';
    import Welcome from '@/components/Welcome';
    import Result from '@/components/Result';

    import {shuffle} from '@/scripts/utils';
    import countries from '@/data/countries';

    export default {
        name: 'App',
        components: {Result, Welcome, Modal, WorldMap, HeaderBar},
        data() {
            return {
                nickname: '',
                playing: false,
                ids: [],
                rights: [],
                wrongs: [],
                time: 0,
                lives: 3,
                currentId: 0,
                timeHandler: 0,
                modals: {
                    welcome: {
                        show: false
                    },
                    result: {
                        show: false,
                        result: ''
                    }
                }
            };
        },
        computed: {
            countries() {
                return countries;
            },
            current() {
                return countries[this.currentId];
            },
            available() {
                return this.ids.filter((id) => !this.rights.includes(id) && !this.wrongs.includes(id));
            }
        },
        methods: {
            // METHODS
            reset() {
                this.ids = shuffle(Object.keys(countries));
                this.rights = [];
                this.wrongs = [];
                this.lives = 3;
                this.time = 0;
                this.currentId = this.ids[0];
            },
            changeCurrent(dir) {
                let idx = this.available.indexOf(this.currentId);
                let newidx = dir === 'prev' ? idx - 1 >= 0 ? idx - 1 : this.available.length - 1 : idx + 1 > this.available.length - 1 ? 0 : idx + 1;
                this.currentId = this.available[newidx];
            },

            async sendScore() {
                try {
                    return await (await fetch(`${location.href.trim('/')}/send-score`, {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user: this.nickname,
                            result: this.rights.length,
                            time: this.time,
                            rights: this.rights,
                            wrongs: this.wrongs
                        })
                    })).json();
                } catch (e) {
                    console.log(e);
                }
            },

            // EVENTS
            onGameStart({nickname} = {}) {
                this.reset();
                this.playing = true;
                this.nickname = nickname || this.nickname;
                this.modals.welcome.show = false;
                this.modals.result.show = false;
                this.timeHandler = setInterval(() => { this.time++; }, 1000);
            },
            async onGameStop(result = 'loose') {
                this.playing = false;
                await this.sendScore();
                this.modals.result.show = true;
                this.modals.result.result = result;
                clearTimeout(this.timeHandler);
            },
            onMapClick(item) {
                let idx = this.currentId;
                this.$bus.$emit('change-draw-order', idx);
                this.changeCurrent('next');

                if (idx === item.id) {
                    this.rights.push(idx);
                } else {
                    this.wrongs.push(idx);
                    this.lives--;

                    if (this.lives <= 0) {
                        this.onGameStop();
                    }
                }
            },
            onChangeCurrent({dir}) {
                this.changeCurrent(dir);
            }
        },
        mounted() {
            this.reset();

            this.modals.welcome.show = true;

            document.addEventListener('keydown', (e) => {
                if (this.playing) {
                    if (e.key === 'ArrowLeft') {
                        this.onChangeCurrent({dir: 'prev'});
                    } else if (e.key === 'ArrowRight') {
                        this.onChangeCurrent({dir: 'next'});
                    }
                }
            });

            this.$bus.$on('game-start', this.onGameStart);
            this.$bus.$on('game-restart', this.onGameStart);

            this.$bus.$on('change-current', this.onChangeCurrent);
            this.$bus.$on('map-click', this.onMapClick);
        }
    };
</script>


<style lang="less">
    main {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-rows: 80px 1fr;
    }
</style>
