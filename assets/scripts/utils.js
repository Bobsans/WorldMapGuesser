export function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function secondsToTime(seconds) {
    let sec = seconds % 60;
    let min = Math.floor(seconds / 60) % 60;
    let hrs = Math.floor(seconds / (60 * 60)) % 60;
    let dys = Math.floor(seconds / (60 * 60 * 60)) % 60;
    let secstr = `${sec.toString().padStart(2, '0')}`;
    let minstr = `${min.toString().padStart(2, '0')}:`;
    let hrsstr = hrs ? `${hrs.toString().padStart(2, '0')}:` : '';
    let dysstr = dys ? `${dys.toString().padStart(2, '0')}:` : '';

    return `${dysstr}${hrsstr}${minstr}${secstr}`;
}
