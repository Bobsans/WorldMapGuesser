<template>
    <div class="result">
        <div v-if="result === 'win'" class="msg win">YOU WIN!</div>
        <div v-else-if="result === 'loose'" class="msg loose">YOU LOOSE!</div>
        <div>Score:</div>
        <div class="score">
            <span>{{ right }} / {{ total }}</span>
            <span> | </span>
            <span>{{ time | secondsToTime}}</span>
        </div>
        <table class="score-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Score</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(item, idx) in top" :key="idx">
                    <td>{{ idx + 1 }}</td>
                    <td>{{ item.user }}</td>
                    <td>{{ item.result }}</td>
                    <td>{{ item.time | secondsToTime }}</td>
                </tr>
            </tbody>
        </table>
        <div class="footer">
            <button @click="restart">RESTART</button>
        </div>
    </div>
</template>

<script>
    import {secondsToTime} from '@/scripts/utils';

    export default {
        name: 'Result',
        filters: {secondsToTime},
        props: {
            result: {type: String, default: 'loose'},
            user: {type: String, default: ''},
            right: {type: Number, default: 0},
            total: {type: Number, default: 0},
            time: {type: Number, default: 0}
        },
        data() {
            return {
                top: []
            };
        },
        methods: {
            restart() {
                this.$bus.$emit('game-restart');
            }
        },
        async mounted() {
            await this.$bus.$emit('send-score');
            this.top = await (await fetch(`${location.href.trim('/')}/get-top`)).json();
        }
    };
</script>

<style lang="less">
    @import '~$variables';

    .result {
        text-align: center;

        .score {
            font-size: 48px;
        }

        .msg {
            font-size: 64px;

            &.win {
                color: @red;
            }

            &.loose {
                color: @gray-slate;
            }
        }

        .score-table {
            min-width: 60%;
            margin: 20px auto;
            background: @gray;
        }

        .footer {
            margin: 50px 0 20px;
        }
    }
</style>
