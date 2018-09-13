<template>
    <div class="result">
        <div class="logo"></div>
        <div v-if="result === 'win'" class="msg win">YOU WIN!</div>
        <div v-else-if="result === 'loose'" class="msg loose">YOU LOOSE!</div>
        <div class="scores">
            <div>
                <div>Score:</div>
                <div>{{ right }} / {{ total }}</div>
            </div>
            <div>
                <div>Time:</div>
                <div>{{ time | secondsToTime}}</div>
            </div>
        </div>
        <score-table/>
        <div class="footer">
            <button @click="restart">RESTART</button>
        </div>
    </div>
</template>

<script>
    import {secondsToTime} from '@/scripts/utils';
    import ScoreTable from '@/components/ScoreTable';

    export default {
        name: 'Result',
        components: {ScoreTable},
        filters: {secondsToTime},
        props: {
            result: {type: String, default: 'loose'},
            user: {type: String, default: ''},
            right: {type: Number, default: 0},
            total: {type: Number, default: 0},
            time: {type: Number, default: 0}
        },
        methods: {
            restart() {
                this.$bus.$emit('game-restart');
            }
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    .result {
        position: relative;
        text-align: center;

        .scores {
            display: grid;
            grid-template-columns: 1fr 1fr;

            > div {
                div {
                    &:first-child {
                        margin: 30px 0 10px;
                    }

                    &:last-child {
                        font-size: 32px;
                    }
                }
            }
        }

        .msg {
            padding-top: 40px;
            font-size: 48px;

            &.win {
                color: @red;
            }

            &.loose {
                color: @gray-slate;
            }
        }

        .footer {
            margin: 30px 0 10px;
        }
    }
</style>
