<template>
    <header>
        <div class="logo"></div>
        <div v-if="playing" class="controls">
            <div></div>
            <div class="country-selector">
                <div class="prev" @click="changeCurrent('prev')">&lt;</div>
                <div class="current">{{ current.name }}</div>
                <div class="next" @click="changeCurrent('next')">&gt;</div>
            </div>
            <div class="details">
                <div class="lives">
                    <span v-for="i in 3" :key="i" :class="{active: i <= lives}"></span>
                </div>
                <div class="score">{{ right }}/{{ total }}</div>
                <div class="time">{{ time | secondsToTime }}</div>
            </div>
        </div>
    </header>
</template>

<script>
    import {secondsToTime} from '@/scripts/utils';
    import countries from '@/data/countries';

    export default {
        name: 'Header',
        filters: {secondsToTime},
        props: {
            playing: {type: Boolean, default: false},
            total: {data: Number, default: 0},
            right: {data: Number, default: 0},
            current: {data: Object, default: () => ({})},
            lives: {type: Number, default: 0},
            time: {type: Number, default: 0}
        },
        data() {
            return {};
        },
        computed: {
            totalCountries() {
                return Object.keys(countries).length;
            }
        },
        methods: {
            changeCurrent(dir) {
                this.$bus.$emit('change-current', {dir});
            }
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    header {
        display: grid;
        grid-template-columns: 180px 1fr;
        box-shadow: @default-shadow;
        z-index: 2;

        .logo {
            background: url('@{image-path}/logo.png') no-repeat center;
            background-size: 80%;
        }

        .controls {
            display: grid;
            grid-template-columns: 1fr min-content 350px;

            .country-selector {
                display: grid;
                grid-template-columns: min-content 1fr min-content;
                border-left: 1px solid @gray;

                > div {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .prev, .next {
                    font-size: 36px;
                    padding: 0 20px;
                    cursor: pointer;
                }

                .current {
                    font-size: 24px;
                    width: 300px;
                    text-align: center;
                }
            }

            .details {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;

                > div {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 24px;
                    border-left: 1px solid @gray;
                }

                .lives {
                    font-size: 16px;

                    span {
                        display: inline-block;
                        width: 20px;
                        height: 20px;
                        background: url('@{image-path}/heart-black.svg') no-repeat center;
                        background-size: contain;
                        margin: 0 2px;

                        &.active {
                            background-image: url('@{image-path}/heart.svg');
                        }
                    }
                }
            }
        }
    }
</style>
